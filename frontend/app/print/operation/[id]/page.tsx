"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, Operation, Patient } from "@/lib/api";
import { format, parseISO } from "date-fns";
import dynamic from "next/dynamic";
import { OperationPDF } from "@/components/pdf/OperationPDF";

// Dynamic import for PDFViewer to avoid SSR issues
const PDFViewer = dynamic(() => import("@react-pdf/renderer").then(mod => mod.PDFViewer), {
    ssr: false,
    loading: () => <div className="h-screen flex items-center justify-center text-slate-500">PDF Oluşturuluyor...</div>
});

export default function OperationPrintPage() {
    const params = useParams();
    const id = String(params.id);

    const [operation, setOperation] = useState<Operation | null>(null);
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

                if (params.id === "preview") {
                    const temp = localStorage.getItem('temp_print_operation');
                    if (temp) {
                        const parsed = JSON.parse(temp);
                        setOperation(parsed.operation);
                        setPatient(parsed.patient);
                        setLoading(false);
                        return;
                    }
                }

                if (id !== "preview") {
                    const data = await api.clinical.getOperation(id);
                    setOperation(data);

                    if (data.hasta_id) {
                        const patientData = await api.patients.get(data.hasta_id);
                        setPatient(patientData);
                    }
                }
            } catch (error) {
                console.error("Print data loading failed", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, params.id]);

    useEffect(() => {
        if (patient && operation) {
            const dateStr = operation.tarih ? format(parseISO(operation.tarih), 'yyyy-MM-dd') : 'Tarihsiz';
            const adSoyad = `${patient.ad}${patient.soyad}`.replace(/\s+/g, '');
            document.title = `${adSoyad}-${dateStr}-Operasyon`;
        }
    }, [patient, operation]);

    if (loading) return <div className="p-10 font-sans text-sm text-slate-500 animate-pulse">Yükleniyor...</div>;
    if (!operation || !patient) return <div className="p-10 font-sans text-sm text-red-500">Kayıt bulunamadı.</div>;

    return (
        <div className="bg-slate-100 min-h-screen flex flex-col">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs">O</div>
                    <div className="font-bold text-slate-700">Operasyon Raporu Yazdır</div>
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
                    <OperationPDF operation={operation} patient={patient} settings={settings} />
                </PDFViewer>
            </div>
        </div>
    );
}
