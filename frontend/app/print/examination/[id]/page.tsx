"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { api, Muayene, Patient } from "@/lib/api";
import { format, parseISO } from "date-fns";
import dynamic from "next/dynamic";
import { ExaminationPDF } from "@/components/pdf/ExaminationPDF";
import { FlaskConical, ScanLine } from "lucide-react";

// Dynamic import for PDFViewer to avoid SSR issues
const PDFViewer = dynamic(() => import("@react-pdf/renderer").then(mod => mod.PDFViewer), {
    ssr: false,
    loading: () => <div className="h-screen flex items-center justify-center text-slate-500">PDF Oluşturuluyor...</div>
});

function PrintPageContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const id = String(params.id);

    const labParam = searchParams.get("labs");
    const imagingParam = searchParams.get("imaging");

    const [exam, setExam] = useState<Muayene | null>(null);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    const [allLabs, setAllLabs] = useState<any[]>([]);
    const [allImagings, setAllImagings] = useState<any[]>([]);

    const [selectedLabIds, setSelectedLabIds] = useState<string[]>(
        labParam ? labParam.split(",").filter(Boolean) : []
    );
    const [selectedImagingIds, setSelectedImagingIds] = useState<string[]>(
        imagingParam ? imagingParam.split(",").filter(Boolean) : []
    );

    useEffect(() => {
        const loadData = async () => {
            try {
                const settingsList = await api.settings.getAll();
                const settingsMap = settingsList.reduce((acc, curr) => {
                    acc[curr.key] = curr.value || "";
                    return acc;
                }, {} as Record<string, string>);
                setSettings(settingsMap);

                const examData = await api.clinical.getMuayene(id);
                setExam(examData);

                if (examData.hasta_id) {
                    const [patientData, labsData, imagingsData] = await Promise.all([
                        api.patients.get(examData.hasta_id),
                        api.clinical.getLabs(examData.hasta_id, "all").catch(() => []),
                        api.clinical.getImagings(examData.hasta_id).catch(() => [])
                    ]);
                    setPatient(patientData);
                    setAllLabs(labsData || []);
                    setAllImagings(imagingsData || []);

                    // If URL parameters were provided, update selection state
                    if (labParam !== null) {
                        setSelectedLabIds(labParam ? labParam.split(",").filter(Boolean) : []);
                    }
                    if (imagingParam !== null) {
                        setSelectedImagingIds(imagingParam ? imagingParam.split(",").filter(Boolean) : []);
                    }
                }
            } catch (error) {
                console.error("Print data loading failed", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) loadData();
    }, [id, labParam, imagingParam]);

    useEffect(() => {
        if (patient && exam) {
            const dateStr = exam.tarih ? format(parseISO(exam.tarih), 'yyyy-MM-dd') : 'Tarihsiz';
            const adSoyad = `${patient.ad}${patient.soyad}`.replace(/\s+/g, '');
            document.title = `${adSoyad}-${dateStr}-Muayene`;
        }
    }, [patient, exam]);

    const sq = useMemo(() => {
        if (!exam || !exam.sistem_sorgu) return {};
        if (exam.sistem_sorgu.startsWith("{")) {
            try { return JSON.parse(exam.sistem_sorgu); } catch { return {}; }
        }
        return {};
    }, [exam]);

    const ipssData = useMemo(() => {
        if (!exam) return null;
        const total = parseInt(exam.ipss_skor || "0");

        const residivHissi = parseInt(exam.residiv_hissi || "0");
        const kesikIdrar = parseInt(exam.kesik_idrar_yapma || "0");
        const projeksiyon = parseInt(exam.projeksiyon_azalma || "0");
        const baslamaZorluk = parseInt(exam.idrar_bas_zorluk || "0");
        const pollakiuri = parseInt(exam.pollakiuri || "0");
        const urgency = parseInt((exam as any).urgency || "0") || parseInt(sq.urgency || "0");
        const nokturi = parseInt(exam.nokturi || "0");

        if (total === 0 && residivHissi === 0 && pollakiuri === 0 && nokturi === 0 &&
            kesikIdrar === 0 && projeksiyon === 0 && baslamaZorluk === 0 && urgency === 0) {
            return null;
        }

        const obstructive = residivHissi + kesikIdrar + projeksiyon + baslamaZorluk;
        const irritative = pollakiuri + urgency + nokturi;

        const details: string[] = [];
        if (residivHissi > 0) details.push(`Rezidü hissi ${residivHissi}`);
        if (pollakiuri > 0) details.push(`pollakuri ${pollakiuri}`);
        if (nokturi > 0) details.push(`nokturi ${nokturi}`);
        if (kesikIdrar > 0) details.push(`kesik işeme ${kesikIdrar}`);
        if (urgency > 0) details.push(`urgency ${urgency}`);
        if (baslamaZorluk > 0) details.push(`ıkınma ${baslamaZorluk}`);
        if (projeksiyon > 0) details.push(`projeksiyon ${projeksiyon}`);

        const scoresSuffix = `IRR: ${irritative}, OBST: ${obstructive}, IPSS: ${total}`;
        const detailText = details.length > 0
            ? `${details.join(", ")}  ${scoresSuffix}`
            : scoresSuffix;

        return {
            total,
            obstructive,
            irritative,
            detailText,
            individual: { residivHissi, kesikIdrar, projeksiyon, baslamaZorluk, pollakiuri, urgency, nokturi }
        };
    }, [exam, sq]);

    const iiefData = useMemo(() => {
        if (!exam) return null;
        const score = parseInt((exam as any).iief_ef_skor || "0");
        if (score === 0) return null;

        let severity = "ED Yok";
        let color = "emerald";
        if (score <= 10) { severity = "Şiddetli ED"; color = "red"; }
        else if (score <= 16) { severity = "Orta ED"; color = "orange"; }
        else if (score <= 21) { severity = "Hafif-Orta ED"; color = "yellow"; }
        else if (score <= 25) { severity = "Hafif ED"; color = "lime"; }

        return { score, severity, color };
    }, [exam]);

    const systemInquiry = useMemo(() => {
        if (!exam) return "";
        const parts: string[] = [];
        const lutsMapping: Record<string, { label: string, sqKeys: string[] }> = {
            pollakiuri: { label: "Pollaküri", sqKeys: ["pollakiuri_text", "pollakiuri_sq"] },
            nokturi: { label: "Noktüri", sqKeys: ["nokturi_text", "nokturi_sq"] },
            projeksiyon_azalma: { label: "Zayıf Akım", sqKeys: ["projeksiyon_azalma_sq", "projeksiyon_azalma_text"] },
            idrar_bas_zorluk: { label: "Başlama Zorluğu", sqKeys: ["idrar_bas_zorluk_text", "idrar_bas_zorluk_sq"] },
            kesik_idrar_yapma: { label: "Kesik Kesik Yapma", sqKeys: ["kesik_idrar_yapma_text", "kesik_idrar_yapma_sq"] },
            residiv_hissi: { label: "Tam Boşalamama", sqKeys: ["residu_hissi_text", "residiv_hissi_text", "residiv_hissi_sq"] },
            urgency: { label: "Urgency", sqKeys: ["urgency"] },
        };

        const otherMapping: Record<string, string> = {
            disuri: "Disüri",
            hematuri: "Hematüri",
            urgency: "Sıkışma",
            catallanma: "Çatallanma",
            kalibre_incelme: "Kalibre İncelme",
            terminal_damlama: "Terminal Damlama",
            inkontinans: "İnkontinans",
            genital_akinti: "Genital Akıntı",
            kabizlik: "Kabızlık",
            tas_oyku: "Taş Öyküsü",
            ates: "Ateş",
            erektil_islev: "Erektil Disfonksiyon",
            ejakulasyon: "Ejakülasyon",
        };

        Object.entries(lutsMapping).forEach(([key, info]) => {
            let val = "";
            for (const sqKey of info.sqKeys) {
                if (sq[sqKey] && sq[sqKey] !== "Seçiniz...") {
                    val = sq[sqKey];
                    break;
                }
            }
            if (!val) {
                const examVal = (exam as any)[key];
                if (examVal !== undefined && examVal !== null && examVal !== "" && examVal !== "Seçiniz...") {
                    val = examVal;
                }
            }
            if (val) {
                const displayVal = (val === "Var" || val === "Evet" || val === "var" || val === "evet") ? "var" : val.toString().toLowerCase();
                parts.push(`${info.label} ${displayVal}`);
            }
        });

        Object.entries(otherMapping).forEach(([key, label]) => {
            let val = (exam as any)[key];
            if (!val || val === "Seçiniz...") {
                val = sq[key] || sq[key + "_text"] || sq[key + "_sq"] || sq[key + "Text"] || sq[key + "SQ"];
            }
            if (val !== undefined && val !== null && val !== "" && val !== "Seçiniz...") {
                const displayVal = (val === "Var" || val === "Evet" || val === "var" || val === "evet") ? "var" : val.toString().toLowerCase();
                parts.push(`${label} ${displayVal}`);
            }
        });

        return parts.join(", ");
    }, [exam, sq]);

    const activeLabs = useMemo(() => {
        return allLabs.filter(l => selectedLabIds.includes(l.id));
    }, [allLabs, selectedLabIds]);

    const activeImagings = useMemo(() => {
        return allImagings.filter(i => selectedImagingIds.includes(i.id));
    }, [allImagings, selectedImagingIds]);

    if (loading) return <div className="p-10 font-sans text-sm text-slate-500 animate-pulse">Yükleniyor...</div>;
    if (!exam || !patient) return <div className="p-10 font-sans text-sm text-red-500">Kayıt bulunamadı.</div>;

    const computedData = {
        sq,
        ipssData,
        iiefData,
        systemInquiry
    };

    return (
        <div className="bg-slate-100 min-h-screen flex flex-col">
            {/* Top Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-10 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs">M</div>
                    <div>
                        <div className="font-bold text-slate-800 text-sm">Muayene Raporu Yazdır</div>
                        <div className="text-[11px] text-slate-500 font-medium">
                            {patient.ad} {patient.soyad} ({exam.tarih ? format(parseISO(exam.tarih), "dd.MM.yyyy") : ""})
                        </div>
                    </div>
                </div>

                {/* Quick Selection Toggles */}
                <div className="flex items-center gap-3">
                    {allLabs.length > 0 && (
                        <button
                            onClick={() => {
                                if (selectedLabIds.length > 0) setSelectedLabIds([]);
                                else setSelectedLabIds(allLabs.map(l => l.id));
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                selectedLabIds.length > 0
                                    ? "bg-cyan-100 text-cyan-800 border border-cyan-300"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                        >
                            <FlaskConical className="w-3.5 h-3.5" />
                            Laboratuvar ({selectedLabIds.length}/{allLabs.length})
                        </button>
                    )}

                    {allImagings.length > 0 && (
                        <button
                            onClick={() => {
                                if (selectedImagingIds.length > 0) setSelectedImagingIds([]);
                                else setSelectedImagingIds(allImagings.map(i => i.id));
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                selectedImagingIds.length > 0
                                    ? "bg-violet-100 text-violet-800 border border-violet-300"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                        >
                            <ScanLine className="w-3.5 h-3.5" />
                            Görüntüleme ({selectedImagingIds.length}/{allImagings.length})
                        </button>
                    )}

                    <button
                        onClick={() => window.close()}
                        className="bg-rose-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-700 transition ml-2"
                    >
                        KAPAT
                    </button>
                </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 w-full h-full relative">
                <PDFViewer style={{ width: '100%', height: 'calc(100vh - 60px)', border: 'none' }} showToolbar={true}>
                    <ExaminationPDF
                        exam={exam}
                        patient={patient}
                        settings={settings}
                        computedData={computedData}
                        selectedLabs={activeLabs}
                        selectedImaging={activeImagings}
                    />
                </PDFViewer>
            </div>
        </div>
    );
}

export default function ExaminationPrintPage() {
    return (
        <Suspense fallback={<div className="p-10 font-sans text-sm text-slate-500 animate-pulse">Yükleniyor...</div>}>
            <PrintPageContent />
        </Suspense>
    );
}
