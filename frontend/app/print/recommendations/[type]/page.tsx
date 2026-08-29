"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { api, Patient } from "@/lib/api";
import dynamic from "next/dynamic";
import { recommendations } from "../data";
import { RecommendationPDF } from "@/components/pdf/RecommendationPDF";

// Dynamic import for PDFViewer to avoid SSR issues
const PDFViewer = dynamic(() => import("@react-pdf/renderer").then(mod => mod.PDFViewer), {
    ssr: false,
    loading: () => <div className="h-screen flex items-center justify-center text-slate-500">PDF Oluşturuluyor...</div>
});

export default function RecommendationPrintPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const type = params.type as string;
    const patientId = searchParams.get("patientId");

    const data = recommendations[type as keyof typeof recommendations];

    useEffect(() => {
        if (patientId) {
            api.patients.get(patientId).then(setPatient).catch(console.error);
        }
        api.settings.getAll().then(list => {
            const map = list.reduce((acc: any, curr: any) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {});
            setSettings(map);
        }).catch(console.error);
    }, [patientId]);

    if (!data) return <div className="p-10">Öneri bulunamadı.</div>;

    return (
        <div className="bg-slate-100 min-h-screen flex flex-col">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs">R</div>
                    <div className="font-bold text-slate-700">{data.title} Yazdır</div>
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
                    <RecommendationPDF data={data} patient={patient} settings={settings} />
                </PDFViewer>
            </div>
        </div>
    );
}
