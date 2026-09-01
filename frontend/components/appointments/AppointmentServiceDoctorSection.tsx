import React from 'react';
import { Stethoscope, User } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

interface AppointmentServiceDoctorSectionProps {
    isBlockedMode: boolean;
    services: any[];
    selectedServiceId: string;
    handleServiceSelect: (serviceId: string) => void;
    doctors: string[];
    selectedDoctorName: string;
    handleDoctorSelect: (doctorName: string) => void;
}

export function AppointmentServiceDoctorSection({
    isBlockedMode,
    services,
    selectedServiceId,
    handleServiceSelect,
    doctors,
    selectedDoctorName,
    handleDoctorSelect,
}: AppointmentServiceDoctorSectionProps) {
    return (
        <div className="grid gap-3">
            {!isBlockedMode && (
                <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                    <Label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Randevu Tipi</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {services.map((s) => {
                            const isSelected = selectedServiceId === s.id;
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    className={cn(
                                        "relative flex flex-col items-center justify-center p-1.5 h-auto min-h-[48px] rounded-xl border text-center transition-all duration-200 outline-none",
                                        isSelected
                                            ? "bg-white shadow-md border-transparent ring-2 ring-offset-0 z-10"
                                            : "bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                                    )}
                                    style={{
                                        borderColor: isSelected ? s.color : undefined,
                                        boxShadow: isSelected ? `0 4px 12px -4px ${s.color}40` : undefined,
                                        backgroundColor: isSelected ? `${s.color}08` : undefined
                                    }}
                                    onClick={() => handleServiceSelect(s.id)}
                                >
                                    <span
                                        className={cn("text-[11px] font-bold leading-tight block w-full truncate", isSelected ? "" : "text-slate-700")}
                                        style={{ color: isSelected ? s.color : undefined }}
                                    >
                                        {s.label}
                                    </span>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">
                                        {s.duration} dk
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid gap-1.5">
                <Label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                    Hekim
                </Label>
                <Select
                    value={selectedDoctorName || (doctors.length > 0 ? doctors[0] : "")}
                    onValueChange={handleDoctorSelect}
                >
                    <SelectTrigger className="h-11 bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 rounded-xl font-medium text-slate-800">
                        <div className="flex items-center gap-2 truncate">
                            <User className="w-4 h-4 text-blue-500 shrink-0" />
                            <SelectValue placeholder="Hekim seçiniz" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        {doctors.map((doc: string) => (
                            <SelectItem key={doc} value={doc} className="text-sm font-medium">
                                {doc}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
