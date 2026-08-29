"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api, MedicalReport } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useAIScribeStore } from "@/stores/ai-scribe-store";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { PatientHeader } from "@/components/clinical/patient-header";

const TEMPLATES = [
    {
        title: "Intravezikal BCG Uygulama",
        text: `Hastaya mesane tümörü nüks önleyici tedavisi kapsamında, steril şartlarda üretral kateterizasyon uygulandı. Mesane boşaltıldıktan sonra [Doz Miktarı] ünite BCG (Bacillus Calmette-Guérin) solüsyonu intravezikal yolla zerk edildi. İşlem sonrası kateter çekildi. Hastaya ilacı 2 saat mesanesinde tutması ve pozisyon değiştirmesi önerildi.`
    },
    {
        title: "Sonda Takılması (Üretral Kateterizasyon)",
        text: `Hastaya [Endikasyon: Üriner retansiyon vb.] nedeniyle steril koşullarda, uygun boyutta (No: ...) Foley kateter uygulandı. Balon [10 cc] SF ile şişirilerek sabitlendi. Aktif idrar çıkışı gözlendi. İdrar torbası bağlantısı yapıldı.`
    },
    {
        title: "Kriyoterapi",
        text: `Hastanın [Vücut Bölgesi] bölgesinde yer alan lezyonlara, sıvı azot kullanılarak kriyoterapi cihazı ile [Kaç seans/sn] uygulama yapıldı. İşlem sonrası lokal bakım önerileri hastaya sözlü ve yazılı olarak iletildi.`
    },
    {
        title: "Lazer Kondilom Ablasyonu",
        text: `Lokal anestezi altında, anogenital bölgede saptanan tüm kondilomatöz lezyonlar lazer (CO2/Nd:YAG) ile ablate edilerek temizlendi. İşlem sırasında çevre doku korundu, hemostaz sağlandı.`
    },
    {
        title: "Aşı Uygulama",
        text: `Hastaya [Aşı Adı] aşısı, [Uygulama Yolu: IM/Subkutan] ve [Uygulama Bölgesi: örn. Sağ Deltoid] yoluyla uygulandı. Hasta, olası alerjik reaksiyonlara karşı 15 dakika müşahede altında tutuldu.`
    },
    {
        title: "Ürostomi Takılması/Bakımı",
        text: `Ürostomi stoması çevresi temizlendi, stoma sağlığı kontrol edildi. Uygun boyutta adaptör ve ürostomi torbası, sızıntı olmayacak şekilde cilde uygulandı. Torba boşaltma mekanizması kontrol edildi.`
    },
    {
        title: "Basit Cerrahi Müdahale",
        text: `Lokal anestezi (Aritmal %2) altında, [Bölge] bölgesindeki [Lezyon/Yara] eksize edildi/temizlendi. Kanama kontrolü yapıldı. [Sütür Tipi] ile primer sütürize edildi. Steril pansuman ile kapatıldı.`
    },
    {
        title: "Pansuman",
        text: `Mevcut yara/insizyon bölgesi aseptik solüsyonlarla temizlendi. Enfeksiyon bulgusu [Saptanmadı / Saptandı]. Yara kenarları debride edildi ve steril gazlı bez/modern yara bakım ürünleri ile pansuman yenilendi.`
    },
    {
        title: "Perkütan Suprapubik Sistostomi Takılması",
        text: `Hastaya [Endikasyon: Üretral darlık/Akut retansiyon vb.] nedeniyle suprapubik bölge sterilizasyonunu müteakip lokal anestezi uygulandı. Ultrason eşliğinde (veya palpasyonla) mesane lokalize edildi. Suprapubik hattan trokar yardımıyla (veya insizyonla) mesaneye girilerek [No: ...] foley kateter yerleştirildi. Kateter balonu [5-10 cc] SF ile şişirildi ve cilde [Sütür tipi] ile tespit edildi. Aktif idrar çıkışı gözlendi, steril pansuman ile işlem sonlandırıldı.`
    }
];

