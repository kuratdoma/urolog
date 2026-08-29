"use client";

import { useEffect, useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Printer } from "lucide-react";
import { api } from "@/lib/api";
import dynamic from "next/dynamic";
import { PrescriptionPDF } from "@/components/pdf/PrescriptionPDF";

// Dynamic import for PDFViewer to avoid SSR issues
const PDFViewer = dynamic(() => import("@react-pdf/renderer").then(mod => mod.PDFViewer), {
    ssr: false,
    loading: () => <div className="h-screen flex items-center justify-center text-slate-500">PDF Oluşturuluyor...</div>
});

interface DrugItem {
    name: string;
    boxQty: string;
    dose: string;
    period: string;
    usage: string;
    description: string;
}

interface PrescriptionData {
    patient: any;
    doctor: any;
    drugs: DrugItem[];
    date: string;
    note: string;
}

export default function PrescriptionPrintPage() {
    const [data, setData] = useState<PrescriptionData | null>(null);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = () => {
            try {
                // 1. Get Settings
                api.settings.getAll()
                    .then(settingsList => {
                        const settingsMap = settingsList.reduce((acc: any, curr: any) => {
                            acc[curr.key] = curr.value || "";
                            return acc;
                        }, {} as Record<string, string>);
                        setSettings(settingsMap);
                    })
                    .catch(err => console.error("Settings load error", err));

                // 2. Get Prescription Draft from LocalStorage
                const draft = localStorage.getItem("print_prescription_draft");
                if (draft) {
                    setData(JSON.parse(draft));
                }
            } catch (error) {
                console.error("Print data loading failed", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    useEffect(() => {
        if (data && data.patient) {
            const dateStr = data.date || format(new Date(), 'yyyy-MM-dd');
            const adSoyad = `${data.patient.ad}${data.patient.soyad}`.replace(/\s+/g, '');
            document.title = `${adSoyad}-${dateStr}-Recete`;
        }
    }, [data]);

    if (loading) return <div className="p-10 font-sans text-sm text-slate-500 animate-pulse">Yükleniyor...</div>;
    if (!data || !data.patient) return <div className="p-10 font-sans text-sm text-red-500">Reçete verisi bulunamadı.</div>;

    return (
        <div className="bg-slate-100 min-h-screen flex flex-col">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs">R</div>
                    <div className="font-bold text-slate-700">Reçete Yazdır</div>
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
                    <PrescriptionPDF data={data} settings={settings} />
                </PDFViewer>
            </div>
        </div>
    );
}
