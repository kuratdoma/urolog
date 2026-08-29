"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import dynamic from "next/dynamic";
import { ReceiptPDF } from "@/components/pdf/ReceiptPDF";

const PDFViewer = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    {
        ssr: false,
        loading: () => <div className="p-10 font-sans text-sm text-slate-500 animate-pulse">PDF Hazırlanıyor...</div>,
    }
);

interface ReceiptData {
    patient: any;
    transaction: {
        id: number;
        tarih: string;
        aciklama: string;
        borc: number;
        alacak: number;
        hizmet_ad?: string;
        odeme_yontemi?: string;
    };
    doctor?: string;
}

export default function ReceiptPrintPage() {
    const [data, setData] = useState<ReceiptData | null>(null);
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

                // 2. Get Receipt Data from LocalStorage
                const draft = localStorage.getItem("print_receipt_draft");
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
            const dateStr = data.transaction.tarih || format(new Date(), 'yyyy-MM-dd');
            document.title = `Makbuz-${data.patient.ad}-${data.patient.soyad}-${dateStr}`;
        }
    }, [data]);

    if (loading) return <div className="p-10 font-sans text-sm text-slate-500 animate-pulse text-center">Yükleniyor...</div>;
    if (!data || !data.patient) return <div className="p-10 font-sans text-sm text-red-500 text-center">Veri bulunamadı.</div>;

    return (
        <div className="w-full h-screen bg-slate-100 flex flex-col">
            <div className="flex-1 w-full relative">
                <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
                    <ReceiptPDF data={data} settings={settings} />
                </PDFViewer>
            </div>
        </div>
    );
}
