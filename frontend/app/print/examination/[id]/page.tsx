"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { api, Muayene, Patient } from "@/lib/api";
import { format, parseISO } from "date-fns";
import dynamic from "next/dynamic";
import { ExaminationPDF } from "@/components/pdf/ExaminationPDF";
import { FlaskConical, ScanLine } from "lucide-react";
import {
    parseSystemQuery,
    buildIpssData,
    buildIiefData,
    buildSystemInquiry,
} from "@/lib/pdf/examination-print-data";

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

    const [selectedLabIds, setSelectedLabIds] = useState<string[]>([]);
    const [selectedImagingIds, setSelectedImagingIds] = useState<string[]>([]);

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

                    // Read cached selection from localStorage if available
                    let storedSelection: { labs?: string[]; imaging?: string[] } | null = null;
                    try {
                        const rawStored = localStorage.getItem(`urolog_print_exam_${id}`);
                        if (rawStored) {
                            storedSelection = JSON.parse(rawStored);
                        }
                    } catch (e) {
                        console.error("Failed to parse cached print selection", e);
                    }

                    // Resolve selectedLabIds
                    if (labParam === "all") {
                        setSelectedLabIds((labsData || []).map((l: any) => l.id));
                    } else if (labParam === "none") {
                        setSelectedLabIds([]);
                    } else if (labParam === "storage" || labParam === "custom") {
                        if (storedSelection && Array.isArray(storedSelection.labs)) {
                            setSelectedLabIds(storedSelection.labs);
                        } else {
                            setSelectedLabIds((labsData || []).map((l: any) => l.id));
                        }
                    } else if (labParam) {
                        setSelectedLabIds(labParam.split(",").filter(Boolean));
                    } else {
                        if (storedSelection && Array.isArray(storedSelection.labs)) {
                            setSelectedLabIds(storedSelection.labs);
                        } else {
                            setSelectedLabIds((labsData || []).map((l: any) => l.id));
                        }
                    }

                    // Resolve selectedImagingIds
                    if (imagingParam === "all") {
                        setSelectedImagingIds((imagingsData || []).map((i: any) => i.id));
                    } else if (imagingParam === "none") {
                        setSelectedImagingIds([]);
                    } else if (imagingParam === "storage" || imagingParam === "custom") {
                        if (storedSelection && Array.isArray(storedSelection.imaging)) {
                            setSelectedImagingIds(storedSelection.imaging);
                        } else {
                            setSelectedImagingIds((imagingsData || []).map((i: any) => i.id));
                        }
                    } else if (imagingParam) {
                        setSelectedImagingIds(imagingParam.split(",").filter(Boolean));
                    } else {
                        if (storedSelection && Array.isArray(storedSelection.imaging)) {
                            setSelectedImagingIds(storedSelection.imaging);
                        } else {
                            setSelectedImagingIds((imagingsData || []).map((i: any) => i.id));
                        }
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

    // Türev veri hesabı SUNUCU UCUYLA ORTAK modülden gelir
    // (lib/pdf/examination-print-data.ts). Buradaki kopyası kaldırıldı: Android için
    // sunucuda üretilen PDF ile bu sayfanın çıktısı ayrışmasın diye tek kaynak.
    const sq = useMemo(() => parseSystemQuery(exam), [exam]);
    const ipssData = useMemo(() => buildIpssData(exam, sq), [exam, sq]);
    const iiefData = useMemo(() => buildIiefData(exam), [exam]);
    const systemInquiry = useMemo(() => buildSystemInquiry(exam, sq), [exam, sq]);

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
