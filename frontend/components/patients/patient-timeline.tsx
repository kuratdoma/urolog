import { useQuery } from '@tanstack/react-query';
import { api, TimelineItem } from '@/lib/api';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface PatientTimelineProps {
    patientId: string;
}

function safeFormatDate(date: string | Date | null | undefined): string {
    if (!date) return 'Belirsiz';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Geçersiz Tarih';
        return format(d, 'dd.MM.yyyy');
    } catch {
        return 'Hatalı Tarih';
    }
}

export function PatientTimeline({ patientId }: PatientTimelineProps) {
    const { data: timeline, isLoading, error } = useQuery({
        queryKey: ['patient-timeline', patientId],
        queryFn: () => api.patients.getTimeline(patientId),
        refetchOnWindowFocus: false,
        staleTime: 3000,
        retry: 1
    });

    const allowedTypes = [
        'examination',
        'operation',
        'followup',
        'appointment_modified',
    ];

    const filteredTimeline = timeline?.filter(item => allowedTypes.includes(item.type)) || [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>İşlem geçmişi yükleniyor...</span>
            </div>
        );
    }

    if (error) {
        console.error("Timeline loading error:", error);
        return (
            <div className="p-6 text-center space-y-2">
                <div className="text-red-500 text-sm font-semibold">İşlem geçmişi yüklenemedi.</div>
                <div className="text-slate-400 text-xs text-balance">Sunucu bağlantısı sırasında bir hata oluştu.</div>
            </div>
        );
    }

    if (filteredTimeline.length === 0) {
        return <div className="p-8 text-slate-400 text-sm text-center italic">Henüz işlem kaydı bulunmuyor.</div>;
    }

    return (
        <div className="py-1 px-1">
            <div className="relative pl-0">
                <div className="absolute left-[72px] top-3 bottom-3 w-[2px] bg-slate-100" />

                <div className="space-y-1">
                    {filteredTimeline.map((item) => (
                        <TimelineRow key={item.id} item={item} />
                    ))}
                </div>
            </div>
        </div>
    );
}

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

