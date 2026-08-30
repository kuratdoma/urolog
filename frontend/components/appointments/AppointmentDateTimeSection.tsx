import React from 'react';
import { format, addMinutes } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

interface AppointmentDateTimeSectionProps {
    startDate: Date;
    setStartDate: React.Dispatch<React.SetStateAction<Date>>;
    endDate: Date;
    setEndDate: React.Dispatch<React.SetStateAction<Date>>;
    isBlockedMode: boolean;
    isAllDay: boolean;
    setIsAllDay: (val: boolean) => void;
    handleDateChange: (type: 'start' | 'end', d: Date | undefined) => void;
    handleTimeChange: (type: 'start' | 'end', val: string) => void;
}

export function AppointmentDateTimeSection({
    startDate,
    setStartDate,
    endDate,
    isBlockedMode,
    isAllDay,
    setIsAllDay,
    handleDateChange,
    handleTimeChange,
}: AppointmentDateTimeSectionProps) {
    return (
        <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
                <Label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Tarih ve Saat</Label>
                {isBlockedMode && (
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="all-day"
                            checked={isAllDay}
                            onCheckedChange={(checked) => setIsAllDay(!!checked)}
                        />
                        <label htmlFor="all-day" className="text-xs font-bold text-slate-600 cursor-pointer">Tüm Gün</label>
                    </div>
                )}
            </div>

            {/* Start Date & Time */}
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label className="text-[10px] text-slate-400">Başlangıç Tarihi</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !startDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, "d MMMM yyyy", { locale: tr }) : <span>Tarih seçin</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 shadow-2xl">
                            <Calendar
                                mode="single"
                                selected={startDate}
                                onSelect={(d) => handleDateChange('start', d)}
                                initialFocus
                                locale={tr}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                {!isAllDay && (
                    <div className="grid gap-2">
                        <Label className="text-[10px] text-slate-400">Başlangıç Saati</Label>
                        <Select
                            value={format(startDate, "HH:mm")}
                            onValueChange={(val) => handleTimeChange('start', val)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="h-[200px]">
                                {Array.from({ length: 96 }).map((_, i) => {
                                    const h = Math.floor(i / 4);
                                    const m = (i % 4) * 15;
                                    const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                    return (
                                        <SelectItem key={time} value={time}>
                                            {time}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* End Date & Time - In Blocked Mode or for manual duration */}
            {(isBlockedMode || isAllDay) && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid gap-2">
                        <Label className="text-[10px] text-slate-400">Bitiş Tarihi</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !endDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate ? format(endDate, "d MMMM yyyy", { locale: tr }) : <span>Tarih seçin</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 shadow-2xl">
                                <Calendar
                                    mode="single"
                                    selected={endDate}
                                    onSelect={(d) => handleDateChange('end', d)}
                                    initialFocus
                                    locale={tr}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    {!isAllDay && (
                        <div className="grid gap-2">
                            <Label className="text-[10px] text-slate-400">Bitiş Saati</Label>
                            <Select
                                value={format(endDate, "HH:mm")}
                                onValueChange={(val) => handleTimeChange('end', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="h-[200px]">
                                    {Array.from({ length: 96 }).map((_, i) => {
                                        const h = Math.floor(i / 4);
                                        const m = (i % 4) * 15;
                                        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                        return (
                                            <SelectItem key={time} value={time}>
                                                {time}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            )}

            {!isBlockedMode && (
                <div className="flex justify-end">
                    <Button
                        size="sm"
                        variant="secondary"
                        className="px-2 h-7 text-[10px] font-bold"
                        onClick={() => setStartDate(addMinutes(startDate, 15))}
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        15 dk Kaydır
                    </Button>
                </div>
            )}
        </div>
    );
}
