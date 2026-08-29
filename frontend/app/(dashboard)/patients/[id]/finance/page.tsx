"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, FinansIslem } from "@/lib/api";
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
import { Plus, Trash2, Wallet, ArrowUpRight, ArrowDownLeft, Loader2, Printer, Minus } from "lucide-react";
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