function TimelineRow({ item }: { item: TimelineItem }) {
    const dateStr = safeFormatDate(item.date);

    // Determine colors based on type
    const colors: Record<string, { dot: string; txt: string }> = {
        appointment: { dot: 'border-amber-400 text-amber-400', txt: 'text-amber-600' },
        appointment_cancelled: { dot: 'border-red-500 text-red-500', txt: 'text-red-600 line-through decoration-red-400' },
        appointment_modified: { dot: 'border-slate-400 text-slate-400', txt: 'text-slate-500 italic border-dashed' },
        payment: { dot: 'border-emerald-500 text-emerald-500', txt: 'text-emerald-600' },
        service: { dot: 'border-indigo-400 text-indigo-400', txt: 'text-indigo-600' },
        operation: { dot: 'border-rose-400 text-rose-400', txt: 'text-rose-600' },
        examination: { dot: 'border-blue-500 text-blue-500', txt: 'text-blue-600' },
        lab: { dot: 'border-emerald-400 text-emerald-400', txt: 'text-emerald-600' },
        lab_sperm: { dot: 'border-emerald-500 text-emerald-500', txt: 'text-emerald-700' },
        lab_urine: { dot: 'border-emerald-500 text-emerald-500', txt: 'text-emerald-700' },
        lab_urodynamic: { dot: 'border-emerald-500 text-emerald-500', txt: 'text-emerald-700' },
        lab_uroflow: { dot: 'border-emerald-500 text-emerald-500', txt: 'text-emerald-700' },
        imaging: { dot: 'border-violet-400 text-violet-400', txt: 'text-violet-600' },
        phone: { dot: 'border-orange-400 text-orange-400', txt: 'text-orange-600' },
        document: { dot: 'border-slate-400 text-slate-400', txt: 'text-slate-600' },
        photo: { dot: 'border-purple-400 text-purple-400', txt: 'text-purple-600' },
        followup: { dot: 'border-cyan-400 text-cyan-400', txt: 'text-cyan-600' },
        plan: { dot: 'border-teal-500 text-teal-500', txt: 'text-teal-600' },
        report: { dot: 'border-red-400 text-red-400', txt: 'text-red-600' },
        other: { dot: 'border-slate-300 text-slate-300', txt: 'text-slate-500' }
    };

    const style = colors[item.type] || colors.other;

    if (item.type === 'appointment_modified') {
        const isDelete = item.raw_status === 'delete';
        const shortDesc = isDelete ? 'Randevu Silindi' : 'Tarih Değişimi';
        
        const formatDateTime = (str?: string) => {
            if (!str) return 'Belirsiz';
            try {
                const cleanStr = str.replace(' ', 'T'); // handle space in timestamp
                const d = parseISO(cleanStr);
                if (isNaN(d.getTime())) return str;
                return format(d, 'd MMM yyyy HH:mm', { locale: tr });
            } catch {
                return str;
            }
        };

        const oldDate = formatDateTime(item.extra1);
        const newDate = formatDateTime(item.extra2);
        const reason = item.extra3 || 'Gerekçe belirtilmemiş';

        return (
            <div className="group flex gap-2 relative">
                {/* Left Column: Date */}
                <div className="w-[62px] text-right pt-1 shrink-0">
                    <span className="text-slate-400 text-[10px] font-bold tracking-tight">{dateStr}</span>
                </div>

                {/* Middle: Dot */}
                <div className="relative z-10 flex flex-col items-center pt-1 shrink-0">
                    <div className={clsx(
                        "w-2.5 h-2.5 rounded-full bg-white border-[2px] shadow-sm z-10",
                        style.dot
                    )} />
                </div>

                {/* Right Column: Content */}
                <div className="flex-1 pb-2 min-w-0">
                    <Popover>
                        <PopoverTrigger asChild>
                            <div className="p-1 rounded transition-colors group-hover:bg-slate-50/50 cursor-pointer">
                                <div className={clsx("text-[11px] font-semibold leading-tight hover:underline flex items-center gap-1", style.txt)}>
                                    {shortDesc}
                                    <span className="text-[8px] opacity-60 font-normal">(tıkla)</span>
                                </div>
                                <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                                    {isDelete ? `Neden: ${reason}` : `${oldDate} ➔ ${newDate}`}
                                </div>
                            </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3 bg-white border border-slate-200 rounded-xl shadow-xl z-50 text-xs text-slate-700">
                            <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 mb-2 uppercase tracking-wide text-[10px]">
                                Randevu Değişiklik Detayı
                            </h4>
                            {isDelete ? (
                                <div className="space-y-1">
                                    <div className="text-red-600 font-bold text-[11px]">Randevu İptal Edildi / Silindi</div>
                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-slate-600 italic">
                                        &ldquo;{reason}&rdquo;
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="text-blue-600 font-bold text-[11px]">Tarih / Saat Güncellendi</div>
                                    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <span className="text-slate-400 font-medium">Eski:</span>
                                        <span className="font-bold text-slate-600 line-through decoration-slate-400">{oldDate}</span>
                                        <span className="text-slate-400 font-medium">Yeni:</span>
                                        <span className="font-black text-emerald-600">{newDate}</span>
                                    </div>
                                </div>
                            )}
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        );
    }

    return (
        <div className="group flex gap-2 relative">
            {/* Left Column: Date */}
            <div className="w-[62px] text-right pt-1 shrink-0">
                <span className="text-slate-400 text-[10px] font-bold tracking-tight">{dateStr}</span>
            </div>

            {/* Middle: Dot */}
            <div className="relative z-10 flex flex-col items-center pt-1 shrink-0">
                <div className={clsx(
                    "w-2.5 h-2.5 rounded-full bg-white border-[2px] shadow-sm z-10",
                    style.dot
                )} />
            </div>

            {/* Right Column: Content */}
            <div className="flex-1 pb-2 min-w-0">
                <div className="p-1 rounded transition-colors group-hover:bg-slate-50/50">
                    <div className={clsx("text-[11px] font-semibold leading-tight truncate", style.txt)}>
                        {item.description || item.title}
                    </div>
                    {item.personnel && (
                        <div className="text-[9px] text-slate-400 mt-0.5 truncate">Dr. {item.personnel}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
