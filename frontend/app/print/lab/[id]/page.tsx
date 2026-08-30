"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, Patient } from "@/lib/api";
import dynamic from "next/dynamic";
import { LabPDF } from "@/components/pdf/LabPDF";
import { format, parseISO } from "date-fns";

const PDFViewer = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    {
        ssr: false,
        loading: () => <div className="p-10 font-sans text-sm text-slate-500 animate-pulse">PDF Hazırlanıyor...</div>,
    }
);

export default function LabPrintPage() {
    const params = useParams();
    const id = String(params.id);

    const [lab, setLab] = useState<any | null>(null);
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

                const data = await api.clinical.getLab(id);
                setLab(data);

                if (data.hasta_id) {
                    const patientData = await api.patients.get(data.hasta_id as string);
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
        if (patient && lab) {
            const dateStr = lab.tarih ? format(parseISO(lab.tarih), 'yyyy-MM-dd') : 'Tarihsiz';
            const adSoyad = `${patient.ad}${patient.soyad}`.replace(/\s+/g, '');
            document.title = `${adSoyad}-${dateStr}-LabSonucu`;
        }
    }, [patient, lab]);

    if (loading) return <div className="p-10 font-sans text-sm text-slate-500 animate-pulse text-center">Yükleniyor...</div>;
    if (!lab || !patient) return <div className="p-10 font-sans text-sm text-red-500 text-center">Kayıt bulunamadı.</div>;

    return (
        <div className="w-full h-screen bg-slate-100 flex flex-col">
            <div className="flex-1 w-full relative">
                <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
                    <LabPDF lab={lab} patient={patient} settings={settings} />
                </PDFViewer>
            </div>
        </div>
    );
}
