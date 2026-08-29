"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { Patient } from "@/lib/api/types";
import dynamic from "next/dynamic";
import { UroflowPDF } from "@/components/pdf/UroflowPDF";

const PDFViewer = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    {
        ssr: false,
        loading: () => <div className="p-10 font-sans text-sm text-slate-500 animate-pulse">PDF Hazırlanıyor...</div>,
    }
);

function UroflowPrintContent() {
    const searchParams = useSearchParams();
    const idsParam = searchParams.get("ids");
    const patientId = searchParams.get("patientId");

    const [records, setRecords] = useState<any[]>([]);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
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

                const settingsList = await api.settings.getAll();
                const settingsMap = settingsList.reduce((acc, curr) => {
                    acc[curr.key] = curr.value || "";
                    return acc;
                }, {} as Record<string, string>);
                setSettings(settingsMap);

                if (patientId) {
                    const [patientData, allUroflow] = await Promise.all([
                        api.patients.get(patientId),
                        api.clinical.getUroflowmetri(patientId),
                    ]);
                    setPatient(patientData);

                    if (idsParam) {
                        const ids = idsParam.split(",");
                        const filtered = (allUroflow as any[]).filter((r: any) => ids.includes(String(r.id)));
                        setRecords(filtered);
                    } else {
                        setRecords(allUroflow as any[]);
                    }
                }
            } catch (err) {
                console.error("Uroflow print load error:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [idsParam, patientId]);

    if (loading) return <div className="p-10 font-sans text-sm text-slate-500 animate-pulse text-center">Yükleniyor...</div>;
    if (!patient || records.length === 0) return <div className="p-10 font-sans text-sm text-red-500 text-center">Kayıt bulunamadı.</div>;

    return (
        <div className="w-full h-screen bg-slate-100 flex flex-col">
            <div className="flex-1 w-full relative">
                <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
                    <UroflowPDF records={records} patient={patient} settings={settings} />
                </PDFViewer>
            </div>
        </div>
    );
}

export default function UroflowPrintPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Yükleniyor...</div>}>
            <UroflowPrintContent />
        </Suspense>
    );
}
