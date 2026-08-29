"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, Imaging, Patient } from "@/lib/api";
import dynamic from "next/dynamic";
import { ImagingPDF } from "@/components/pdf/ImagingPDF";
import { format, parseISO } from "date-fns";

const PDFViewer = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    {
        ssr: false,
        loading: () => <div className="p-10 font-sans text-sm text-slate-500 animate-pulse">PDF Hazırlanıyor...</div>,
    }
);

export default function ImagingPrintPage() {
    const params = useParams();
    const id = String(params.id);

    const [imaging, setImaging] = useState<Imaging | null>(null);
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

                const data = await api.clinical.getImaging(id);
                setImaging(data);

                if (data.hasta_id) {
                    const patientData = await api.patients.get(data.hasta_id);
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
        if (patient && imaging) {
            const dateStr = imaging.tarih ? format(parseISO(imaging.tarih), 'yyyy-MM-dd') : 'Tarihsiz';
            const adSoyad = `${patient.ad}${patient.soyad}`.replace(/\s+/g, '');
            document.title = `${adSoyad}-${dateStr}-Goruntuleme`;
        }
    }, [patient, imaging]);

    if (loading) return <div className="p-10 font-sans text-sm text-slate-500 animate-pulse text-center">Yükleniyor...</div>;
    if (!imaging || !patient) return <div className="p-10 font-sans text-sm text-red-500 text-center">Kayıt bulunamadı.</div>;

    return (
        <div className="bg-slate-100 min-h-screen flex flex-col">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs">G</div>
                    <div className="font-bold text-slate-700">Görüntüleme Raporu Yazdır</div>
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
                    <ImagingPDF imaging={imaging} patient={patient} settings={settings} />
                </PDFViewer>
            </div>
        </div>
    );
}
