"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { api, ConsultationReport } from "@/lib/api";
import { format, parseISO } from "date-fns";
import {
    Plus,
    Save,
    Search,
    Trash2,
    Printer,
    RefreshCw
} from "lucide-react";
import { cn, formatToSentenceCasePreservingAbbreviations } from "@/lib/utils";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useAuthStore } from "@/stores/auth-store";

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
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PatientHeader } from "@/components/clinical/patient-header";

export default function ConsultationReportPage() {
    const params = useParams();
    const patientId = String(params.id);
    const user = useAuthStore((s) => s.user);

    const [patient, setPatient] = useState<any>(null);
    const [reports, setReports] = useState<ConsultationReport[]>([]);
    const [latestExam, setLatestExam] = useState<any>(null);

    // Form State
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [hitapKlinisyen, setHitapKlinisyen] = useState("");
    const [ozgecmis, setOzgecmis] = useState("");
    const [tani, setTani] = useState("");
    const [ilaclar, setIlaclar] = useState("");
    const [sikayet, setSikayet] = useState("");
    const [oyku, setOyku] = useState("");
    const [talep, setTalep] = useState("");
    const [konsultasyonSorular, setKonsultasyonSorular] = useState("");
    const [doktor, setDoktor] = useState("");
    const [goruntuleme, setGoruntuleme] = useState("");
    const [labBulgu, setLabBulgu] = useState("");
    const [sistemSorgu, setSistemSorgu] = useState("");
    const [aliskanliklar, setAliskanliklar] = useState("");
    const [raporMetni, setRaporMetni] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const loadData = async () => {
        try {
            const [pResult, rResult, mResult] = await Promise.allSettled([
                api.patients.get(patientId),
                api.clinical.getConsultationReports(patientId),
                api.clinical.getMuayeneler(patientId)
            ]);

            if (pResult.status === 'fulfilled') setPatient(pResult.value);
            if (rResult.status === 'fulfilled') {
                setReports(rResult.value);
                if (rResult.value.length > 0 && !selectedReportId) {
                    handleSelectReport(rResult.value[0]);
                }
            }

            if (mResult.status === 'fulfilled' && mResult.value.length > 0) {
                const sorted = [...mResult.value].sort((a, b) => {
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

    // Set doctor from current user on mount
    useEffect(() => {
        if (user?.full_name && !doktor && !selectedReportId) {
            setDoktor(user.full_name);
        }
    }, [user]);

    const handleNewReport = () => {
        setSelectedReportId(null);
        setReportDate(new Date().toISOString().split('T')[0]);
        setHitapKlinisyen("");
        setOzgecmis("");
        setTani("");
        setIlaclar("");
        setSikayet("");
        setOyku("");
        setTalep("");
        setKonsultasyonSorular("");
        setDoktor(user?.full_name || "");
        setGoruntuleme("");
        setLabBulgu("");
        setSistemSorgu("");
        setAliskanliklar("");
        setRaporMetni("");
        toast.info("Yeni konsültasyon formu.");
    };

    const handleSelectReport = (report: ConsultationReport) => {
        setSelectedReportId(report.id);
        setReportDate(report.tarih || new Date().toISOString().split('T')[0]);
        setHitapKlinisyen(report.hitap_klinisyen || "");
        setOzgecmis(report.ozgecmis || "");
        setTani(report.tani || "");
        setIlaclar(report.ilaclar || "");
        setSikayet(report.sikayet || "");
        setOyku(report.oyku || "");
        setTalep(report.talep || "");
        setKonsultasyonSorular(report.konsultasyon_sorular || "");
        setDoktor(report.doktor || "");
        setGoruntuleme("");
        setLabBulgu("");
        setSistemSorgu(report.sistem_sorgu || "");
        setAliskanliklar(report.aliskanliklar || "");
        setRaporMetni(report.rapor_metni || "");
    };

    const handleSave = async () => {
        try {
            const payload = {
                hasta_id: patientId,
                tarih: reportDate,
                hitap_klinisyen: hitapKlinisyen,
                ozgecmis,
                tani,
                ilaclar,
                sikayet,
                oyku,
                talep,
                konsultasyon_sorular: konsultasyonSorular,
                doktor,
                sistem_sorgu: sistemSorgu,
                aliskanliklar,
                rapor_metni: raporMetni || undefined,
            };

            if (selectedReportId) {
                await api.clinical.updateConsultationReport(selectedReportId, payload);
                toast.success("Rapor güncellendi.");
            } else {
                const newReport = await api.clinical.createConsultationReport(payload);
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
            await api.clinical.deleteConsultationReport(selectedReportId);
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
            window.open(`/print/consultation-report/${selectedReportId}`, '_blank');
        } else {
            toast.error("Yazdırmak için önce raporu kaydedin.");
        }
    };

    /** Turkish-aware sentence case: her cümlenin ilk harfi büyük, geri kalan küçük */
    const toSentenceCase = (text: string | null | undefined): string => {
        if (!text) return "";
        const lower = text.toLocaleLowerCase("tr-TR");
        return lower.replace(/(^|[.]\s*)([a-zA-ZçğıöşüÇĞİÖŞÜ])/g, (_match, prefix, letter) =>
            prefix + letter.toLocaleUpperCase("tr-TR")
        );
    };

    const handleFetchFromExam = () => {
        if (!latestExam) {
            toast.warning("Hasta için kayıtlı muayene bulunamadı.");
            return;
        }

        const diagParts: string[] = [];
        if (latestExam.tani1) diagParts.push(`${latestExam.tani1_kodu ? latestExam.tani1_kodu + " " : ""}${latestExam.tani1}`);
        if (latestExam.tani2) diagParts.push(`${latestExam.tani2_kodu ? latestExam.tani2_kodu + " " : ""}${latestExam.tani2}`);

        setTani(diagParts.join(", "));
        setOzgecmis(latestExam.ozgecmis || "");
        setIlaclar(latestExam.kullandigi_ilaclar || "");
        setSikayet(latestExam.sikayet || "");
        setOyku(latestExam.oyku || "");
        let parsedSistemSorgu: any = null;
        let originalSistemSorguText = "";

        if (latestExam.sistem_sorgu) {
            try {
                parsedSistemSorgu = JSON.parse(latestExam.sistem_sorgu);
            } catch (e) {
                originalSistemSorguText = latestExam.sistem_sorgu || "";
            }
        }

        const getVal = (directVal: any, jsonVal: any) => {
            let val = directVal || jsonVal;
            if (val === "0" || val === 0) return "yok";
            if (typeof val === "string") return val;
            return val ? String(val) : "";
        };

        const pollakiuri = getVal(latestExam.pollakiuri, parsedSistemSorgu?.pollakiuritext);
        const nokturi = getVal(latestExam.nokturi, parsedSistemSorgu?.nokturitext);
        const residiv = getVal(latestExam.residiv_hissi, parsedSistemSorgu?.residuhissitext);
        const idrarBas = getVal(latestExam.idrar_bas_zorluk, parsedSistemSorgu?.idrarbaszorluktext);
        const projeksiyon = getVal(latestExam.projeksiyon_azalma, parsedSistemSorgu?.projeksiyonazalmasq);
        const kesikIdrar = getVal(latestExam.kesik_idrar_yapma, parsedSistemSorgu?.kesikıdraryapmatext);

        const urinaryParts: string[] = [];
        if (pollakiuri) urinaryParts.push(`pollaküri ${pollakiuri}`);
        if (nokturi) urinaryParts.push(`noktüri ${nokturi}`);
        if (residiv) urinaryParts.push(`rezidü hissi ${residiv}`);
        if (idrarBas) urinaryParts.push(`idrar başlatmada zorluk ${idrarBas}`);
        if (projeksiyon) urinaryParts.push(`projeksiyonda azalması ${projeksiyon}`);
        if (kesikIdrar) urinaryParts.push(`kesik idrar yapma ${kesikIdrar}`);

        let generatedSistemSorgu = "";
        if (urinaryParts.length > 0) {
            const lastPart = urinaryParts.pop();
            const joinedParts = urinaryParts.length > 0 ? `${urinaryParts.join(', ')} ve ${lastPart}` : lastPart;
            generatedSistemSorgu += `Hastamızın üriner sistem sorgulamasında; ${joinedParts} olarak belirtilmiştir.\n`;
        }
        
        const erektil = getVal(latestExam.erektil_islev, parsedSistemSorgu?.erektil_islev);
        const ejakulasyon = getVal(latestExam.ejakulasyon, parsedSistemSorgu?.ejakulasyon);

        let sexualHealthParts: string[] = [];
        if (erektil) {
            if (erektil === "yok") {
                sexualHealthParts.push("Hastamızın erektil fonksiyon şikayeti yoktur.");
            } else if (erektil === "var") {
                sexualHealthParts.push("Hastamızın erektil fonksiyon şikayeti vardır.");
            } else {
                sexualHealthParts.push(`Hastamızın erektil fonksiyon şikayeti ${erektil} olarak belirtilmiştir.`);
            }
        }
        if (ejakulasyon) {
            sexualHealthParts.push(`Ejekülasyon ${ejakulasyon} olarak belirtilmiştir.`);
        }
        
        if (sexualHealthParts.length > 0) {
            generatedSistemSorgu += sexualHealthParts.join(" ") + "\n";
        }

        const finalSistemSorgu = [originalSistemSorguText, generatedSistemSorgu.trim()].filter(Boolean).join("\n\n");
        setSistemSorgu(finalSistemSorgu);
        
        let generatedAliskanliklar = "";
        const rawAlisk = getVal(latestExam.aliskanliklar, null);
        if (rawAlisk && rawAlisk !== "yok") {
            generatedAliskanliklar = rawAlisk;
        }

        if (parsedSistemSorgu) {
            const sigara = getVal(null, parsedSistemSorgu.sigara);
            const alkol = getVal(null, parsedSistemSorgu.alkol);
            const sosyal = getVal(null, parsedSistemSorgu.sosyal);
            const aliskParts: string[] = [];
            if (sigara && sigara !== "yok") aliskParts.push(`sigara: ${sigara}`);
            if (alkol && alkol !== "yok") aliskParts.push(`alkol: ${alkol}`);
            if (sosyal && sosyal !== "yok") aliskParts.push(`madde: ${sosyal}`);
            
            if (aliskParts.length > 0) {
                const parsedStr = aliskParts.join(', ');
                generatedAliskanliklar = [generatedAliskanliklar, parsedStr].filter(Boolean).join(", ");
            }
        }
        setAliskanliklar(generatedAliskanliklar);
        setRaporMetni("");

        toast.info("Bilgiler son muayeneden getirildi.");
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

    const handleFetchFromImaging = async () => {
        try {
            const imagings = await api.clinical.getImagings(patientId);
            if (imagings && imagings.length > 0) {
                const sorted = [...imagings].sort((a, b) => {
                    const dateA = a.tarih ? new Date(a.tarih).getTime() : 0;
                    const dateB = b.tarih ? new Date(b.tarih).getTime() : 0;
                    return dateB - dateA;
                });
                const latest = sorted[0];
                setGoruntuleme(`${latest.tetkik_adi || "Görüntüleme"}: ${latest.sonuc || "Sonuç bulunmuyor."}`);
                toast.info("En son görüntüleme verisi getirildi.");
            } else {
                toast.warning("Hasta için görüntüleme kaydı bulunamadı.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Görüntüleme verisi çekilirken hata oluştu.");
        }
    };

    // Live preview of letter — matches the new template
    const letterPreview = useMemo(() => {
        if (raporMetni) return raporMetni;

        const hastaAdi = patient ? `${patient.ad || ""} ${patient.soyad || ""}`.trim() : "[Hasta Ad Soyad]";
        const hitap = hitapKlinisyen || "[Hitap Edilen Hekim/Klinik]";
        const sikayetMetni = formatToSentenceCasePreservingAbbreviations(sikayet) || "[Şikayet]";
        const taniMetni = formatToSentenceCasePreservingAbbreviations(tani) || "[Ön Tanı]";
        const talepMetni = formatToSentenceCasePreservingAbbreviations(talep) || "[Konsültasyon Talebi]";
        const sorularMetni = formatToSentenceCasePreservingAbbreviations(konsultasyonSorular) || "[Konsültasyon soruları]";
        const oykuMetni = formatToSentenceCasePreservingAbbreviations(oyku) || "[Öykü]";
        const sistemSorguMetni = formatToSentenceCasePreservingAbbreviations(sistemSorgu) || "[sistemlerin sorgusu]";
        const ozgecmisMetni = formatToSentenceCasePreservingAbbreviations(ozgecmis) || "[Özgeçmiş]";
        const ilacMetni = formatToSentenceCasePreservingAbbreviations(ilaclar) || "[İlaçlar]";
        const aliskanliklarMetni = formatToSentenceCasePreservingAbbreviations(aliskanliklar) || "[Alışkanlıkları]";
        const doktorMetni = doktor || "[Doktor Adı]";

        let letter = `Konu: Konsültasyon Talebi\n\n`;
        letter += `Sayın Dr. ${hitap},\n\n`;
        letter += `Hastamız ${hastaAdi} bugün ${sikayetMetni} ile başvurdu. Hastamızda ${taniMetni} ön tanısı düşünülmüştür.\n\n`;
        letter += `Hastamızın ${talepMetni} konusunda tarafınızca değerlendirilmesini ve\n`;
        letter += `${sorularMetni} konusunda görüşlerinizin bildirilmesini rica ederim.\n\n`;
        letter += `Hastamızın öyküsünde ${oykuMetni} vardı.\n\n`;
        letter += `${sistemSorguMetni}\n\n`;
        letter += `Özgeçmişinde ${ozgecmisMetni} vardı. Kullandığı ilaçları ${ilacMetni}. Alışkanlıkları: ${aliskanliklarMetni}.\n\n\n`;
        letter += `Saygılarımla,\n`;
        letter += `${doktorMetni}`;

        return letter;
    }, [raporMetni, patient, hitapKlinisyen, ilaclar, tani, sikayet, oyku, sistemSorgu, ozgecmis, talep, konsultasyonSorular, doktor, aliskanliklar]);

    const filteredReports = reports.filter((r) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            r.hitap_klinisyen?.toLowerCase().includes(q) ||
            r.tani?.toLowerCase().includes(q) ||
            r.talep?.toLowerCase().includes(q) ||
            r.tarih?.includes(q)
        );
    });

    return (
        <div className="flex h-full flex-col gap-6 p-6 lg:flex-row bg-slate-50/50 min-h-screen">
            {/* Main Content */}
            <div className="flex-1 space-y-6">
                <PatientHeader patient={patient} moduleName="Konsültasyon Raporu" />

                {/* Action Bar */}
                <div className="rounded-xl border border-white bg-white shadow-sm p-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-[10px] font-bold border-blue-200 text-blue-600 hover:bg-blue-50 bg-blue-50/30 gap-1"
                            onClick={handleFetchFromExam}
                        >
                            <RefreshCw className="h-3 w-3" />
                            MUAYENEDEN GETİR
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-[10px] font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50 bg-indigo-50/30 gap-1"
                            onClick={handleFetchFromImaging}
                        >
                            <RefreshCw className="h-3 w-3" />
                            GÖRÜNTÜLEMEDEN GETİR
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                            onClick={handleNewReport}
                        >
                            <Plus className="h-3 w-3" />
                            YENİ
                        </Button>
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>
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
                </div>

                {/* Form */}
                <div className="rounded-xl border border-white bg-white shadow-sm p-6 space-y-5">
                    {/* Row 1: Date + Hitap */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">RAPOR TARİHİ</Label>
                            <DatePicker date={reportDate} setDate={setReportDate} className="font-bold" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sayın (Klinisyen Adı ve Unvanı)</Label>
                            <Input
                                placeholder="Op. Dr. Mehmet Demir, Genel Cerrahi Uzmanı"
                                value={hitapKlinisyen}
                                onChange={e => setHitapKlinisyen(e.target.value)}
                                className="font-semibold"
                            />
                        </div>
                    </div>

                    {/* Row 2: Şikayet — full width */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Şikayet</Label>
                        <Input
                            placeholder="Başvuru şikayeti..."
                            value={sikayet}
                            onChange={e => setSikayet(e.target.value)}
                            className="font-medium"
                        />
                    </div>

                    {/* Row 3: Konsültasyon Talebi + Konsültasyon Soruları */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Konsültasyon Talebi</Label>
                            <Textarea
                                placeholder="Hangi konuda değerlendirme isteniyor..."
                                value={talep}
                                onChange={e => setTalep(e.target.value)}
                                className="min-h-[80px] font-semibold text-blue-800 border-blue-200 bg-blue-50/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Konsültasyon Soruları</Label>
                            <Textarea
                                placeholder="Klinisyene iletilmek istenen sorular..."
                                value={konsultasyonSorular}
                                onChange={e => setKonsultasyonSorular(e.target.value)}
                                className="min-h-[80px] font-medium border-amber-200 bg-amber-50/20"
                            />
                        </div>
                    </div>

                    {/* Row 4: Öykü — full width */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tıbbi Öykü</Label>
                        <Textarea
                            placeholder="Hasta öyküsü..."
                            value={oyku}
                            onChange={e => setOyku(e.target.value)}
                            className="min-h-[80px] font-medium resize-y"
                        />
                    </div>

                    {/* Row 5: Özgeçmiş + Sistemlerin Sorgusu */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Özgeçmiş</Label>
                            <Textarea
                                placeholder="Tıbbi özgeçmiş..."
                                value={ozgecmis}
                                onChange={e => setOzgecmis(e.target.value)}
                                className="min-h-[60px] font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sistemlerin Sorgusu</Label>
                            <Textarea
                                placeholder="Sistemlerin sorgusu bulguları..."
                                value={sistemSorgu}
                                onChange={e => setSistemSorgu(e.target.value)}
                                className="min-h-[60px] font-medium"
                            />
                        </div>
                    </div>

                    {/* Row 6: İlaçlar + Alışkanlıkları */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kullandığı İlaçlar</Label>
                            <Textarea
                                placeholder="Mevcut ilaç tedavisi..."
                                value={ilaclar}
                                onChange={e => setIlaclar(e.target.value)}
                                className="min-h-[60px] font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alışkanlıkları</Label>
                            <Textarea
                                placeholder="Sigara, alkol, madde kullanımı vb..."
                                value={aliskanliklar}
                                onChange={e => setAliskanliklar(e.target.value)}
                                className="min-h-[60px] font-medium"
                            />
                        </div>
                    </div>

                    {/* Row 7: Tanı (hidden but stored) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanı</Label>
                            <Textarea
                                placeholder="Hastanın tanısı..."
                                value={tani}
                                onChange={e => setTani(e.target.value)}
                                className="min-h-[60px] font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">İlgili Doktor</Label>
                            <Input
                                placeholder="Gönderen doktor..."
                                value={doktor}
                                onChange={e => setDoktor(e.target.value)}
                                className="font-semibold"
                            />
                        </div>
                    </div>

                    {/* Row 8: Tetkikler */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Görüntüleme Sonuçları (Radyoloji vb.)</Label>
                            <Textarea
                                placeholder="Görüntüleme sonuçları..."
                                value={goruntuleme}
                                onChange={e => setGoruntuleme(e.target.value)}
                                className="min-h-[60px] font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Laboratuvar/Patoloji Bulguları</Label>
                            <Textarea
                                placeholder="Lab/Patoloji bulguları..."
                                value={labBulgu}
                                onChange={e => setLabBulgu(e.target.value)}
                                className="min-h-[60px] font-medium"
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mektup Önizleme</Label>
                            <span className="text-[10px] text-slate-400">Aşağıdaki metni düzenleyerek özel metin girebilirsiniz</span>
                        </div>
                        <Textarea
                            value={raporMetni || letterPreview}
                            onChange={e => setRaporMetni(e.target.value)}
                            className="min-h-[300px] font-mono text-sm leading-relaxed bg-white"
                            placeholder="Otomatik oluşturulan mektup metni burada görünecek..."
                        />
                        {raporMetni && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] text-slate-500 h-6"
                                onClick={() => setRaporMetni("")}
                            >
                                Otomatik metne dön
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Sidebar List */}
            <div className="w-full lg:w-[240px] space-y-4 shrink-0">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Raporlarda ara..."
                            className="pl-9 bg-slate-50 border-slate-200"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="rounded-xl border border-white bg-white shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)] sticky top-6">
                    <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">GEÇMİŞ RAPORLAR</h3>
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{reports.length}</span>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="flex flex-col">
                            {filteredReports.map((report) => (
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
                                        <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200 text-[10px]">Konsültasyon</Badge>
                                    </div>
                                    <div className="text-xs text-slate-500 line-clamp-1 font-medium">
                                        {report.hitap_klinisyen || "Klinisyen belirtilmemiş"}
                                    </div>
                                    <div className="text-xs text-slate-400 line-clamp-1">
                                        {report.talep || report.tani || "Talep girilmemiş"}
                                    </div>
                                </button>
                            ))}
                            {reports.length === 0 && (
                                <div className="p-8 text-center text-slate-400 text-xs text-opacity-70">
                                    Henüz konsültasyon raporu yok.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}