export default function MedicalReportPage() {
    const params = useParams();
    const patientId = String(params.id);
    const [patient, setPatient] = useState<any>(null);
    const [reports, setReports] = useState<MedicalReport[]>([]);

    // Form State
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [reportDate, setReportDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [templateSearch, setTemplateSearch] = useState("");
    const [procedureTitle, setProcedureTitle] = useState("");
    const [procedureDetail, setProcedureDetail] = useState("");
    const [conclusion, setConclusion] = useState("İşlem sorunsuz tamamlanmıştır. Hastaya [İlaç/Reçete] önerilmiş ve [Tarih] tarihinde kontrol randevusu verilmiştir.");

    const loadData = async () => {
        try {
            const [pData, rData] = await Promise.all([
                api.patients.get(patientId),
                api.clinical.getMedicalReports(patientId)
            ]);
            setPatient(pData);
            setReports(rData);

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
        setReportDate(format(new Date(), 'yyyy-MM-dd'));
        setProcedureTitle("");
        setProcedureDetail("");
        setConclusion("İşlem sorunsuz tamamlanmıştır. Hastaya [İlaç/Reçete] önerilmiş ve [Tarih] tarihinde kontrol randevusu verilmiştir.");
        toast.info("Yeni tıbbi müdahale raporu formu.");
    };

    const handleSelectReport = (report: MedicalReport) => {
        setSelectedReportId(report.id);
        setReportDate(report.tarih ? format(parseISO(report.tarih), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
        setProcedureTitle(report.islem_basligi || "");
        setProcedureDetail(report.islem_detayi || "");
        setConclusion(report.sonuc_oneriler || "");
    };

    // --- API: Sharded Templates ---
    const { data: shardedTemplates = [] } = useQuery({
        queryKey: ['definitions', 'sablonlar', 'medical_intervention'],
        queryFn: () => api.definitions.sablonlar.list('medical_intervention'),
    });

    const [templates, setTemplates] = useState<{ title: string, text: string }[]>(TEMPLATES);

    useEffect(() => {
        if (shardedTemplates.length > 0) {
            setTemplates(shardedTemplates.map(t => {
                const parts = t.icerik.split('|');
                return {
                    title: t.kod || parts[0] || "Başlıksız",
                    text: parts[1] || t.icerik
                };
            }));
        } else {
            setTemplates(TEMPLATES);
        }
    }, [shardedTemplates]);

    const filteredTemplates = templates.filter(t =>
        t.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.text.toLowerCase().includes(templateSearch.toLowerCase())
    );

    const handleApplyTemplate = (template: { title: string, text: string }) => {
        setProcedureTitle(template.title);
        setProcedureDetail(template.text);
        setTemplateDialogOpen(false);
        toast.success("Şablon uygulandı.");
    };

    const handleSave = async () => {
        try {
            const payload = {
                hasta_id: patientId,
                tarih: reportDate,
                islem_basligi: procedureTitle,
                islem_detayi: procedureDetail,
                sonuc_oneriler: conclusion
            };

            if (selectedReportId) {
                await api.clinical.updateMedicalReport(selectedReportId, payload);
                toast.success("Rapor güncellendi.");
            } else {
                const newReport = await api.clinical.createMedicalReport(payload);
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
            await api.clinical.deleteMedicalReport(selectedReportId);
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
            window.open(`/print/medical-report/${selectedReportId}`, '_blank');
        } else {
            toast.error("Yazdırmak için önce raporu kaydedin.");
        }
    };

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        onSave: handleSave
    });

    // AI Scribe Integration
    const { latestResult, setLatestResult } = useAIScribeStore();

    useEffect(() => {
        if (latestResult) {
            // Apply AI clinical note to procedure detail field
            if (latestResult.clinical_note) {
                setProcedureDetail(prev => {
                    const newDetail = prev ? prev + "\n\n" + latestResult.clinical_note : latestResult.clinical_note;
                    return newDetail || "";
                });
                toast.success("AI analizi rapor detayına eklendi.");
                setLatestResult(null);
            }
        }
    }, [latestResult, setLatestResult]);

    return (
        <div className="flex h-full flex-col gap-6 p-6 lg:flex-row bg-slate-50/50 min-h-screen">
            {/* Main Content */}
            <div className="flex-1 space-y-6">
                <PatientHeader patient={patient} moduleName="Tıbbi Müdahale Raporu" />

                {/* Action Bar */}
                <div className="rounded-xl border border-white bg-white shadow-sm p-2 flex items-center justify-end gap-2">
                    <div className="flex items-center gap-2">
                        <Button
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                            onClick={handleSave}
                        >
                            <Save className="h-3 w-3" />
                            KAYDET
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                            onClick={() => setTemplateDialogOpen(true)}
                        >
                            <FileText className="h-3 w-3" />
                            ŞABLON
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
                <div className="flex-1 rounded-xl border border-white bg-white shadow-sm p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">İşlem Tarihi</Label>
                            <DatePicker
                                date={reportDate}
                                setDate={setReportDate}
                                className="w-full bg-slate-50 border-slate-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Seçilen İşlem Başlığı</Label>
                            <Input
                                value={procedureTitle}
                                onChange={e => setProcedureTitle(e.target.value)}
                                placeholder="Bir şablon seçin veya başlık girin"
                                className="font-bold w-full bg-slate-50"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">İŞLEM DETAYI VE UYGULAMA METNİ</Label>
                        <Textarea
                            placeholder="İşlem detaylarını buraya girin veya soldan bir şablon seçin..."
                            value={procedureDetail}
                            onChange={e => setProcedureDetail(e.target.value)}
                            className="min-h-[200px] font-medium leading-relaxed font-mono text-sm"
                        />
                        <p className="text-[10px] text-slate-400 italic text-right">Köşeli parantez içindeki [...] alanları doldurunuz.</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">SONUÇ VE ÖNERİLER</Label>
                        <Textarea
                            placeholder="Sonuç ve öneriler..."
                            value={conclusion}
                            onChange={e => setConclusion(e.target.value)}
                            className="min-h-[100px] font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* Sidebar List */}
            <div className="w-full lg:w-[240px] space-y-4 shrink-0">
                <Button
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-md rounded-xl"
                    onClick={handleNewReport}
                >
                    <Plus className="h-4 w-4" /> YENİ RAPOR
                </Button>
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
                                            {report.tarih ? format(new Date(report.tarih), 'dd.MM.yyyy') : '-'}
                                        </span>
                                        <span className="text-[10px] text-slate-400">#{report.id}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 line-clamp-1 font-bold">
                                        {report.islem_basligi || "Başlıksız İşlem"}
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

            {/* Template Selection Dialog */}
            <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Tıbbi Müdahale Şablonları</DialogTitle>
                        <DialogDescription>
                            Aşağıdaki listeden bir şablon seçerek işlemi doldurabilirsiniz.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Şablon ara (İşlem adı veya detay)..."
                            value={templateSearch}
                            onChange={(e) => setTemplateSearch(e.target.value)}
                            className="pl-10 h-10 bg-slate-50 border-slate-200"
                        />
                    </div>

                    <ScrollArea className="max-h-[400px] mt-4">
                        <div className="space-y-3 pr-4">
                            {filteredTemplates.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                    <Search className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">Aradığınız kriterlere uygun şablon bulunamadı.</p>
                                </div>
                            ) : (
                                filteredTemplates.map((tpl: any, i: number) => (
                                    <button
                                        key={i}
                                        onClick={() => handleApplyTemplate(tpl)}
                                        className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group relative"
                                    >
                                        <div className="font-bold text-slate-900 mb-1 flex items-center justify-between">
                                            {tpl.title}
                                            <Plus className="h-4 w-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="text-xs text-slate-500 line-clamp-3 font-mono bg-slate-100/50 p-2 rounded-lg mt-2">
                                            {tpl.text}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Kapat</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
