"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, StatusReport, Patient } from "@/lib/api";
import dynamic from "next/dynamic";
import { StatusReportPDF } from "@/components/pdf/StatusReportPDF";
import { useAuthStore } from "@/stores/auth-store";

const PDFViewer = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    {
        ssr: false,
        loading: () => <div className="p-10 font-sans text-sm text-slate-500 animate-pulse text-center">PDF Hazırlanıyor...</div>,
    }
);

export default function StatusReportPrintPage() {
    const params = useParams();
    const id = String(params.id);
    const user = useAuthStore((state) => state.user);

    const [report, setReport] = useState<StatusReport | null>(null);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const settingsList = await api.settings.getAll();
                const settingsMap = settingsList.reduce((acc, curr) => {
                    acc[curr.key] = curr.value || "";
                    return acc;
                }, {} as Record<string, string>);
                setSettings(settingsMap);

                const data = await api.clinical.getStatusReport(id);
                setReport(data);

                if (data.hasta_id) {
                    const pData = await api.patients.get(data.hasta_id);
                    setPatient(pData);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        if (id) loadData();
    }, [id]);

    if (loading) return <div className="p-10 font-sans text-sm text-slate-500 animate-pulse text-center">Yükleniyor...</div>;
    if (!report || !patient) return <div className="p-10 font-sans text-sm text-red-500 text-center">Rapor bulunamadı.</div>;

    return (
        <div className="bg-slate-100 min-h-screen flex flex-col">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs">TR</div>
                    <div className="font-bold text-slate-700">Durum Bildirir Raporu</div>
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
                    <StatusReportPDF
                        report={report}
                        patient={patient}
                        settings={settings}
                        doctorName={user?.full_name || ""}
                    />
                </PDFViewer>
            </div>
        </div>
    );
}
