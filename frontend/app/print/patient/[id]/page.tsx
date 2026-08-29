"use client";

import { useQuery } from '@tanstack/react-query';
import { api, SystemSetting } from '@/lib/api';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { PatientCardPDF } from "@/components/pdf/PatientCardPDF";

const PDFViewer = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    {
        ssr: false,
        loading: () => <div className="p-10 font-sans text-sm text-slate-500 animate-pulse">PDF Hazırlanıyor...</div>,
    }
);

export default function PatientPrintPage() {
    const params = useParams();
    const patientId = String(params.id);

    // Fetch Aggregated Report (Epic 3: Resilient Generation)
    const { data: report, isLoading: reportLoading } = useQuery({
        queryKey: ['patient-report', patientId],
        queryFn: () => api.patients.getReport(patientId),
    });

    // Fetch System Settings
    const { data: settings = [], isLoading: settingsLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: api.settings.getAll,
    });

    const settingsMap = settings.reduce((acc: Record<string, string>, curr: SystemSetting) => {
        acc[curr.key] = curr.value || "";
        return acc;
    }, {} as Record<string, string>);

    const patient = report?.demographics;
    const warnings = report?.warnings || [];

    useEffect(() => {
        if (patient) {
            document.title = `Hasta_Kimlik_${patient.ad}_${patient.soyad}`;
        }
    }, [patient]);

    if (reportLoading || settingsLoading) {
        return <div className="p-10 font-sans text-sm text-slate-500 animate-pulse text-center">Yükleniyor...</div>;
    }

    if (!patient) return <div className="p-10 text-red-500 text-center">Hasta bulunamadı {warnings.length > 0 && `(${warnings.join(', ')})`}</div>;

    return (
        <div className="w-full h-screen bg-slate-100 flex flex-col">
            {warnings.length > 0 && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 sticky top-0 z-50 shadow-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-amber-700">
                                <strong>Dikkat:</strong> Bazı veriler yüklenemedi: {warnings.join(", ")}
                            </p>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex-1 w-full relative">
                <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
                    <PatientCardPDF patient={patient} settings={settingsMap} />
                </PDFViewer>
            </div>
        </div>
    );
}
