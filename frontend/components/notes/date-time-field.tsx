'use client';

import { format, addDays, addWeeks, addMonths, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const TIME_OPTIONS = Array.from({ length: 96 }).map((_, i) => {
    const h = Math.floor(i / 4);
    const m = (i % 4) * 15;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
});

const DATE_PRESETS: { label: string; getDate: () => Date }[] = [
    { label: 'Bugün', getDate: () => new Date() },
    { label: 'Yarın', getDate: () => addDays(new Date(), 1) },
    { label: 'Bu hafta', getDate: () => addDays(new Date(), 3) },
    { label: '1 hafta sonra', getDate: () => addWeeks(new Date(), 1) },
    { label: '1 ay sonra', getDate: () => addMonths(new Date(), 1) },
];

// Mesai saatleri içinde (09:00-18:00) hızlı saat seçimi.
const TIME_PRESETS: { label: string; hour: number; minute: number }[] = [
    { label: 'Sabah', hour: 9, minute: 0 },
    { label: 'Öğlen', hour: 13, minute: 0 },
    { label: 'Akşam', hour: 17, minute: 0 },
];

/** Saat seçimi 15 dk'lık dilimlerle sınırlı — bu dilime denk gelmeyen bir
 * değer (ör. eski datetime-local girişinden kalan 22:37) Select'te boş
 * görünür. En yakın 15 dk'ya yuvarlayarak her zaman geçerli bir seçenek
 * gösterilmesini garanti eder. */
export function roundToNearest15(date: Date): Date {
    const rounded = new Date(date);
    const minutes = rounded.getMinutes();
    const remainder = minutes % 15;
    rounded.setMinutes(minutes - remainder + (remainder >= 8 ? 15 : 0), 0, 0);
    return rounded;
}

interface DateTimeFieldProps {
    label?: string;
    value: Date;
    onChange: (date: Date) => void;
}

export function DateTimeField({ label, value, onChange }: DateTimeFieldProps) {
    const handleDateChange = (d: Date | undefined) => {
        if (!d) return;
        const updated = new Date(d);
        updated.setHours(value.getHours(), value.getMinutes(), 0, 0);
        onChange(updated);
    };

    const handleTimeChange = (val: string) => {
        const [h, m] = val.split(':').map(Number);
        const updated = new Date(value);
        updated.setHours(h, m, 0, 0);
        onChange(updated);
    };

    const applyDatePreset = (getDate: () => Date) => {
        const preset = getDate();
        const updated = new Date(preset);
        updated.setHours(value.getHours(), value.getMinutes(), 0, 0);
        onChange(updated);
    };

    const applyTimePreset = (hour: number, minute: number) => {
        const updated = new Date(value);
        updated.setHours(hour, minute, 0, 0);
        onChange(updated);
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
                {DATE_PRESETS.map((preset) => {
                    const active = isSameDay(preset.getDate(), value);
                    return (
                        <Button
                            key={preset.label}
                            type="button"
                            size="sm"
                            className={cn(
                                'h-7 px-2 text-xs',
                                active
                                    ? 'bg-gray-700 text-white hover:bg-gray-700'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            )}
                            onClick={() => applyDatePreset(preset.getDate)}
                        >
                            {preset.label}
                        </Button>
                    );
                })}
            </div>
            <div className="flex flex-wrap gap-1.5">
                {TIME_PRESETS.map((preset) => {
                    const active = value.getHours() === preset.hour && value.getMinutes() === preset.minute;
                    return (
                        <Button
                            key={preset.label}
                            type="button"
                            size="sm"
                            className={cn(
                                'h-7 px-2 text-xs',
                                active
                                    ? 'bg-gray-700 text-white hover:bg-gray-700'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            )}
                            onClick={() => applyTimePreset(preset.hour, preset.minute)}
                        >
                            {preset.label} ({String(preset.hour).padStart(2, '0')}:{String(preset.minute).padStart(2, '0')})
                        </Button>
                    );
                })}
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                    {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground')}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {value ? format(value, 'd MMMM yyyy', { locale: tr }) : <span>Tarih seçin</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 shadow-2xl">
                            <Calendar mode="single" selected={value} onSelect={handleDateChange} initialFocus locale={tr} />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="grid gap-2">
                    {label && <Label className="text-xs text-muted-foreground">Saat</Label>}
                    <Select value={format(value, 'HH:mm')} onValueChange={handleTimeChange}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="h-[200px]">
                            {TIME_OPTIONS.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
