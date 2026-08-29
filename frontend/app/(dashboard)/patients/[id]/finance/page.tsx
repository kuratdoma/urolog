"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, FinansIslem, FinansKasa, AcikIslem } from "@/lib/api";
import { PatientHeader } from "@/components/clinical/patient-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, Wallet, ArrowUpRight, ArrowDownLeft, Loader2, Printer, Minus, Layers, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/stores/auth-store";
import { IncomeForm } from "@/components/finance/forms/IncomeForm";
import { ExpenseForm } from "@/components/finance/forms/ExpenseForm";

export default function FinancePage() {
    const params = useParams();
    const patientId = String(params.id);

    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // --- Toplu tahsilat ---
    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkTutar, setBulkTutar] = useState("");
    const [bulkKasa, setBulkKasa] = useState("");
    const [bulkYontem, setBulkYontem] = useState("Nakit");
    const [bulkSaving, setBulkSaving] = useState(false);
    const [acikIslemler, setAcikIslemler] = useState<AcikIslem[]>([]);
    const [bulkKasalar, setBulkKasalar] = useState<FinansKasa[]>([]);

    const acikToplam = acikIslemler.reduce((t, i) => t + i.kalan_tutar, 0);

    const openBulkDialog = async () => {
        try {
            const [acik, kasalar] = await Promise.all([
                api.finance.getOpenTransactions(patientId),
                api.finance.getAccounts(),
            ]);
            setAcikIslemler(acik);
            setBulkKasalar(kasalar);
            setBulkTutar(acik.length ? String(acik.reduce((t, i) => t + i.kalan_tutar, 0).toFixed(2)) : "");
            setBulkKasa(kasalar[0]?.id ? String(kasalar[0].id) : "");
            setBulkYontem("Nakit");
            setBulkOpen(true);
        } catch {
            toast.error("Açık borçlar yüklenemedi");
        }
    };

    const handleBulkCollect = async () => {
        const tutar = parseFloat(bulkTutar);
        if (!Number.isFinite(tutar) || tutar <= 0) {
            toast.error("Geçerli bir tutar girin");
            return;
        }
        setBulkSaving(true);
        try {
            const sonuc = await api.finance.collectBulk(patientId, {
                tutar,
                kasa_id: bulkKasa ? Number(bulkKasa) : undefined,
                odeme_yontemi: bulkYontem,
                odeme_tarihi: format(new Date(), "yyyy-MM-dd"),
            });
            toast.success(`${sonuc.islem_sayisi} işleme toplam ${sonuc.tahsil_edilen.toLocaleString("tr-TR")} ₺ dağıtıldı`);
            setBulkOpen(false);
            queryClient.invalidateQueries({ queryKey: ['finance_transactions', patientId] });
        } catch (error: any) {
            toast.error(error?.message || "Toplu tahsilat başarısız");
        } finally {
            setBulkSaving(false);
        }
    };

    // Modal states
    const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
    const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);

    // --- Queries ---
    const { data: patient } = useQuery({
        queryKey: ['patient', patientId],
        queryFn: () => api.patients.get(patientId),
    });

    const { data: hareketler = [], isLoading } = useQuery({
        queryKey: ['finance_transactions', patientId],
        queryFn: () => api.finance.getPatientTransactions(patientId),
    });

    // --- Mutations ---
    const deleteMutation = useMutation({
        mutationFn: api.finance.deleteTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance_transactions', patientId] });
            toast.success("Kayıt silindi.");
            setDeleteId(null);
        },
        onError: () => toast.error("Silme işlemi başarısız.")
    });

    // --- Calculations ---
    const summary = useMemo(() => {
        let totalBorc = 0;
        let totalAlacak = 0;
        if (hareketler) {
            hareketler.forEach((h: FinansIslem) => {
                // If islem_tipi is 'gelir', net_tutar adds to Borc (Debt/Service sold)
                // If islem_tipi is 'gider', maybe we subtract from Borc? Or net_tutar is isolated.
                // Usually, Hizmet = gelir type with net_tutar > 0.
                if (h.islem_tipi === 'gelir') {
                    totalBorc += Number(h.net_tutar || 0);
                    const paid = h.odemeler?.reduce((acc, curr) => acc + (curr.tutar || 0), 0) || 0;
                    totalAlacak += paid;
                } else if (h.islem_tipi === 'gider') {
                    // For expenses on a patient (e.g. refund), it's a negative debt.
                    totalBorc -= Number(h.net_tutar || 0);
                    const paid = h.odemeler?.reduce((acc, curr) => acc + (curr.tutar || 0), 0) || 0;
                    totalAlacak -= paid;
                }
            });
        }
        return {
            totalBorc,
            totalAlacak,
            bakiye: totalBorc - totalAlacak
        };
    }, [hareketler]);

    // Compute running balance for table
    const sortedHareketler = useMemo(() => {
        if (!hareketler) return [];
        const sorted = [...hareketler].sort((a: FinansIslem, b: FinansIslem) => {
            const dateA = new Date(a.tarih || '').getTime();
            const dateB = new Date(b.tarih || '').getTime();
            if (dateA === dateB) return (a.id || 0) - (b.id || 0);
            return dateA - dateB;
        });

        let runningBalance = 0;
        const withBalance = sorted.map((h: FinansIslem) => {
            let debt = 0;
            let paid = 0;

            if (h.islem_tipi === 'gelir') {
                debt = Number(h.net_tutar || 0);
                paid = h.odemeler?.reduce((acc, curr) => acc + (curr.tutar || 0), 0) || 0;
            } else if (h.islem_tipi === 'gider') {
                debt = -Number(h.net_tutar || 0);
                paid = -(h.odemeler?.reduce((acc, curr) => acc + (curr.tutar || 0), 0) || 0);
            }

            runningBalance += debt;
            runningBalance -= paid;
            return { ...h, bakiye: runningBalance, paid_amount: paid, debt_amount: debt };
        });

        return withBalance.reverse();
    }, [hareketler]);


    const handlePrint = (item: any) => {
        const printData = {
            patient: patient,
            transaction: {
                ...item,
                hizmet_ad: item.satirlar?.[0]?.hizmet_adi || 'Hizmet / İşlem'
            },
            doctor: item.doktor
        };
        localStorage.setItem("print_receipt_draft", JSON.stringify(printData));
        window.open("/print/receipt", "_blank", "width=800,height=900");
    };

    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['finance_transactions', patientId] });
        setIncomeDialogOpen(false);
        setExpenseDialogOpen(false);
    };

    const [deleteId, setDeleteId] = useState<number | null>(null);
    const patientName = patient ? `${patient.ad} ${patient.soyad}` : '';

    return (
        <div className="flex h-full flex-col bg-slate-50/50 min-h-screen" >
            <div className="flex-1 flex flex-col min-w-0 p-6 gap-6">

                <PatientHeader patient={patient ?? null} moduleName="Finansal Kayıtlar" moduleSubtitle="Cari hesap ve ödeme takibi" />

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-white border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><ArrowUpRight className="h-10 w-10 text-slate-600" /></div>
                        <CardHeader className="pb-1">
                            <CardTitle className="text-[10px] font-bold text-slate-500 uppercase">Toplam Hizmet (Borç)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold text-slate-700">
                                {summary.totalBorc.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-emerald-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><ArrowDownLeft className="h-10 w-10 text-emerald-600" /></div>
                        <CardHeader className="pb-1">
                            <CardTitle className="text-[10px] font-bold text-slate-500 uppercase">Toplam Tahsilat</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold text-emerald-600">
                                {summary.totalAlacak.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                            </div>
                        </CardContent>
                    </Card>
                    <Card className={cn("shadow-sm relative overflow-hidden", summary.bakiye > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200")}>
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="h-10 w-10 text-slate-900" /></div>
                        <CardHeader className="pb-1">
                            <CardTitle className="text-[10px] font-bold text-slate-500 uppercase">Genel Bakiye</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={cn("text-xl font-bold", summary.bakiye > 0 ? "text-red-700" : "text-emerald-700")}>
                                {Math.abs(summary.bakiye).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                            </div>
                            <p className="text-[9px] font-medium opacity-70 mt-0.5">{summary.bakiye > 0 ? "Bekleyen toplam borç" : "Fazla ödeme / Avans"}</p>
                        </CardContent>
                    </Card>

                    {/* Hızlı Özet Bilgi */}
                    <div className="flex flex-col justify-center bg-slate-900 p-4 rounded-xl text-white shadow-lg border border-slate-800">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Durum Bilgisi</span>
                        <div className="flex items-baseline gap-2">
                            <div className="text-lg font-black">{summary.bakiye > 0 ? "KALAN BORÇ" : "ÖDEME TAMAM"}</div>
                            <div className="text-xs text-slate-400 font-mono">#{summary.totalBorc > 0 ? ((summary.totalAlacak / summary.totalBorc) * 100).toFixed(0) : 0}%</div>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div
                                className="bg-emerald-500 h-full transition-all duration-1000"
                                style={{ width: `${Math.min(100, (summary.totalAlacak / (summary.totalBorc || 1)) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Actions & List */}
                <div className="flex justify-end gap-3">
                    <Button
                        onClick={() => window.open(`/print/statement?patient=${patientId}`, "_blank")}
                        variant="outline"
                    >
                        <FileText className="h-4 w-4 mr-2" /> Ekstre
                    </Button>
                    <Button
                        onClick={openBulkDialog}
                        variant="outline"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                        <Layers className="h-4 w-4 mr-2" /> Toplu Tahsilat
                    </Button>
                    <Button
                        onClick={() => setExpenseDialogOpen(true)}
                        variant="outline"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                        <Minus className="h-4 w-4 mr-2" /> Gider / İade Ekle
                    </Button>
                    <Button
                        onClick={() => setIncomeDialogOpen(true)}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                        <Plus className="h-4 w-4 mr-2" /> Yeni Gelir / Tahsilat
                    </Button>
                </div>

                {/* Toplu Tahsilat */}
                <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Toplu Tahsilat</DialogTitle>
                        </DialogHeader>

                        {acikIslemler.length === 0 ? (
                            <p className="py-6 text-center text-sm text-slate-500">
                                Bu hastanın açık borcu yok.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-slate-50 p-3">
                                    <p className="text-xs text-slate-500">Toplam açık borç</p>
                                    <p className="text-2xl font-bold text-slate-900">
                                        {acikToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        {acikIslemler.length} açık işlem — tahsilat en eski vadeden başlayarak dağıtılır
                                    </p>
                                </div>

                                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
                                    {acikIslemler.map((i) => (
                                        <div key={i.id} className="flex justify-between text-xs">
                                            <span className="font-mono text-slate-500">{i.referans_kodu}</span>
                                            <span className="font-medium">
                                                {i.kalan_tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-slate-600">Tahsil edilen (₺)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={bulkTutar}
                                            onChange={(e) => setBulkTutar(e.target.value)}
                                            className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600">Ödeme yöntemi</label>
                                        <select
                                            value={bulkYontem}
                                            onChange={(e) => setBulkYontem(e.target.value)}
                                            className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                                        >
                                            {["Nakit", "Kredi Kartı", "Havale/EFT", "Çek"].map((y) => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-600">Kasa</label>
                                    <select
                                        value={bulkKasa}
                                        onChange={(e) => setBulkKasa(e.target.value)}
                                        className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                                    >
                                        {bulkKasalar.map((k) => (
                                            <option key={k.id} value={String(k.id)}>{k.ad}</option>
                                        ))}
                                    </select>
                                    {bulkKasalar.length === 0 && (
                                        <p className="mt-1 text-xs text-amber-600">
                                            Tanımlı kasa yok — tahsilat kasaya işlenmeyecek.
                                        </p>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkSaving}>
                                        Vazgeç
                                    </Button>
                                    <Button
                                        onClick={handleBulkCollect}
                                        disabled={bulkSaving}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {bulkSaving ? "Dağıtılıyor..." : "Tahsilatı Dağıt"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <Dialog open={incomeDialogOpen} onOpenChange={setIncomeDialogOpen}>
                    <DialogContent className="max-w-[95vw] w-full lg:max-w-[85vw] xl:max-w-[75vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                        <DialogHeader className="mb-2">
                            <DialogTitle>Yeni Gelir / Tahsilat İşlemi</DialogTitle>
                        </DialogHeader>
                        <IncomeForm
                            patientId={patientId}
                            patientName={patientName}
                            requireClinicalLink={false}
                            onSuccess={handleSuccess}
                            onCancel={() => setIncomeDialogOpen(false)}
                        />
                    </DialogContent>
                </Dialog>

                <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                    <DialogContent className="max-w-[95vw] w-full lg:max-w-[85vw] xl:max-w-[75vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                        <DialogHeader className="mb-2">
                            <DialogTitle>Yeni Gider / İade İşlemi</DialogTitle>
                        </DialogHeader>
                        <ExpenseForm
                            patientId={patientId}
                            patientName={patientName}
                            requireClinicalLink={false}
                            onSuccess={handleSuccess}
                            onCancel={() => setExpenseDialogOpen(false)}
                        />
                    </DialogContent>
                </Dialog>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tarih</TableHead>
                                    <TableHead>İşlem Tipi</TableHead>
                                    <TableHead>İşlem / Açıklama</TableHead>
                                    <TableHead className="text-right text-slate-600">Hizmet Tutarı</TableHead>
                                    <TableHead className="text-right text-emerald-600">Tahsilat/Ödenen</TableHead>
                                    <TableHead className="text-right font-bold text-slate-900">Genel Bakiye</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                                        </TableCell>
                                    </TableRow>
                                ) : sortedHareketler.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                            Kayıt bulunamadı.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedHareketler.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-slate-50">
                                            <TableCell className="font-mono text-xs">
                                                {item.tarih ? format(parseISO(item.tarih), 'dd.MM.yyyy') : '-'}
                                                <div className="text-[10px] text-slate-400">{item.referans_kodu}</div>
                                            </TableCell>
                                            <TableCell>
                                                {item.islem_tipi === 'gelir' ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">Gelir</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium bg-rose-100 text-rose-800">Gider / İade</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-slate-900">{item.aciklama || item.kategori_adi || 'Diğer İşlem'}</div>
                                                {item.satirlar && item.satirlar.length > 0 && (
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        {item.satirlar.map(s => s.hizmet_adi).join(', ')}
                                                    </div>
                                                )}
                                                <div className="text-xs text-slate-500">{item.doktor ? `Dr. ${item.doktor}` : ''}</div>
                                            </TableCell>

                                            <TableCell className="text-right font-medium text-slate-700">
                                                {item.debt_amount !== 0 ? item.debt_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-emerald-600">
                                                {item.paid_amount !== 0 ? item.paid_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-'}
                                            </TableCell>
                                            <TableCell className={cn("text-right font-bold", item.bakiye && item.bakiye > 0 ? "text-red-600" : "text-emerald-600")}>
                                                {item.bakiye ? item.bakiye.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'} ₺
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrint(item)}>
                                                        <Printer className="h-4 w-4 text-slate-400" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => setDeleteId(item.id!)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-rose-400" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Kaydı Sil</AlertDialogTitle>
                            <AlertDialogDescription>
                                Bu finansal işlem kaydını silmek üzeresiniz. Bakiye yeniden hesaplanacaktır.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                            >
                                Sil
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </div>
        </div >
    );
}
