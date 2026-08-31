'use client';

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from '@/lib/api';
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Calendar, Stethoscope, ChevronRight, Maximize2, FlaskConical, Banknote, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInYears, parseISO, format, isValid } from "date-fns";
import Link from 'next/link';
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CreateAppointmentDialog } from "../appointments/create-appointment-dialog";

function safeFormatDate(dateStr?: string | null | undefined, fmt: string = 'dd.MM.yyyy') {
    if (!dateStr) return '-';
    try {
        const date = parseISO(String(dateStr));
        if (!isValid(date)) return '-';
        return format(date, fmt);
    } catch {
        return '-';
    }
}

function safeCalculateAge(dob?: string | null | undefined) {
    if (!dob) return '-';
    try {
        const date = parseISO(String(dob));
        if (!isValid(date)) return '-';
        return differenceInYears(new Date(), date);
    } catch {
        return '-';
    }
}

export function PatientDetailPanel({ patientId, onPatientDeleted }: { patientId: string; onPatientDeleted?: () => void }) {
    const [activeTab, setActiveTab] = useState<'appointments' | 'exams'>('appointments');
    const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
    const queryClient = useQueryClient();

    // PERF: Bootstrap sorgusu - profil, muayeneler, randevular ve timeline tek istekte gelir.
    // Gelen veri tekil query cache'lerine (['patient', id], ['muayeneler', id], ['appointments', id])
    // de yazılır, böylece alt sayfalar veya sekmeler bu veriyi sıfır ağ gecikmesiyle doğrudan cache'ten alır.
    const { data: bootstrapData, isLoading: bootstrapLoading } = useQuery({
        queryKey: ['patient-bootstrap', patientId],
        queryFn: async () => {
            const data = await api.patients.getBootstrap(patientId);
            if (data.patient) {
                queryClient.setQueryData(['patient', patientId], data.patient);
            }
            if (data.muayeneler) {
                queryClient.setQueryData(['muayeneler', patientId], data.muayeneler);
            }
            if (data.appointments) {
                queryClient.setQueryData(['appointments', patientId], data.appointments);
            }
            if (data.timeline) {
                queryClient.setQueryData(['patient-timeline', patientId], data.timeline);
            }
            return data;
        },
        retry: false,
        staleTime: 30 * 1000,
    });

    const patient = bootstrapData?.patient;
    const muayeneler = bootstrapData?.muayeneler;
    const appointments = bootstrapData?.appointments;

    if (bootstrapLoading) {
        return <div className="text-center p-8">Yükleniyor...</div>;
    }

    if (!patient) return null;

    const sortedExams = muayeneler ? [...muayeneler].sort((a, b) => {
        if (!a.tarih || !b.tarih) return 0;
        return new Date(b.tarih).getTime() - new Date(a.tarih).getTime();
    }) : [];

    return (
        <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm overflow-hidden">
            {/* Dark Patient Card */}
            <div className="bg-slate-900 text-white p-5 shrink-0 relative">
                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <Link href={`/patients/${patient.id}`} className="text-slate-400 hover:text-white transition-colors">
                        <Maximize2 className="w-4 h-4" />
                    </Link>
                </div>

                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-xl font-bold">{patient.ad} {patient.soyad}</h2>
                        <div className="text-slate-400 text-sm flex items-center gap-2 mt-1">
                            {patient.protokol_no && (
                                <span className="bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border border-blue-500/30">
                                    {patient.protokol_no}
                                </span>
                            )}

                            <span className="opacity-50">•</span>
                            <span>{patient.tc_kimlik ? `TC: ${patient.tc_kimlik}` : 'TC belirtilmemiş'}</span>
                        </div>
                    </div>
                    <div className="text-right pr-6 pt-6">
                        <span className="text-xl font-bold block">
                            {safeCalculateAge(patient.dogum_tarihi)}
                        </span>
                        <span className="text-xs text-slate-500">yaş</span>
                    </div>
                </div>

                <div className="border-t border-slate-800 py-3 mb-1 space-y-2">
                    <div className="flex items-center gap-2 text-slate-300">
                        <Phone className="w-4 h-4 text-slate-500" />
                        <span className="text-sm tracking-wide">{patient.cep_tel || '-'}</span>
                    </div>
                </div>

                {/* Extra info fields from HASTA.CSV */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] text-slate-400 mb-4 border-t border-slate-800 pt-3">
                    <div className="flex flex-col">
                        <span className="text-slate-500 font-bold uppercase tracking-tighter">Doğum Yeri</span>
                        <span className="text-slate-200 truncate">{patient.dogum_yeri || '-'}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-500 font-bold uppercase tracking-tighter">Meslek</span>
                        <span className="text-slate-200 truncate">{patient.meslek || '-'}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-500 font-bold uppercase tracking-tighter">Referans</span>
                        <span className="text-slate-200 truncate text-blue-400">{patient.referans || '-'}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-500 font-bold uppercase tracking-tighter">Medeni Hal</span>
                        <span className="text-slate-200 truncate">{patient.medeni_hal || '-'}</span>
                    </div>
                    <div className="flex flex-col col-span-2">
                        <span className="text-slate-500 font-bold uppercase tracking-tighter">Doktor</span>
                        <span className="text-slate-200 truncate">{patient.doktor || '-'}</span>
                    </div>
                    {patient.kimlik_notlar && (
                        <div className="flex flex-col col-span-2 mt-1 bg-slate-800/50 p-1.5 rounded border border-slate-700">
                            <span className="text-slate-500 font-bold uppercase tracking-tighter mb-0.5">Notlar</span>
                            <span className="text-slate-300 text-[11px] leading-tight italic line-clamp-3">{patient.kimlik_notlar}</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 mb-4">
                    <span>Kayıt:</span>
                    <span>{safeFormatDate(patient.created_at)}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <Link href={`/patients/${patient.id}/examination`} className="w-full">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 font-bold text-xs">
                            <Stethoscope className="w-3.5 h-3.5 mr-1" />
                            Muayene
                        </Button>
                    </Link>
                    <Link href={`/patients/${patient.id}`} className="w-full">
                        <Button className="w-full bg-slate-100 hover:bg-white text-slate-900 border-0 font-medium text-xs">
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            Detay
                        </Button>
                    </Link>
                    <Button
                        onClick={() => setIsAppointmentDialogOpen(true)}
                        className="w-full bg-slate-100 hover:bg-white text-slate-900 border-0 font-medium text-xs"
                    >
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        Randevu
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100">
                <button
                    onClick={() => setActiveTab('appointments')}
                    className={cn(
                        "flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors flex items-center justify-center gap-2",
                        activeTab === 'appointments'
                            ? "border-orange-400 text-orange-600 bg-orange-50/10"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                >
                    <Calendar className="w-4 h-4" />
                    Randevular ({appointments?.length || 0})
                </button>
                <button
                    onClick={() => setActiveTab('exams')}
                    className={cn(
                        "flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors flex items-center justify-center gap-2",
                        activeTab === 'exams'
                            ? "border-orange-400 text-orange-600 bg-orange-50/10"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                >
                    <Stethoscope className="w-4 h-4" />
                    Muayeneler ({sortedExams.length})
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-slate-50/30 overflow-y-auto p-4">
                {activeTab === 'appointments' && (
                    <div className="space-y-2">
                        {(!appointments || appointments.length === 0) ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 mt-12">
                                <Calendar className="w-12 h-12 mb-3 text-slate-200" />
                                <span className="text-sm font-medium">Randevu bulunamadı</span>
                            </div>
                        ) : (
                            appointments.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()).map((apt) => (
                                <Card key={apt.id} className={cn(
                                    "border border-slate-200 shadow-sm transition-colors cursor-pointer group bg-white",
                                    apt.is_deleted ? "opacity-60 bg-slate-50 border-dashed" : "hover:border-orange-300"
                                )}>
                                    <CardContent className="p-3">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                                                {safeFormatDate(apt.start, 'dd.MM.yyyy HH:mm')}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {apt.is_deleted ? (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-600">
                                                        SİLİNDİ
                                                    </span>
                                                ) : (
                                                    <span className={cn(
                                                        "text-[10px] px-2 py-0.5 rounded-full font-medium",
                                                        apt.status === 'completed' ? "bg-green-100 text-green-700" :
                                                            apt.status === 'cancelled' ? "bg-red-100 text-red-700" :
                                                                "bg-blue-100 text-blue-700"
                                                    )}>
                                                        {apt.status === 'completed' ? 'Tamamlandı' :
                                                            apt.status === 'cancelled' ? 'İptal' : 'Planlandı'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-500">{apt.type}</span>
                                                {apt.notes && <span className="text-slate-400 font-normal italic">- {apt.notes}</span>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {apt.has_lab_results && (
                                                    <span className="flex items-center gap-1 text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                                                        <FlaskConical className="w-3 h-3" />
                                                        LAB
                                                    </span>
                                                )}
                                                {apt.payment_status === 'paid' && (
                                                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                                                        <Banknote className="w-3 h-3" />
                                                        ÖDENDİ
                                                    </span>
                                                )}
                                                {apt.payment_status === 'unpaid' && (
                                                    <span className="flex items-center gap-1 text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded">
                                                        <Banknote className="w-3 h-3" />
                                                        ÖDEME
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {apt.cancel_reason && (
                                            <div className="mt-1 text-[10px] text-red-500 font-medium">
                                                İptal Nedeni: {apt.cancel_reason}
                                            </div>
                                        )}
                                        {apt.delete_reason && (
                                            <div className="mt-1 text-[10px] text-slate-500 italic">
                                                Silme Nedeni: {apt.delete_reason}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'exams' && (
                    <div className="space-y-2">
                        {sortedExams.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 mt-10 space-y-3">
                                <Stethoscope className="w-10 h-10 text-slate-200 mx-auto" />
                                <span className="text-sm font-medium">Henüz muayene kaydı bulunmuyor</span>
                                <Link href={`/patients/${patient.id}/examination`}>
                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                                        <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
                                        İlk Muayeneyi Başlat
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            sortedExams.map((exam) => (
                                <Link key={exam.id} href={`/patients/${patient.id}/examination`}>
                                    <Card className="border border-slate-200 shadow-sm hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer group bg-white mb-2">
                                        <CardContent className="p-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                                                    {exam.tarih ? safeFormatDate(exam.tarih) : 'Tarihsiz'}
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                            </div>
                                            <div className="text-xs text-slate-600 line-clamp-2 pl-0">
                                                <span className="font-medium text-slate-500">Tanı / Şikayet: </span>
                                                {exam.tani1 || exam.sikayet || 'Belirtilmemiş'}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))
                        )}
                    </div>
                )}
            </div>

            <CreateAppointmentDialog
                isOpen={isAppointmentDialogOpen}
                onClose={() => setIsAppointmentDialogOpen(false)}
                patientId={patientId}
                patientName={`${patient.ad} ${patient.soyad}`}
            />
        </div>
    );
}
