import React from 'react';
import { Stethoscope } from 'lucide-react';
import { Label } from '@/components/ui/label';
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
        <>
            {!isBlockedMode && (
                <div className="grid gap-3 animate-in fade-in slide-in-from-top-2">
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

            <div className="grid gap-3">
                <Label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Hekim</Label>
                <div className="flex flex-wrap gap-2">
                    {doctors.map((doc: string) => {
                        const isSelected = selectedDoctorName === doc;
                        return (
                            <button
                                key={doc}
                                type="button"
                                onClick={() => handleDoctorSelect(doc)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs font-medium",
                                    isSelected
                                        ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                )}
                            >
                                <div className={cn(
                                    "w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors",
                                    isSelected ? "border-blue-500" : "border-slate-300"
                                )}>
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Stethoscope className={cn("w-3.5 h-3.5", isSelected ? "text-blue-500" : "text-slate-400")} />
                                    <span>{doc}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
