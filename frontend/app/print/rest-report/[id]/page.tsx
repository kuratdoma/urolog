"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, RestReport, Patient } from "@/lib/api";
import dynamic from "next/dynamic";
import { RestReportPDF } from "@/components/pdf/RestReportPDF";

const PDFViewer = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    {
        ssr: false,
        loading: () => <div className="p-10 font-sans text-sm text-slate-500 animate-pulse">PDF Hazırlanıyor...</div>,
    }
);

export default function RestReportPrintPage() {
    const params = useParams();
    const id = String(params.id);

    const [report, setReport] = useState<RestReport | null>(null);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Load Settings first
                const settingsList = await api.settings.getAll();
                const settingsMap = settingsList.reduce((acc, curr) => {
                    acc[curr.key] = curr.value || "";
                    return acc;
                }, {} as Record<string, string>);
                setSettings(settingsMap);

                // Load Rest Report
                const reportData = await api.clinical.getRestReport(id);
                setReport(reportData);

                // Load Patient
                if (reportData.hasta_id) {
                    const patientData = await api.patients.get(reportData.hasta_id);
                    setPatient(patientData);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        if (id) loadData();
    }, [id]);

    if (loading) return <div className="p-10 font-sans text-sm text-slate-500 animate-pulse">Yükleniyor...</div>;
    if (!report || !patient) return <div className="p-10 font-sans text-sm text-red-500">Rapor bulunamadı.</div>;

    return (
        <div className="bg-slate-100 min-h-screen flex flex-col">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-black text-xs">IR</div>
                    <div className="font-bold text-slate-700">İstirahat Raporu</div>
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
                    <RestReportPDF report={report} patient={patient} settings={settings} />
                </PDFViewer>
            </div>
        </div>
    );
}
