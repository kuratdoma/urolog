'use client';

import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Views, View } from 'react-big-calendar';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon,
    User, Eye, EyeOff, LayoutPanelLeft, Layout,
    ZoomIn, ZoomOut, Plus, RefreshCw, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as MiniCalendar } from '@/components/ui/calendar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { Toggle } from "@/components/ui/toggle";

interface CalendarHeaderProps {
    date: Date;
    view: View;
    onViewChange: (view: View) => void;
    onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
    onDateSelect: (date: Date) => void;
    doctors: any[];
    selectedDoctorId: string | null;
    onDoctorChange: (doctorId: string | null) => void;
    isGhostMode: boolean;
    onGhostModeToggle: (enabled: boolean) => void;
    showSidebar: boolean;
    toggleSidebar: () => void;
    zoom: number;
    onZoomChange: (value: number) => void;
    onCreateAppointment: () => void;
    onRefresh: () => void;
    showChanges: boolean;
    onShowChangesToggle: (enabled: boolean) => void;
}

export function CalendarHeader({
    date,
    view,
    onViewChange,
    onNavigate,
    onDateSelect,
    doctors,
    selectedDoctorId,
    onDoctorChange,
    isGhostMode,
    onGhostModeToggle,
    showSidebar,
    toggleSidebar,
    zoom,
    onZoomChange,
    onCreateAppointment,
    onRefresh,
    showChanges,
    onShowChangesToggle
}: CalendarHeaderProps) {
    return (
        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-white shrink-0 shadow-sm z-20">
            <div className="flex items-center gap-4">
                {/* Navigation Controls */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-white hover:shadow-sm" onClick={() => onNavigate('PREV')}>
                        <ChevronLeft className="w-4 h-4 text-slate-500" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-3 text-[11px] font-bold text-slate-600 hover:bg-white hover:shadow-sm" onClick={() => onNavigate('TODAY')}>
                        Bugün
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-white hover:shadow-sm" onClick={() => onNavigate('NEXT')}>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                    </Button>
                </div>

                <div className="h-4 w-px bg-slate-200" />

                {/* Date Display */}
                <Popover>
                    <PopoverTrigger asChild>
                        <h1 className="text-base font-bold text-slate-900 tracking-tight cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2">
                            {format(date, 'd MMMM yyyy', { locale: tr })}
                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                        </h1>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <MiniCalendar
                            mode="single"
                            selected={date}
                            onSelect={(d) => d && onDateSelect(d)}
                            locale={tr}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                <div className="h-4 w-px bg-slate-200" />

                {/* Doctor Focus Filter */}
                <div className="flex items-center gap-2">
                    <Select value={selectedDoctorId || "all"} onValueChange={(v) => onDoctorChange(v === "all" ? null : v)}>
                        <SelectTrigger className="h-8 w-[180px] text-[11px] font-bold bg-slate-50 border-slate-200 rounded-lg">
                            <User className="w-3.5 h-3.5 mr-2 text-blue-500" />
                            <SelectValue placeholder="Tüm Hekimler" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs font-medium">Tüm Hekimler</SelectItem>
                            {doctors.map(doc => (
                                <SelectItem key={doc.id} value={String(doc.id)} className="text-xs font-medium">
                                    {doc.full_name || doc.username}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {selectedDoctorId && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-8 gap-2 px-3 text-[10px] font-bold rounded-lg border transition-all",
                                isGhostMode
                                    ? "bg-blue-50 text-blue-600 border-blue-200"
                                    : "bg-slate-50 text-slate-500 border-slate-200"
                            )}
                            onClick={() => onGhostModeToggle(!isGhostMode)}
                            title={isGhostMode ? "Sadece Fokuslanan Hekimi Göster (Filtre)" : "Diğerlerini Hayalet Olarak Göster (Bağlam)"}
                        >
                            {isGhostMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            {isGhostMode ? "HAYALET MOD" : "FİLTRE MOD"}
                        </Button>
                    )}

                    {/* Change Tracking Toggle */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-8 gap-2 px-3 text-[10px] font-bold rounded-lg border transition-all",
                            showChanges
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-50 text-slate-500 border-slate-200"
                        )}
                        onClick={() => onShowChangesToggle(!showChanges)}
                        title={showChanges ? "Değişiklikleri Gizle" : "Değişen ve Silinen Randevuları Göster"}
                    >
                        <History className="w-3.5 h-3.5" />
                        DEĞİŞİKLİKLER
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* View Selector */}
                <div className="bg-slate-100 rounded-lg p-0.5 flex">
                    {[
                        { id: Views.DAY, label: 'Gün' },
                        { id: Views.WEEK, label: 'Hafta' },
                        { id: Views.MONTH, label: 'Ay' }
                    ].map((v) => (
                        <Button
                            key={v.id}
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-7 px-4 text-[11px] font-bold transition-all rounded-md",
                                view === v.id
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                            onClick={() => onViewChange(v.id as View)}
                        >
                            {v.label}
                        </Button>
                    ))}
                </div>

                <div className="h-4 w-px bg-slate-200" />

                {/* Zoom Control - Only for Day/Week views */}
                {(view === Views.DAY || view === Views.WEEK) && (
                    <div className="flex items-center gap-2 px-2 border-l border-slate-200">
                        <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
                        <Slider
                            value={[zoom]}
                            min={60}
                            max={300}
                            step={10}
                            onValueChange={(vals) => onZoomChange(vals[0])}
                            className="w-20"
                        />
                        <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                )}

                <div className="h-4 w-px bg-slate-200" />

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        onClick={onRefresh}
                        title="Yenile"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>

                    <Button
                        onClick={onCreateAppointment}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 h-8 px-4 font-bold text-[11px] rounded-lg border-none"
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        YENİ
                    </Button>
                </div>

                <div className="h-4 w-px bg-slate-200" />

                {/* Agenda Sidebar Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-8 w-8 rounded-lg",
                        showSidebar ? "bg-blue-50 text-blue-600 shadow-none hover:bg-blue-100" : "text-slate-400"
                    )}
                    onClick={toggleSidebar}
                >
                    <LayoutPanelLeft className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
