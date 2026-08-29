"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api, RestReport } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import {
    Plus,
    Save,
    Search,
    Trash2,
    Printer,
    FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PatientHeader } from "@/components/clinical/patient-header";

export default function RestReportPage() {
    const params = useParams();
    const patientId = String(params.id);
    const [patient, setPatient] = useState<any>(null);
    const [reports, setReports] = useState<RestReport[]>([]);
    const [latestExam, setLatestExam] = useState<any>(null);

    // Form State
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [icdCode, setIcdCode] = useState("");
    const [diagnosis, setDiagnosis] = useState("");
    const [decision, setDecision] = useState<"calisir" | "kontrol">("calisir");
    const [controlDate, setControlDate] = useState<string>("");

    const loadData = async () => {
        try {
            const [pData, rData, mData] = await Promise.all([
                api.patients.get(patientId),
                api.clinical.getRestReports(patientId),
                api.clinical.getMuayeneler(patientId)
            ]);
            setPatient(pData);
            setReports(rData);

            if (mData && mData.length > 0) {
                const sorted = [...mData].sort((a, b) => {
                    const dateA = a.tarih ? new Date(a.tarih).getTime() : 0;
                    const dateB = b.tarih ? new Date(b.tarih).getTime() : 0;
                    return dateB - dateA;
                });
                setLatestExam(sorted[0]);
            }

            if (rData.length > 0 && !selectedReportId) {
                handleSelectReport(rData[0]);
            }
        } catch (error) {
            console.error(error);
            toast.error("Veriler yüklenirken hata oluştu.");
        }
    };

    useEffect(() => {
        if (patientId) loadData();
    }, [patientId]);

    const handleNewReport = () => {
        setSelectedReportId(null);
        setReportDate(new Date().toISOString().split('T')[0]);
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
        setIcdCode("");
        setDiagnosis("");
        setDecision("calisir");
        setControlDate("");
        toast.info("Yeni rapor formu.");
    };

    const handleSelectReport = (report: RestReport) => {
        setSelectedReportId(report.id);
        setReportDate(report.tarih || new Date().toISOString().split('T')[0]);
        setStartDate(report.baslangic_tarihi || new Date().toISOString().split('T')[0]);
        setEndDate(report.bitis_tarihi || new Date().toISOString().split('T')[0]);
        setIcdCode(report.icd_kodu || "");
        setDiagnosis(report.tani || "");
        setDecision((report.karar as any) || "calisir");
        setControlDate(report.kontrol_tarihi || "");
    };

    const handleSave = async () => {
        try {
            const payload = {
                hasta_id: patientId,
                tarih: reportDate,
                baslangic_tarihi: startDate,
                bitis_tarihi: endDate,
                icd_kodu: icdCode,
                tani: diagnosis,
                karar: decision,
                kontrol_tarihi: decision === 'kontrol' ? controlDate : undefined
            };

            if (selectedReportId) {
                await api.clinical.updateRestReport(selectedReportId, payload);
                toast.success("Rapor güncellendi.");
            } else {
                const newReport = await api.clinical.createRestReport(payload);
                toast.success("Rapor oluşturuldu.");
                setSelectedReportId(newReport.id);
            }
            loadData();
        } catch (error) {
            console.error(error);
            toast.error("Kaydetme başarısız.");
        }
    };

    const handleDelete = async () => {
        if (!selectedReportId) return;
        try {
            await api.clinical.deleteRestReport(selectedReportId);
            toast.success("Rapor silindi.");
            handleNewReport();
            loadData();
        } catch (error) {
            console.error(error);
            toast.error("Silme başarısız.");
        }
    };

    const handlePrint = () => {
        if (selectedReportId) {
            window.open(`/print/rest-report/${selectedReportId}`, '_blank');
        } else {
            toast.error("Yazdırmak için önce raporu kaydedin.");
        }
    };

    const handleFetchDiagnosis = () => {
        if (latestExam) {
            const diag1 = [latestExam.tani1_kodu, latestExam.tani1].filter(Boolean).join(" ");
            const diag2 = [latestExam.tani2_kodu, latestExam.tani2].filter(Boolean).join(" ");
            const combined = [diag1, diag2].filter(Boolean).join("\n");

            setIcdCode("");
            setDiagnosis(combined);
            toast.info("Tanı bilgileri son muayeneden getirildi.");
        } else {
            toast.warning("Hasta için kayıtlı muayene bulunamadı.");
        }
    };

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        onSave: handleSave,
        onSearch: () => {
            const searchInput = document.querySelector('input[placeholder="Raporlarda ara..."]') as HTMLInputElement;
            if (searchInput) {
                searchInput.focus();
                toast.info("Arama kutusuna odaklandı.");
            }
        }
    });

    return (
        <div className="flex h-full flex-col gap-6 p-6 lg:flex-row bg-slate-50/50 min-h-screen">
            {/* Main Content */}
            <div className="flex-1 space-y-6">
                <PatientHeader patient={patient} moduleName="İstirahat Raporu" />

                {/* Action Bar */}
                <div className="rounded-xl border border-white bg-white shadow-sm p-2 flex items-center justify-end gap-2">
                    <div className="flex items-center gap-2">
                        <Button
                            className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                            onClick={handleNewReport}
                        >
                            <Plus className="h-3 w-3" />
                            YENİ RAPOR
                        </Button>
                        <div className="h-6 w-px bg-slate-200 mx-2"></div>
                        <Button
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                            onClick={handleSave}
                        >
                            <Save className="h-3 w-3" />
                            KAYDET
                        </Button>
                        {selectedReportId && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button className="h-8 bg-red-600 hover:bg-red-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm">
                                        <Trash2 className="h-3 w-3" />
                                        SİL
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Raporu silmek istediğinize emin misiniz?</AlertDialogTitle>
                                        <AlertDialogDescription>Bu işlem geri alınamaz.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Sil</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                        onClick={handlePrint}
                        disabled={!selectedReportId}
                        title="Yazdır"
                    >
                        <Printer className="h-4 w-4" />
                    </Button>
                </div>

                {/* Form */}
                <div className="rounded-xl border border-white bg-white shadow-sm p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rapor Tarihi</Label>
                            <DatePicker date={reportDate} setDate={setReportDate} className="font-bold" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rapor Başlangıç</Label>
                            <DatePicker date={startDate} setDate={setStartDate} className="font-bold text-blue-700" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rapor Bitiş (Dahil)</Label>
                            <DatePicker date={endDate} setDate={setEndDate} className="font-bold text-blue-700" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ICD Kodu ve Tanı(lar)</Label>
                            {latestExam && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-[10px] font-bold border-blue-200 text-blue-600 hover:bg-blue-50 bg-blue-50/30 gap-1"
                                    onClick={handleFetchDiagnosis}
                                >
                                    <FileText className="h-3 w-3" />
                                    SON MUAYENEDEN GETİR
                                </Button>
                            )}
                        </div>
                        <Input
                            placeholder="ICD Kodu (Opsiyonel)"
                            value={icdCode}
                            onChange={e => setIcdCode(e.target.value)}
                            className="mb-2 font-mono text-sm"
                        />
                        <Textarea
                            placeholder="Tanı açıklaması..."
                            value={diagnosis}
                            onChange={e => setDiagnosis(e.target.value)}
                            className="min-h-[100px] font-medium"
                        />
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-4">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Karar</Label>
                        <div className="flex flex-col gap-4">
                            <div
                                onClick={() => setDecision("calisir")}
                                className={cn(
                                    "flex items-center space-x-2 border p-4 rounded-lg cursor-pointer transition-colors",
                                    decision === 'calisir' ? "bg-blue-50 border-blue-200" : "bg-white hover:bg-slate-50 border-slate-200"
                                )}
                            >
                                <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", decision === 'calisir' ? "border-blue-600" : "border-slate-400")}>
                                    {decision === 'calisir' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                </div>
                                <Label className="font-semibold cursor-pointer pointer-events-none">Çalışır (Bitiş tarihinden sonraki gün işbaşı yapar)</Label>
                            </div>

                            <div
                                onClick={() => setDecision("kontrol")}
                                className={cn(
                                    "flex items-center space-x-2 border p-4 rounded-lg cursor-pointer transition-colors",
                                    decision === 'kontrol' ? "bg-blue-50 border-blue-200" : "bg-white hover:bg-slate-50 border-slate-200"
                                )}
                            >
                                <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", decision === 'kontrol' ? "border-blue-600" : "border-slate-400")}>
                                    {decision === 'kontrol' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                </div>
                                <Label className="font-semibold cursor-pointer pointer-events-none">Kontrol Önerilir</Label>
                            </div>
                        </div>

                        {decision === 'kontrol' && (
                            <div className="ml-6 mt-2 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                                <Label className="text-xs font-bold text-slate-500">Kontrol Tarihi:</Label>
                                <DatePicker date={controlDate} setDate={setControlDate} className="w-auto h-8 bg-white" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sidebar List */}
            <div className="w-full lg:w-[240px] space-y-4 shrink-0">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input placeholder="Raporlarda ara..." className="pl-9 bg-slate-50 border-slate-200" />
                    </div>
                </div>
                <div className="rounded-xl border border-white bg-white shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)] sticky top-6">
                    <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">GEÇMİŞ RAPORLAR</h3>
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{reports.length}</span>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="flex flex-col">
                            {reports.map((report) => (
                                <button
                                    key={report.id}
                                    onClick={() => handleSelectReport(report)}
                                    className={cn(
                                        "flex flex-col gap-1 p-3 text-left transition-colors border-b border-slate-50 hover:bg-slate-50",
                                        selectedReportId === report.id ? "bg-blue-50/50 border-l-4 border-l-blue-500" : "border-l-4 border-l-transparent"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-slate-700">
                                            {report.tarih ? format(parseISO(report.tarih), 'dd.MM.yyyy') : '-'}
                                        </span>
                                        {report.karar === 'calisir' ? (
                                            <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 text-[10px]">Çalışır</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 text-[10px]">Kontrol</Badge>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 line-clamp-2">
                                        {report.tani || "Tanı girilmemiş"}
                                    </div>
                                </button>
                            ))}
                            {reports.length === 0 && (
                                <div className="p-8 text-center text-slate-400 text-xs text-opacity-70">
                                    Henüz rapor kaydı yok.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}
