"use client";

import { Patient } from "@/lib/api";
import Link from "next/link";
import { format, differenceInYears, parseISO } from "date-fns";
import { useState } from "react";
import { Phone } from "lucide-react";
import { PhoneCallsDialog } from "./phone-calls-dialog";
import { PrivateNotesDialog } from "./private-notes-dialog";
import { useAuthStore } from "@/stores/auth-store";

interface PatientHeaderProps {
    patient: Patient | null;
    moduleName: string;
    moduleSubtitle?: string;
}

export function PatientHeader({ patient, moduleName, moduleSubtitle }: PatientHeaderProps) {
    const [isPhoneOpen, setIsPhoneOpen] = useState(false);
    const getUserRole = useAuthStore((state) => state.getUserRole);
    const role = getUserRole();
    
    if (!patient) return null;

    const initials = `${patient.ad?.charAt(0) || ''}${patient.soyad?.charAt(0) || ''}`;
    const age = patient.dogum_tarihi ? differenceInYears(new Date(), parseISO(patient.dogum_tarihi)) : '';

    return (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm relative z-30">
            {/* Left: Patient Info */}
            <div className="flex items-center gap-4 min-w-[200px]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-lg font-bold text-red-600 shrink-0">
                    {initials}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <Link href={`/patients/${patient.id}`} className="hover:underline decoration-slate-300 underline-offset-4 transition-all">
                            <h2 className="text-lg font-bold text-slate-900 leading-none whitespace-nowrap">
                                {patient.ad} {patient.soyad}
                            </h2>
                        </Link>
                        {patient.protokol_no && (
                            <PrivateNotesDialog 
                                patientId={String(patient.id)}
                                protocolNo={String(patient.protokol_no)}
                                autoShow={moduleName === "Tıbbi Muayene"}
                            />
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="font-mono text-slate-500">TC: <span className="text-slate-700">{patient.tc_kimlik}</span></span>
                        <span className="text-slate-300">•</span>
                        <span>
                            {patient.dogum_tarihi ? format(parseISO(patient.dogum_tarihi), 'dd.MM.yyyy') : ''}
                            {age && <span className="text-slate-400 font-normal ml-1">({age} yaş)</span>}
                        </span>
                        <div className="flex items-center gap-2">
                            {moduleName === "Tıbbi Muayene" && (
                                <>
                                    <span className="text-slate-300">•</span>
                                    {patient.referans && (
                                        <span className="bg-slate-700 text-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0">
                                            {patient.referans}
                                        </span>
                                    )}
                                </>
                            )}
                            
                            {(['ADMIN', 'DOCTOR'] as string[]).includes(role) && (
                                <button
                                    onClick={() => setIsPhoneOpen(true)}
                                    className="flex items-center justify-center text-red-600 hover:text-red-700 transition-all active:scale-90 ml-1"
                                    title="Telefon Görüşmeleri"
                                >
                                    <Phone className="w-6 h-6 fill-red-100 stroke-[2.5]" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Module Info */}
            <div className="flex flex-col items-end min-w-[200px]">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">MODÜL</span>
                <div className="text-base font-bold text-slate-700 leading-tight">
                    {moduleName}
                </div>
                {moduleSubtitle && <div className="text-xs text-slate-400 mt-0.5">{moduleSubtitle}</div>}
            </div>

            <PhoneCallsDialog
                open={isPhoneOpen}
                onOpenChange={setIsPhoneOpen}
                patient={patient}
            />
        </div>
    );
}
