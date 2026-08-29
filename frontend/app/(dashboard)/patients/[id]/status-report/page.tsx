"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api, StatusReport } from "@/lib/api";
import { format, parseISO } from "date-fns";
import {
    Plus,
    Save,
    Search,
    Trash2,
    Printer,
    RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

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
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PatientHeader } from "@/components/clinical/patient-header";

export default function StatusReportPage() {
    const params = useParams();
    const patientId = String(params.id);
    const [patient, setPatient] = useState<any>(null);
    const [reports, setReports] = useState<StatusReport[]>([]);
    const [latestExam, setLatestExam] = useState<any>(null);

    // Form State
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [icdCode, setIcdCode] = useState("");
    const [diagnosis, setDiagnosis] = useState(""); // tani_bulgular
    const [conclusion, setConclusion] = useState(""); // sonuc_kanaat

    const loadData = async () => {
        try {
            const [pData, rData, mData] = await Promise.all([
                api.patients.get(patientId),
                api.clinical.getStatusReports(patientId),
                api.clinical.getMuayeneler(patientId)
            ]);
            setPatient(pData);
            setReports(rData);

            if (rData.length > 0 && !selectedReportId) {
                handleSelectReport(rData[0]);
            }

            if (mData && mData.length > 0) {
                const sorted = [...mData].sort((a, b) => {
                    const dateA = a.tarih ? new Date(a.tarih).getTime() : 0;
                    const dateB = b.tarih ? new Date(b.tarih).getTime() : 0;
                    return dateB - dateA;
                });
                setLatestExam(sorted[0]);
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
        setIcdCode("");
        setDiagnosis("");
        setConclusion("");
        toast.info("Yeni durum bildirir raporu formu.");
    };

    const handleFetchIcdFromExam = () => {
        if (!latestExam) {
            toast.warning("Hasta için kayıtlı muayene bulunamadı.");
            return;
        }
        
        const icd = latestExam.tani1_kodu || latestExam.tani2_kodu || "";
        if (icd) {
            setIcdCode(icd);
            toast.success("ICD Kodu son muayeneden getirildi.");
        } else {
            toast.warning("Son muayenede kayıtlı ICD kodu bulunamadı.");
        }
    };

    const handleSelectReport = (report: StatusReport) => {
        setSelectedReportId(report.id);
        setReportDate(report.tarih || new Date().toISOString().split('T')[0]);
        setIcdCode(report.icd_kodu || "");
        setDiagnosis(report.tani_bulgular || "");
        setConclusion(report.sonuc_kanaat || "");
    };

    const handleSave = async () => {
        try {
            const payload = {
                hasta_id: patientId,
                tarih: reportDate,
                icd_kodu: icdCode,
                tani_bulgular: diagnosis,
                sonuc_kanaat: conclusion
            };

            if (selectedReportId) {
                await api.clinical.updateStatusReport(selectedReportId, payload);
                toast.success("Rapor güncellendi.");
            } else {
                const newReport = await api.clinical.createStatusReport(payload);
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
            await api.clinical.deleteStatusReport(selectedReportId);
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
            window.open(`/print/status-report/${selectedReportId}`, '_blank');
        } else {
            toast.error("Yazdırmak için önce raporu kaydedin.");
        }
    };

    return (
        <div className="flex h-full flex-col gap-6 p-6 lg:flex-row bg-slate-50/50 min-h-screen">
            {/* Main Content */}
            <div className="flex-1 space-y-6">
                <PatientHeader patient={patient} moduleName="Durum Bildirir Raporu" />

                {/* Action Bar */}
                <div className="rounded-xl border border-white bg-white shadow-sm p-2 flex items-center justify-between">
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
                            className="h-8 bg-green-600 hover:bg-green-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
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
                        variant="outline"
                        className="h-8 gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-bold uppercase text-xs"
                        onClick={handlePrint}
                        disabled={!selectedReportId}
                    >
                        <Printer className="h-3 w-3" />
                        YAZDIR
                    </Button>
                </div>

                {/* Form */}
                <div className="rounded-xl border border-white bg-white shadow-sm p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">RAPOR TARİHİ</Label>
                            <DatePicker date={reportDate} setDate={setReportDate} className="font-bold w-1/2" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ICD Kodu</Label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-[9px] font-bold border-blue-200 text-blue-600 hover:bg-blue-50 bg-blue-50/30 gap-1"
                                    onClick={handleFetchIcdFromExam}
                                >
                                    <RefreshCw className="h-2.5 w-2.5" />
                                    MUAYENEDEN GETİR
                                </Button>
                            </div>
                            <Input
                                value={icdCode}
                                onChange={e => setIcdCode(e.target.value)}
                                placeholder="Opsiyonel"
                                className="font-mono w-1/2"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">TANI VE BULGULAR</Label>
                        <Textarea
                            placeholder="Muayene bulguları ve tanısal değerlendirme..."
                            value={diagnosis}
                            onChange={e => setDiagnosis(e.target.value)}
                            className="min-h-[150px] font-medium"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">SONUÇ VE KANAAT</Label>
                        <Textarea
                            placeholder="Sonuç ve kanaat metni..."
                            value={conclusion}
                            onChange={e => setConclusion(e.target.value)}
                            className="min-h-[150px] font-medium"
                        />
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
                                        <span className="text-[10px] text-slate-400">#{report.id}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 line-clamp-2">
                                        {report.tani_bulgular || "Tanı girilmemiş"}
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
