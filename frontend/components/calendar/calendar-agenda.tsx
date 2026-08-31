'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar as CalendarIcon, X, ChevronRight, User, FlaskConical, Stethoscope, ClipboardList, Pill, Pencil, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Appointment } from '@/lib/api';
import { usePatientStore } from '@/stores/patient-store';

interface CalendarAgendaProps {
    date: Date;
    appointments: any[];
    showSidebar: boolean;
    toggleSidebar: () => void;
    onAppointmentClick?: (apt: Appointment) => void;
    onEditAppointment?: (apt: Appointment) => void;
}

/** Truncate text to maxLen characters with ellipsis */
function truncate(text: string | null | undefined, maxLen: number = 80): string {
    if (!text) return '';
    return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

export function CalendarAgenda({
    date,
    appointments,
    showSidebar,
    toggleSidebar,
    onAppointmentClick,
    onEditAppointment
}: CalendarAgendaProps) {
    const router = useRouter();
    const { setActivePatient } = usePatientStore();

    const handleCardClick = (apt: Appointment) => {
        const patientId = apt.hasta_id || apt.hasta?.id;
        if (patientId) {
            // Set active patient in global store
            if (apt.hasta) {
                setActivePatient({
                    id: String(apt.hasta.id),
                    ad: apt.hasta.ad,
                    soyad: apt.hasta.soyad,
                    tc_kimlik: apt.hasta.tc_kimlik,
                });
            } else {
                const nameParts = (apt.title || '').trim().split(' ');
                const soyad = nameParts.length > 1 ? nameParts.pop() || '' : '';
                const ad = nameParts.join(' ') || apt.title;
                setActivePatient({
                    id: String(patientId),
                    ad: ad,
                    soyad: soyad,
                });
            }
            // Navigate directly to examination form
            router.push(`/patients/${patientId}/examination`);
        } else if (onEditAppointment) {
            onEditAppointment(apt);
        } else if (onAppointmentClick) {
            onAppointmentClick(apt);
        }
    };

    return (
        <aside className={cn(
            "absolute top-0 right-0 w-[340px] bg-white h-full z-30 shadow-2xl border-l border-slate-200 flex flex-col transition-all duration-300 transform",
            showSidebar ? "translate-x-0" : "translate-x-full"
        )}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex flex-col">
                    <h3 className="font-bold text-slate-800 text-sm">Günün Ajandası</h3>
                    <span className="text-[10px] text-slate-400 font-medium">
                        {format(date, 'd MMMM EEEE', { locale: tr })}
                    </span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={toggleSidebar}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {appointments.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <CalendarIcon className="w-12 h-12 mx-auto text-slate-200 mb-4" />
                        <p className="text-sm text-slate-400">Bu gün için kayıt yok.</p>
                    </div>
                ) : (
                    appointments.map((evt) => {
                        const isPast = evt.end < new Date();
                        const isNow = evt.start <= new Date() && evt.end >= new Date();
                        const brief = evt.resource?.clinical_brief;
                        const hasPreviousBrief = brief && (brief.son_muayene_tani || brief.son_muayene_sikayet || brief.son_not_icerik || brief.son_muayene_sonuc || brief.son_muayene_tedavi);
                        const hasNotes = evt.resource.notes || brief?.hasta_notu;

                        return (
                            <div
                                key={evt.id}
                                onClick={() => handleCardClick(evt.resource)}
                                className={cn(
                                    "group flex flex-col p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-lg relative overflow-hidden",
                                    evt.resource.status === 'blocked' ? "bg-red-50 border-red-100" : (isNow ? "bg-blue-50/50 border-blue-200" : "bg-white border-slate-100 hover:border-blue-300 hover:bg-slate-50/40"),
                                    isPast && "opacity-60 bg-slate-50/50 grayscale-[0.5]"
                                )}
                            >
                                {/* Status Indicator Bar */}
                                <div className={cn(
                                    "absolute left-0 top-0 bottom-0 w-1.5",
                                    evt.resource.status === 'confirmed' ? "bg-emerald-500" :
                                        evt.resource.status === 'unreachable' ? "bg-orange-500" :
                                            evt.resource.status === 'cancelled' ? "bg-red-500" :
                                                "bg-blue-500"
                                )} />

                                <div className="flex justify-between items-start mb-2 pl-2">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 transition-colors group-hover:text-blue-600">
                                            {format(evt.start, 'HH:mm')}
                                            <ChevronRight className="w-3 h-3 text-slate-300" />
                                            {format(evt.end, 'HH:mm')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Badge variant="outline" className="text-[9px] font-bold py-0 h-4 uppercase tracking-tighter bg-white shadow-sm">
                                            {evt.resource.type || 'Muayene'}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onEditAppointment) onEditAppointment(evt.resource);
                                                else if (onAppointmentClick) onAppointmentClick(evt.resource);
                                            }}
                                            title="Randevuyu Düzenle"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pl-2 mb-2">
                                    <h4 className="font-bold text-sm text-slate-800 leading-tight uppercase tracking-tight">
                                        {(evt.resource?.hasta_id || evt.resource?.hasta?.id) ? (
                                            <Link
                                                href={`/patients/${evt.resource?.hasta_id || evt.resource?.hasta?.id}/examination`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCardClick(evt.resource);
                                                }}
                                                className="hover:text-blue-600 hover:underline transition-colors inline-block cursor-pointer"
                                                title="Muayene Formunu Aç"
                                            >
                                                {evt.title}
                                            </Link>
                                        ) : (
                                            evt.title
                                        )}
                                    </h4>
                                    {(evt.resource?.hasta_id || evt.resource?.hasta?.id) && (
                                        <Link
                                            href={`/patients/${evt.resource?.hasta_id || evt.resource?.hasta?.id}/examination`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCardClick(evt.resource);
                                            }}
                                            className="text-[10px] text-blue-600 font-semibold opacity-0 group-hover:opacity-100 hover:underline transition-opacity flex items-center gap-0.5"
                                            title="Muayene Formunu Aç"
                                        >
                                            Muayene <ChevronRight className="w-3 h-3" />
                                        </Link>
                                    )}
                                </div>

                                {/* Clinical Brief — inline compact section */}
                                {hasPreviousBrief ? (
                                    <div className="mx-2 mb-2 p-2.5 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-100/80 space-y-1.5">
                                        {/* Son Muayene — tarih + tanı */}
                                        {(brief.son_muayene_tani || brief.son_muayene_sikayet) && (
                                            <div className="flex items-start gap-1.5">
                                                <Stethoscope className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
                                                <div className="min-w-0">
                                                    <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                                                        {brief.son_muayene_tarih
                                                            ? format(new Date(brief.son_muayene_tarih), 'dd.MM.yyyy')
                                                            : 'Son Muayene'}
                                                    </span>
                                                    <p className="text-[11px] text-slate-700 font-medium leading-tight truncate">
                                                        {brief.son_muayene_tani || brief.son_muayene_sikayet}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Sonuç / Karar */}
                                        {brief.son_muayene_sonuc && (
                                            <div className="flex items-start gap-1.5">
                                                <ClipboardList className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                                                <p className="text-[10px] text-slate-600 leading-tight line-clamp-2">
                                                    {truncate(brief.son_muayene_sonuc, 80)}
                                                </p>
                                            </div>
                                        )}

                                        {/* Tedavi */}
                                        {brief.son_muayene_tedavi && (
                                            <div className="flex items-start gap-1.5">
                                                <Pill className="w-3 h-3 text-indigo-500 mt-0.5 shrink-0" />
                                                <p className="text-[10px] text-slate-600 leading-tight line-clamp-2">
                                                    {truncate(brief.son_muayene_tedavi, 80)}
                                                </p>
                                            </div>
                                        )}

                                        {/* Son Takip Notu */}
                                        {brief.son_not_icerik && (
                                            <div className="flex items-start gap-1.5 pt-1 border-t border-slate-100/60">
                                                <ClipboardList className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                                <p className="text-[10px] text-slate-500 italic leading-tight line-clamp-2">
                                                    {truncate(brief.son_not_icerik, 80)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (evt.resource?.hasta_id || evt.resource?.hasta?.id) ? (
                                    <div className="mx-2 mb-2 p-2 rounded-xl bg-slate-50/80 border border-slate-100/80 space-y-1">
                                        <div className="flex items-center gap-1.5">
                                            <Stethoscope className="w-3 h-3 text-blue-500 shrink-0" />
                                            <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">
                                                İlk Muayene / Yeni Kayıt
                                            </span>
                                        </div>
                                        {hasNotes && (
                                            <p className="text-[10px] text-slate-600 italic leading-tight line-clamp-2 pl-4">
                                                "{truncate(hasNotes, 80)}"
                                            </p>
                                        )}
                                    </div>
                                ) : null}

                                <div className="flex items-center justify-between pl-2 mt-auto">
                                    <div className="flex items-center gap-3">
                                        {evt.resource.doctor && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                                                <User className="w-3 h-3" />
                                                {evt.resource.doctor.full_name || evt.resource.doctor.username}
                                            </div>
                                        )}
                                        {evt.resource.has_lab_results && (
                                            <div className="flex items-center gap-1 text-[9px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded-full">
                                                <FlaskConical className="w-2.5 h-2.5" />
                                                LAB
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {evt.resource.payment_status === 'paid' ? (
                                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] h-5 py-0">Ödendi</Badge>
                                        ) : evt.resource.payment_status === 'unpaid' ? (
                                            <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-100 text-[10px] h-5 py-0">Ödeme Bekliyor</Badge>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </aside>
    );
}

