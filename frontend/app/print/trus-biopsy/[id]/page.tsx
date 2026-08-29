"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, TrusBiyopsi, Patient } from "@/lib/api";
import dynamic from "next/dynamic";
import { TrusBiopsyPDF } from "@/components/pdf/TrusBiopsyPDF";

const PDFViewer = dynamic(() => import("@react-pdf/renderer").then(mod => mod.PDFViewer), {
    ssr: false,
    loading: () => <div className="h-screen flex items-center justify-center text-slate-500">PDF Oluşturuluyor...</div>
});

export default function TrusBiopsyPrintPage() {
    const params = useParams();
    const id = String(params.id);

    const [trus, setTrus] = useState<TrusBiyopsi | null>(null);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [biopsyTemplates, setBiopsyTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [settingsList, trusData, templates] = await Promise.all([
                    api.settings.getAll(),
                    api.clinical.getTrusBiopsy(id),
                    api.definitions.biyopsiSablonlari.list()
                ]);

                const settingsMap = settingsList.reduce((acc, curr) => {
                    acc[curr.key] = curr.value || "";
                    return acc;
                }, {} as Record<string, string>);
                setSettings(settingsMap);
                setTrus(trusData);
                setBiopsyTemplates(templates);

                if (trusData && trusData.hasta_id) {
                    const patientData = await api.patients.get(trusData.hasta_id);
                    setPatient(patientData);
                }
            } catch (error) {
                console.error("Print data loading failed", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) loadData();
    }, [id]);

    useEffect(() => {
        if (patient && trus) {
            document.title = `${patient.ad}${patient.soyad}-Patoloji-Istek`;
        }
    }, [patient, trus]);

    if (loading) return <div className="p-10 font-sans text-sm text-slate-500 animate-pulse">Yükleniyor...</div>;
    if (!trus || !patient) return <div className="p-10 font-sans text-sm text-red-500">Kayıt bulunamadı.</div>;

    return (
        <div className="bg-slate-100 min-h-screen flex flex-col">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs">TRUS</div>
                    <div className="font-bold text-slate-700">Patoloji İstek Formu</div>
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
                    <TrusBiopsyPDF trus={trus} patient={patient} settings={settings} biopsyTemplates={biopsyTemplates} />
                </PDFViewer>
            </div>
        </div>
    );
}
