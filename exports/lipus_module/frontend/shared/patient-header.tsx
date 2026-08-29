"use client";

import { Patient, api } from "@/lib/api";
import Link from "next/link";
import { format, differenceInYears, parseISO } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PhoneCallsDialog } from "./phone-calls-dialog";
import { PrivateNotesDialog } from "./private-notes-dialog";
import { useAuthStore } from "@/stores/auth-store";

interface PatientHeaderProps {
    patient: Patient | null;
    moduleName: string;
    moduleSubtitle?: string;
    showSearch?: boolean;
}

interface PatientSearchProps {
    currentPatientId: string | undefined;
}

export function PatientSearch({ currentPatientId }: PatientSearchProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [ad, setAd] = useState("");
    const [soyad, setSoyad] = useState("");
    const [results, setResults] = useState<Patient[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Fetch patients when inputs change
    useEffect(() => {
        const fetchPatients = async () => {
            if (ad.length < 2 && soyad.length < 2) {
                setResults([]);
                setIsOpen(false);
                return;
            }
            try {
                const data = await api.patients.list({ ad, soyad, limit: 5 });
                setResults(data);
                setIsOpen(true);
            } catch (error) {
                console.error(error);
            }
        };

        const timeoutId = setTimeout(fetchPatients, 300);
        return () => clearTimeout(timeoutId);
    }, [ad, soyad]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (p: Patient) => {
        // We need the current patient ID to replace it, but we can extract it from pathname
        // or we can pass it as prop. Simple way: just replace the last numeric ID segment if possible,
        // or just navigate to generic patient page if regex fails.
        if (!pathname) return;

        // Assuming path format /patients/[id]/...
        // We can just construct the target path for the new patient on the same module.
        // Let's try to be smart about the current module.

        const segments = pathname.split('/');
        // finding the index of 'patients'
        const patientIndex = segments.indexOf('patients');
        if (patientIndex !== -1 && segments[patientIndex + 1]) {
            segments[patientIndex + 1] = String(p.id);
            const newPath = segments.join('/');
            router.push(newPath);
        } else {
            router.push(`/patients/${p.id}`);
        }

        // Reset search
        setAd("");
        setSoyad("");
        setIsOpen(false);
    };

    return (
        <div className="w-full relative" ref={wrapperRef}>
            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 transition-all focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 shadow-sm">
                <Search className="h-4 w-4 text-slate-400 ml-2" />

                <Input
                    placeholder="Ad Ara"
                    value={ad}
                    onChange={(e) => setAd(e.target.value)}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                    className="h-7 text-xs bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 w-full"
                />

                <div className="h-4 w-px bg-slate-300 mx-1"></div>

                <Input
                    placeholder="Soyad Ara"
                    value={soyad}
                    onChange={(e) => setSoyad(e.target.value)}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                    className="h-7 text-xs bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 w-full"
                />

                {/* Results Dropdown */}
                {isOpen && results.length > 0 && (
                    <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200 z-50">
                        <div className="bg-slate-50/50 px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Hızlı Hasta Değişimi
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-1">
                            {results.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => handleSelect(p)}
                                    className="w-full text-left flex items-center gap-3 p-2 hover:bg-slate-50 rounded-md transition-colors group"
                                >
                                    <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                                        {p.ad?.charAt(0)}{p.soyad?.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-slate-700 group-hover:text-black">{p.ad} {p.soyad}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">TC: {p.tc_kimlik || '---'}</div>
                                    </div>
                                    {p.id === currentPatientId && (
                                        <div className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Aktif</div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
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
