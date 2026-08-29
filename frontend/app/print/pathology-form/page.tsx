"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, Patient } from "@/lib/api";
import dynamic from "next/dynamic";
import { PathologyFormPDF } from "@/components/pdf/PathologyFormPDF";

const PDFViewer = dynamic(() => import("@react-pdf/renderer").then(mod => mod.PDFViewer), {
    ssr: false,
    loading: () => <div className="h-screen flex items-center justify-center text-slate-500">PDF Oluşturuluyor...</div>
});

interface MriData {
    pirads: string;
    lezyonYeri: string;
    lezyonBoyut: string;
    mriVar: boolean;
}

interface ProstatData {
    width: string;
    height: string;
    length: string;
    volume: string; // From TRUS form directly
}

interface PsaRecord {
    tarih: string;
    sonuc: string;
}

function PathologyFormContent() {
    const searchParams = useSearchParams();

    // Parse patientId safely
    const patientIdRaw = searchParams.get("patientId");
    const patientId = patientIdRaw ? patientIdRaw : null;

    const biopsyCount = Number(searchParams.get("count")) || 12;
    const biopsyDateStr = searchParams.get("date");

    // MRI/PIRADS data
    const mriData: MriData = {
        pirads: searchParams.get("pirads") || '',
        lezyonYeri: searchParams.get("lezyonYeri") || '',
        lezyonBoyut: searchParams.get("lezyonBoyut") || '',
        mriVar: searchParams.get("mriVar") === 'true'
    };

    // Prostate dimensions and volume
    const prostatData: ProstatData = {
        width: searchParams.get("prostatW") || '',
        height: searchParams.get("prostatH") || '',
        length: searchParams.get("prostatL") || '',
        volume: searchParams.get("prostatVolum") || ''
    };

    const [patient, setPatient] = useState<Patient | null>(null);
    const [template, setTemplate] = useState<any[]>([]);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [psaHistory, setPsaHistory] = useState<PsaRecord[]>([]);
    const [rektalTuse, setRektalTuse] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Validate patientId first
                if (!patientId) {
                    setError("Hasta ID bulunamadı. URL'de patientId parametresi eksik.");
                    setLoading(false);
                    return;
                }

                // Load data in parallel
                const [settingsList, patientData, biopsyTemplates] = await Promise.all([
                    api.settings.getAll(),
                    api.patients.get(patientId),
                    api.definitions.biyopsiSablonlari.list()
                ]);

                // Load settings
                const settingsMap = settingsList.reduce((acc, curr) => {
                    acc[curr.key] = curr.value || "";
                    return acc;
                }, {} as Record<string, string>);
                setSettings(settingsMap);

                // Set biopsy templates
                setTemplate(biopsyTemplates);

                // Load patient
                setPatient(patientData);

                // Load latest examination for Rektal Tuse
                try {
                    const exams = await api.clinical.getMuayeneler(patientId);
                    if (exams && exams.length > 0) {
                        // Sort by date descending
                        const sortedExams = exams.sort((a, b) => {
                            const dateA = a.tarih ? new Date(a.tarih).getTime() : 0;
                            const dateB = b.tarih ? new Date(b.tarih).getTime() : 0;
                            return dateB - dateA;
                        });

                        // Find first exam with rektal tuse data
                        const examWithTuse = sortedExams.find(e => e.rektal_tuse && e.rektal_tuse.trim().length > 0);
                        if (examWithTuse) {
                            setRektalTuse(examWithTuse.rektal_tuse || '');
                        }
                    }
                } catch (e) {
                    console.error("Failed to load examinations", e);
                }

                // Load PSA history from lab data - ONLY PSA (Total), not PSA Free etc.
                try {
                    const labData = await api.clinical.getLabs(patientId, 'genel');
                    if (Array.isArray(labData)) {
                        // Filter strictly for PSA (Total) - exclude Free PSA, PSA/Free ratio, etc.
                        const psaRecords = labData
                            .filter((lab: any) => {
                                if (!lab.tetkik_adi) return false;
                                const name = lab.tetkik_adi.toLowerCase();
                                // Include only PSA Total, exclude Free PSA, PSA ratio, etc.
                                return (name === 'psa' ||
                                    name === 'psa (total)' ||
                                    name === 'psa total' ||
                                    name === 'total psa') &&
                                    !name.includes('free') &&
                                    !name.includes('serbest') &&
                                    !name.includes('ratio') &&
                                    !name.includes('oran');
                            })
                            .map((lab: any) => ({
                                tarih: lab.tarih,
                                sonuc: lab.sonuc || lab.deger || '-'
                            }))
                            .sort((a: PsaRecord, b: PsaRecord) =>
                                new Date(b.tarih).getTime() - new Date(a.tarih).getTime()
                            )
                            .slice(0, 10); // Limit to last 10 results
                        setPsaHistory(psaRecords);
                    }
                } catch (e) {
                    console.error("Failed to load PSA history", e);
                }
            } catch (err: any) {
                console.error("Print data loading failed", err);
                setError(`Hasta bilgisi yüklenemedi: ${err.message || 'Bilinmeyen hata'}`);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [patientId]);

    useEffect(() => {
        if (patient) {
            document.title = `${patient.ad}_${patient.soyad}_Patoloji_Form`;
        }
    }, [patient]);

    const biopsyDate = biopsyDateStr ? new Date(biopsyDateStr) : new Date();

    if (loading) return <div className="p-10 font-sans text-sm text-slate-500 animate-pulse">Yükleniyor...</div>;
    if (error) return <div className="p-10 font-sans text-sm text-red-500">{error}</div>;
    if (!patient) return <div className="p-10 font-sans text-sm text-red-500">Hasta bilgisi bulunamadı.</div>;

    return (
        <div className="bg-slate-100 min-h-screen flex flex-col">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-black text-xs">PAT</div>
                    <div className="font-bold text-slate-700">Patoloji İstek Formu</div>
                    <span className="text-sm text-slate-500">({biopsyCount} kor biyopsi)</span>
                </div>
                <button
                    onClick={() => window.close()}
                    className="bg-rose-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-rose-700 transition"
                >
                    KAPAT
                </button>
            </div>

            <div className="flex-1 w-full h-full relative">
                <PDFViewer style={{ width: '100%', height: 'calc(100vh - 70px)', border: 'none' }} showToolbar={true}>
                    <PathologyFormPDF
                        patient={patient}
                        biopsyCount={biopsyCount}
                        biopsyDate={biopsyDate}
                        template={template}
                        settings={settings}
                        mriData={mriData}
                        psaHistory={psaHistory}
                        prostatData={prostatData}
                        rektalTuse={rektalTuse}
                    />
                </PDFViewer>
            </div>
        </div>
    );
}

export default function PathologyFormPrintPage() {
    return (
        <Suspense fallback={<div className="p-10 font-sans text-sm text-slate-500 animate-pulse">Yükleniyor...</div>}>
            <PathologyFormContent />
        </Suspense>
    );
}
