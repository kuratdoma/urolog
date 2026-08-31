'use client';

import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Views, View } from 'react-big-calendar';
import {
    X, Check, Pencil, User, FileText, PhoneOff, Banknote, FlaskConical,
    Calendar as CalendarIcon, Phone, Stethoscope, ClipboardList, Pill
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Appointment } from '@/lib/api';
import { usePatientStore } from '@/stores/patient-store';

interface CalendarEventProps {
    event: {
        id: string;
        title: string;
        start: Date;
        end: Date;
        resource: Appointment;
    };
    view: View;
    onEdit: (apt: Appointment) => void;
    onStatusChange: (id: string, status: string) => void;
    onDelete: (id: string) => void;
    onSummary: (patientId: string, patientName: string) => void;
    onGoToPatient: (patientId: string) => void;
    onRemoveGoogle?: (id: string) => void;
    isFocused?: boolean;
    isGhosted?: boolean;
    changeStatus?: 'deleted' | 'modified' | 'history' | null;
}

export function CalendarEvent({
    event,
    view,
    onEdit,
    onStatusChange,
    onDelete,
    onSummary,
    onGoToPatient,
    onRemoveGoogle,
    isFocused,
    isGhosted,
    changeStatus
}: CalendarEventProps) {
    const router = useRouter();
    const { setActivePatient } = usePatientStore();
    const apt = event.resource;
    const [isOpen, setIsOpen] = useState(false);
    const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);

    // Status Based Styling
    const statusStyles: Record<string, string> = {
        'scheduled': 'bg-blue-100 border-blue-600 text-blue-900 hover:bg-blue-200',
        'confirmed': 'bg-emerald-100 border-emerald-600 text-emerald-900 hover:bg-emerald-200',
        'unreachable': 'bg-orange-100 border-orange-600 text-orange-900 hover:bg-orange-200',
        'cancelled': 'bg-red-100 border-red-600 text-red-900 decoration-line-through opacity-70 hover:bg-red-200',
        'completed': 'bg-slate-100 border-slate-600 text-slate-900 hover:bg-slate-200',
        'blocked': 'bg-red-50 border-red-800 text-red-900 hover:bg-red-100 font-black',
    };

    const currentStyle = statusStyles[apt.status] || statusStyles['scheduled'];

    const statusDotColor = {
        'scheduled': 'bg-red-500',
        'confirmed': 'bg-emerald-500',
        'unreachable': 'bg-orange-500',
        'cancelled': 'bg-slate-400',
        'completed': 'bg-blue-500',
        'blocked': 'bg-red-800'
    }[apt.status] || 'bg-red-500';

    const renderContent = () => {
        const timeRange = `${format(event.start, 'HH:mm')}-${format(event.end, 'HH:mm')}`;

        if (view === Views.DAY) {
            return (
                <div className="flex flex-col h-full pl-2 py-1 pr-1 border-slate-900/10 relative">
                    <div className="flex items-center justify-between mb-0.5 min-w-0">
                        <span className="text-[10px] font-black leading-none opacity-80 whitespace-nowrap bg-black/5 px-1 rounded">
                            {timeRange}
                        </span>
                        <div className="flex items-center gap-1.5 mr-1">
                            {apt.has_lab_results && (
                                <span title="Laboratuvar Sonuçları Hazır">
                                    <FlaskConical className="w-3 h-3 text-blue-500 animate-pulse" />
                                </span>
                            )}
                            {apt.payment_status === 'paid' ? (
                                <span title="Ödeme Tamamlandı">
                                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                </span>
                            ) : apt.payment_status === 'unpaid' ? (
                                <span title="Ödeme Bekliyor">
                                    <Banknote className="w-3.5 h-3.5 text-red-500 opacity-80" />
                                </span>
                            ) : null}
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                        <span className="font-bold text-[13px] truncate leading-tight uppercase tracking-tight">
                            {event.title}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
                            {apt.type && (
                                <Badge variant="secondary" className="text-[9px] h-3.5 px-1 bg-white/40 text-current border-none font-bold uppercase">
                                    {apt.type}
                                </Badge>
                            )}
                            {apt.notes && (
                                <span className="text-[9px] opacity-60 truncate italic leading-tight">
                                    - {apt.notes}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            );
        } else if (view === Views.WEEK) {
            return (
                <div className="flex flex-col justify-center h-full pl-1 overflow-hidden space-y-0.5 relative">
                    <div className="flex items-center justify-between min-w-0 pr-1">
                        <span className="text-[9px] font-bold opacity-80 whitespace-nowrap">
                            {timeRange}
                        </span>
                        <div className="flex items-center gap-1">
                            {apt.has_lab_results && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                            {apt.payment_status === 'paid' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                            {apt.payment_status === 'unpaid' && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                        </div>
                    </div>
                    <span className="font-bold text-[12px] leading-tight truncate">
                        {event.title}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                        {apt.type && (
                            <span className="text-[9px] opacity-70 leading-tight font-medium bg-white/30 px-0.5 rounded">
                                {apt.type}
                            </span>
                        )}
                    </div>
                </div>
            );
        } else {
            const statusTextColor = {
                'scheduled': 'text-slate-900',
                'confirmed': 'text-slate-900',
                'unreachable': 'text-orange-700',
                'cancelled': 'text-red-400 line-through opacity-70',
                'completed': 'text-blue-700',
                'blocked': 'text-red-900 font-black',
            }[apt.status] || 'text-slate-900';

            const doctorName = apt.doctor?.full_name || apt.doctor?.username;
            const details = [apt.type, doctorName].filter(Boolean).join(' - ');

            return (
                <div className="flex items-center h-5 w-full bg-transparent hover:bg-slate-50/80 transition-colors group/event">
                    <div className={cn("w-[2.5px] h-[14px] shrink-0 rounded-full ml-0.5", statusDotColor)} />
                    <div className={cn("flex-1 flex items-center justify-between px-1.5 min-w-0 gap-1", statusTextColor)}>
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                            <span className="font-semibold text-[10.5px] truncate leading-none">
                                {event.title}
                            </span>
                            {details && (
                                <span className="text-[9px] opacity-50 truncate leading-none font-medium">
                                    ({details})
                                </span>
                            )}
                        </div>
                        <span className="text-[9.5px] font-bold opacity-70 shrink-0 tabular-nums">
                            {format(event.start, 'HH:mm')}
                        </span>
                    </div>
                </div>
            );
        }
    };

    const handleEventClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setClickPosition({ x: e.clientX, y: e.clientY });
        setIsOpen(true);
    };

    const baseClasses = "w-full h-full cursor-pointer relative group flex flex-col transition-all overflow-hidden";
    const viewClasses = view === Views.MONTH ? "justify-center p-0.5" : "border-l-[4px] py-1 pr-1";

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverAnchor
                virtualRef={{
                    current: {
                        getBoundingClientRect: () => ({
                            width: 0,
                            height: 0,
                            top: clickPosition?.y || 0,
                            left: clickPosition?.x || 0,
                            right: clickPosition?.x || 0,
                            bottom: clickPosition?.y || 0,
                            x: clickPosition?.x || 0,
                            y: clickPosition?.y || 0,
                            toJSON: () => { }
                        }) as DOMRect
                    }
                }}
            />
            <PopoverTrigger asChild>
                <div
                    onClick={handleEventClick}
                    className={cn(
                        baseClasses,
                        viewClasses,
                        changeStatus === 'deleted'
                            ? 'bg-red-200/50 border-red-400/50 text-red-900/50 opacity-50'
                            : changeStatus === 'modified'
                                ? 'bg-amber-200/50 border-amber-400/50 text-amber-900/50 opacity-50'
                                : changeStatus === 'history'
                                    ? 'bg-slate-200/50 border-slate-400/50 text-slate-500 opacity-60 border-dashed'
                                    : currentStyle,
                        (isGhosted && !isOpen) && "opacity-30 grayscale-[0.5] scale-[0.98]",
                        isFocused && "ring-2 ring-blue-500 ring-offset-1 z-10 shadow-lg"
                    )}
                >
                    {/* Change status badge overlay */}
                    {changeStatus && (
                        <div className={cn(
                            "absolute top-0 right-0 z-10 px-1 py-0.5 text-[7px] font-black uppercase rounded-bl-md",
                            changeStatus === 'deleted'
                                ? 'bg-red-500/40 text-white'
                                : changeStatus === 'history'
                                    ? 'bg-slate-500/40 text-white'
                                    : 'bg-amber-500/40 text-white'
                        )}>
                            {changeStatus === 'deleted' ? 'SİLİNDİ' : changeStatus === 'history' ? 'GEÇMİŞ' : 'DEĞİŞTİ'}
                        </div>
                    )}
                    {renderContent()}
                </div>
            </PopoverTrigger>

            {/* data-centered: Radix'in konum sarmalayıcısı calendar.css'te ekrana
                ortalanır; tıklama noktasına göre konumlandırma devre dışı kalır. */}
            <PopoverContent
                data-centered
                className="w-[320px] max-h-[85vh] overflow-y-auto p-0 border-none shadow-2xl rounded-2xl bg-white/95 backdrop-blur-xl z-50 animate-in fade-in-0 duration-150"
                align="center"
                side="top"
                sideOffset={10}
            >
                {/* Header with Background Gradient */}
                <div className={cn(
                    "p-4 text-white relative",
                    apt.status === 'blocked' ? "bg-gradient-to-br from-red-600 to-red-800" :
                        apt.status === 'confirmed' ? "bg-gradient-to-br from-emerald-500 to-emerald-700" :
                            "bg-gradient-to-br from-blue-600 to-blue-800"
                )}>
                    <div className="flex justify-between items-start mb-3 gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <Badge variant="outline" className="text-[10px] text-white border-white/30 bg-white/10 backdrop-blur-sm uppercase px-2">
                                {apt.type || 'Randevu'}
                            </Badge>
                            {apt.hasta?.cep_tel && (
                                <a
                                    href={`tel:${apt.hasta.cep_tel}`}
                                    onClick={(e) => e.stopPropagation()}
                                    title="Ara"
                                    className="flex items-center gap-1.5 text-[11px] font-bold text-white/90 tabular-nums hover:text-white transition-colors"
                                >
                                    <Phone className="w-3 h-3 shrink-0" />
                                    {apt.hasta.cep_tel}
                                </a>
                            )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20 rounded-full"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <h3 className="text-lg font-bold leading-tight mb-1 uppercase tracking-tight line-clamp-2">
                        {apt.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] font-medium text-white/80">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {format(event.start, 'd MMMM yyyy, EEEE', { locale: tr })}
                    </div>
                </div>

                <div className="p-4 space-y-4 bg-white">
                    {/* Time & Quick Info */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Saat Aralığı</span>
                            <span className="text-sm font-black text-slate-700 tabular-nums">
                                {format(event.start, 'HH:mm')} – {format(event.end, 'HH:mm')}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setIsOpen(false);
                                onEdit(apt);
                            }}
                            className="h-8 px-3 text-[11px] font-bold text-blue-600 hover:bg-blue-50 bg-white shadow-sm border border-slate-100 rounded-lg"
                        >
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Düzenle
                        </Button>
                    </div>

                    {/* Clinical Brief Section */}
                    {apt.clinical_brief && (apt.clinical_brief.son_muayene_tani || apt.clinical_brief.son_muayene_sikayet || apt.clinical_brief.son_not_icerik || apt.clinical_brief.son_muayene_sonuc || apt.clinical_brief.son_muayene_tedavi) ? (
                        <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-100/80 space-y-2">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Önceki Geliş Özeti</span>
                            {(apt.clinical_brief.son_muayene_tani || apt.clinical_brief.son_muayene_sikayet) && (
                                <div className="flex items-start gap-2">
                                    <Stethoscope className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                        <span className="text-[9px] text-slate-400 font-semibold">
                                            {apt.clinical_brief.son_muayene_tarih
                                                ? format(new Date(apt.clinical_brief.son_muayene_tarih), 'dd.MM.yyyy', { locale: tr })
                                                : 'Son Muayene'}
                                        </span>
                                        <p className="text-[11px] text-slate-700 font-medium leading-tight">
                                            {apt.clinical_brief.son_muayene_tani || apt.clinical_brief.son_muayene_sikayet}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {apt.clinical_brief.son_muayene_sonuc && (
                                <div className="flex items-start gap-2">
                                    <ClipboardList className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                    <p className="text-[10px] text-slate-600 leading-tight line-clamp-2">{apt.clinical_brief.son_muayene_sonuc}</p>
                                </div>
                            )}
                            {apt.clinical_brief.son_muayene_tedavi && (
                                <div className="flex items-start gap-2">
                                    <Pill className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                                    <p className="text-[10px] text-slate-600 leading-tight line-clamp-2">{apt.clinical_brief.son_muayene_tedavi}</p>
                                </div>
                            )}
                            {apt.clinical_brief.son_not_icerik && (
                                <div className="flex items-start gap-2 pt-1.5 border-t border-slate-100/60">
                                    <ClipboardList className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                                    <p className="text-[10px] text-slate-500 italic leading-tight line-clamp-2">{apt.clinical_brief.son_not_icerik}</p>
                                </div>
                            )}
                        </div>
                    ) : (apt.hasta_id || apt.hasta) ? (
                        <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50/20 rounded-xl border border-slate-100/80 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
                                    İlk Başvuru / Yeni Kayıt
                                </span>
                                <Badge variant="outline" className="text-[8px] h-4 bg-blue-50 text-blue-700 border-blue-200">Yeni Hasta</Badge>
                            </div>
                            {apt.notes && (
                                <div className="bg-white/80 p-2 rounded-lg border border-slate-100">
                                    <span className="text-[9px] text-slate-400 font-semibold block mb-0.5">Randevu Notu / Şikayet:</span>
                                    <p className="text-[11px] text-slate-700 italic leading-tight">{apt.notes}</p>
                                </div>
                            )}
                            {apt.clinical_brief?.hasta_notu && (
                                <div className="bg-white/80 p-2 rounded-lg border border-slate-100">
                                    <span className="text-[9px] text-slate-400 font-semibold block mb-0.5">Hasta Kayıt Notu:</span>
                                    <p className="text-[11px] text-slate-700 italic leading-tight">{apt.clinical_brief.hasta_notu}</p>
                                </div>
                            )}
                            {!apt.notes && !apt.clinical_brief?.hasta_notu && (
                                <p className="text-[11px] text-slate-500 italic">Geçmiş muayene kaydı bulunmuyor. Yeni muayene formu başlatabilirsiniz.</p>
                            )}
                        </div>
                    ) : null}

                    {/* Actions Grid — hidden for deleted appointments */}
                    {!changeStatus && (
                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                        {apt.status !== 'blocked' && (
                            <>
                                {(() => {
                                    const pId = apt.hasta_id || apt.hasta?.id;
                                    return (
                                        <>
                                            {pId ? (
                                                <Button
                                                    onClick={() => {
                                                        setIsOpen(false);
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
                                                                id: String(pId),
                                                                ad,
                                                                soyad,
                                                            });
                                                        }
                                                        router.push(`/patients/${pId}/examination`);
                                                    }}
                                                    className="h-9 rounded-xl font-bold text-[11px] bg-blue-600 hover:bg-blue-700 text-white shadow-sm col-span-2 flex items-center justify-center gap-2"
                                                >
                                                    <Stethoscope className="w-4 h-4" />
                                                    Muayene Formunu Aç
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={() => {
                                                        setIsOpen(false);
                                                        onEdit(apt);
                                                    }}
                                                    variant="outline"
                                                    className="h-9 rounded-xl font-bold text-[11px] border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 col-span-2 flex items-center justify-center gap-2"
                                                >
                                                    <User className="w-4 h-4 text-blue-600" />
                                                    Hasta Bağla / Seç
                                                </Button>
                                            )}
                                            <Button
                                                onClick={() => {
                                                    if (pId) {
                                                        setIsOpen(false);
                                                        onGoToPatient(String(pId));
                                                    } else {
                                                        setIsOpen(false);
                                                        onEdit(apt);
                                                    }
                                                }}
                                                variant="secondary"
                                                className="h-9 rounded-xl font-bold text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-200"
                                            >
                                                <User className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                                Hasta Kartı
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    if (pId) {
                                                        setIsOpen(false);
                                                        onSummary(String(pId), apt.title);
                                                    } else {
                                                        setIsOpen(false);
                                                        onEdit(apt);
                                                    }
                                                }}
                                                variant="outline"
                                                className="h-9 rounded-xl font-bold text-[11px] border-slate-200"
                                            >
                                                <FileText className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                                                Klinik Özet
                                            </Button>
                                        </>
                                    );
                                })()}
                                <Button
                                    onClick={() => {
                                        setIsOpen(false);
                                        onStatusChange(apt.id, 'confirmed');
                                    }}
                                    className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                                >
                                    <Check className="w-3.5 h-3.5 mr-2" />
                                    Onayla
                                </Button>
                                <Button
                                    onClick={() => {
                                        setIsOpen(false);
                                        onStatusChange(apt.id, 'unreachable');
                                    }}
                                    variant="outline"
                                    className="h-9 rounded-xl border-orange-200 text-orange-700 font-bold text-[11px] hover:bg-orange-50"
                                >
                                    <PhoneOff className="w-3.5 h-3.5 mr-2" />
                                    Ulaşılamadı
                                </Button>
                                {/* Google Takvim'e ekleme kaldırıldı; daha önce
                                    senkronlanmış kayıtlar için kaldırma seçeneği kalıyor. */}
                                {apt.google_event_id && (
                                    <Button
                                        onClick={() => {
                                            setIsOpen(false);
                                            onRemoveGoogle?.(apt.id);
                                        }}
                                        variant="outline"
                                        className="h-9 rounded-xl border-red-200 text-red-700 font-bold text-[11px] hover:bg-red-50 col-span-2"
                                    >
                                        <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                                        G.Takvim&apos;den Sil
                                    </Button>
                                )}
                            </>
                        )}

                        <Button
                            onClick={() => {
                                setIsOpen(false);
                                onDelete(apt.id);
                            }}
                            variant="destructive"
                            className="h-9 rounded-xl font-bold text-[11px] shadow-sm col-span-2"
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Randevuyu Sil
                        </Button>
                    </div>
                    )}

                    {/* Info for deleted/modified appointments */}
                    {changeStatus === 'deleted' && (
                        <div className="pt-2 border-t border-red-100">
                            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Silme Gerekçesi</span>
                                <p className="text-xs font-medium text-red-700 mt-1">{apt.delete_reason || 'Gerekçe belirtilmemiş'}</p>
                            </div>
                        </div>
                    )}

                    {changeStatus === 'modified' && (
                        <div className="pt-2 border-t border-amber-100">
                            <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
                                <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">Bu randevu değiştirildi</span>
                            </div>
                        </div>
                    )}
                    
                    {changeStatus === 'history' && (
                        <div className="pt-2 border-t border-slate-100">
                            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Geçmiş Randevu Kaydı</span>
                            </div>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

import { Trash2 } from 'lucide-react';
