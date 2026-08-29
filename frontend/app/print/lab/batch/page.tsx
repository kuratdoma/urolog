"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api, Patient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import dynamic from "next/dynamic";
import { LabBatchPDF } from "@/components/pdf/LabBatchPDF";

const PDFViewer = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    {
        ssr: false,
        loading: () => <div className="p-10 font-sans text-sm text-slate-500 animate-pulse">PDF Hazırlanıyor...</div>,
    }
);

interface LabResult {
    id: string;
    hasta_id: string;
    tarih?: string;
    tetkik_adi: string;
    sonuc: string;
    birim?: string;
    referans_araligi?: string;
    sembol?: string;
}

function LabBatchPrintContent() {
    const searchParams = useSearchParams();
    const idsParam = searchParams.get('ids');

    const [results, setResults] = useState<LabResult[]>([]);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (!idsParam) {
                setLoading(false);
                return;
            }

            try {
                // Yeni sekmede token bellekte yok — refresh cookie ile al
                if (!useAuthStore.getState().token) {
                    const { authApi } = await import("@/lib/api/auth");
                    try {
                        const data = await authApi.refresh();
                        useAuthStore.getState().setAuth(data.access_token);
                    } catch {
                        setLoading(false);
                        return;
                    }
                }

                // Settings
                const settingsList = await api.settings.getAll();
                const settingsMap = settingsList.reduce((acc, curr) => {
                    acc[curr.key] = curr.value || "";
                    return acc;
                }, {} as Record<string, string>);
                setSettings(settingsMap);

                // Fetch Labs
                const ids = idsParam.split(',');
                const promises = ids.map(id => api.clinical.getLab(id));
                const labs = (await Promise.all(promises)) as unknown as LabResult[];

                // Sort by date descending
                labs.sort((a, b) => {
                    const dateA = a.tarih ? new Date(a.tarih).getTime() : 0;
                    const dateB = b.tarih ? new Date(b.tarih).getTime() : 0;
                    return dateB - dateA;
                });

                setResults(labs);

                // Fetch Patient (using the first lab result's patient ID)
                if (labs.length > 0 && labs[0].hasta_id) {
                    const patientData = await api.patients.get(labs[0].hasta_id);
                    setPatient(patientData);
                }
            } catch (error) {
                console.error("Print data loading failed", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [idsParam]);

    if (loading) return <div className="p-10 font-sans text-sm text-slate-500 animate-pulse text-center">Yükleniyor...</div>;
    if (results.length === 0 || !patient) return <div className="p-10 font-sans text-sm text-red-500 text-center">Kayıt bulunamadı.</div>;

    return (
        <div className="w-full h-screen bg-slate-100 flex flex-col">
            <div className="flex-1 w-full relative">
                <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
                    <LabBatchPDF results={results} patient={patient} settings={settings} />
                </PDFViewer>
            </div>
        </div>
    );
}

export default function LabBatchPrintPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Yükleniyor...</div>}>
            <LabBatchPrintContent />
        </Suspense>
    );
}
