'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api, Patient } from '@/lib/api';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { addMinutes, format, parseISO, areIntervalsOverlapping, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar as CalendarIcon, Search, X, Plus, Stethoscope, ChevronRight, AlertTriangle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useAuthStore } from '@/stores/auth-store';
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { Checkbox } from "@/components/ui/checkbox";

interface CreateAppointmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    patientId?: string;
    patientName?: string;
    appointment?: any; // Appointment object for editing
    existingAppointments?: any[]; // For collision detection
    initialStart?: Date; // Pre-fill start time when clicking on calendar slot
    initialEnd?: Date; // Pre-fill end time when dragging on calendar slot
}

export function CreateAppointmentDialog({ isOpen, onClose, patientId: propPatientId, patientName: propPatientName, appointment, existingAppointments = [], initialStart, initialEnd }: CreateAppointmentDialogProps) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const { user: currentUser } = useAuthStore();

    // --- State ---
    const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [selectedDoctorName, setSelectedDoctorName] = useState<string>("");
    const [isBlockedMode, setIsBlockedMode] = useState(false);
    const [isAllDay, setIsAllDay] = useState(false);
    const [blockedCategory, setBlockedCategory] = useState<string>('Toplantı');

    // Initial Date/Time - use passed initialStart or default to tomorrow 9:00
    const getDefaultStart = useCallback(() => {
        if (initialStart) return initialStart;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        return tomorrow;
    }, [initialStart]);

    // Use initialEnd if provided (from drag selection), otherwise add 15 minutes to start
    const getDefaultEnd = useCallback(() => {
        if (initialEnd) return initialEnd;
        return addMinutes(getDefaultStart(), 15);
    }, [initialEnd, getDefaultStart]);

    const [startDate, setStartDate] = useState<Date>(getDefaultStart);
    const [endDate, setEndDate] = useState<Date>(getDefaultEnd);

    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [services, setServices] = useState<any[]>([]);

    // Notes and Title
    const [notes, setNotes] = useState('');

    // Settings Query
    const { data: settings = [] } = useQuery({
        queryKey: ['settings'],
        queryFn: api.settings.getAll,
    });

    // Fetch Appointment Types
    const { data: randevuTurleri = [] } = useQuery({
        queryKey: ['definitions', 'randevu-turleri'],
        queryFn: () => api.definitions.randevuTurleri.list(),
    });

    // Fetch Doctors
    const { data: shardedDoctors = [] } = useQuery({
        queryKey: ['definitions', 'doktorlar'],
        queryFn: () => api.definitions.doktorlar.list(),
    });

    // Map RandevuTürleri to services
    useEffect(() => {
        if (randevuTurleri.length > 0) {
            const parsed = randevuTurleri.map(rt => ({
                id: rt.ad,
                label: rt.ad,
                duration: rt.sure,
                color: rt.renk
            }));
            setServices(parsed);
            if (!appointment && !selectedServiceId && parsed.length > 0) {
                setSelectedServiceId(parsed[0].id);
            }
        }
    }, [randevuTurleri, appointment]);

    // Map Sharded Doctors to names
    useEffect(() => {
        if (shardedDoctors.length > 0) {
            const docNames = shardedDoctors.map(d => d.ad_soyad);
            setDoctors(docNames);
            if (!appointment && !selectedDoctorName && docNames.length > 0) {
                // Try to match current user
                const currentUserFullName = currentUser?.full_name;
                const matched = docNames.find(name => name.toLowerCase().includes(currentUserFullName?.toLowerCase() || ''));
                setSelectedDoctorName(matched || docNames[0]);
            }
        }
    }, [shardedDoctors, appointment, currentUser]);

    const [doctors, setDoctors] = useState<string[]>([]);

    // Fetch Doctors
    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: api.auth.getUsers,
    });

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        onSave: () => {
            if (isOpen) {
                handleSubmit();
            }
        },
        onSearch: () => {
            if (isOpen) {
                const searchInput = document.querySelector('input[placeholder="İsim, TC No veya Telefon ile ara..."]') as HTMLInputElement;
                if (searchInput) {
                    searchInput.focus();
                }
            }
        }
    });

    // Pre-fill for Edit Mode
    useEffect(() => {
        if (isOpen && appointment) {
            setIsBlockedMode(appointment.status === 'blocked');

            if (appointment.hasta) {
                setSelectedPatient({ id: String(appointment.hasta.id), name: `${appointment.hasta.ad} ${appointment.hasta.soyad}` });
            } else {
                setSelectedPatient(null);
            }

            if (appointment.start) {
                setStartDate(typeof appointment.start === 'string' ? parseISO(appointment.start) : appointment.start);
            }
            if (appointment.end) {
                setEndDate(typeof appointment.end === 'string' ? parseISO(appointment.end) : appointment.end);
            }

            if (appointment.type) {
                const matched = services.find(s => s.id === appointment.type || s.label === appointment.type);
                if (matched) setSelectedServiceId(matched.id);
                else setSelectedServiceId(appointment.type);
            }

            if (appointment.notes) {
                setNotes(appointment.notes);
            }

            if (appointment.doctor_name) {
                setSelectedDoctorName(appointment.doctor_name);
            } else if (appointment.doctor?.full_name) {
                setSelectedDoctorName(appointment.doctor.full_name);
            } else if (appointment.doctor_id && users.length > 0) {
                const u = users.find((x: any) => x.id === appointment.doctor_id);
                if (u) setSelectedDoctorName(u.full_name || u.username);
            }

        } else if (isOpen && !appointment) {
            if (propPatientId && propPatientName) {
                setSelectedPatient({ id: propPatientId, name: propPatientName });
            } else {
                setSelectedPatient(null);
            }
            setNotes('');
            setIsBlockedMode(false);

            // Check if initial range spans multiple days for Auto-AllDay
            const dragDurationHours = initialStart && initialEnd ? (initialEnd.getTime() - initialStart.getTime()) / (1000 * 60 * 60) : 0;
            setIsAllDay(dragDurationHours > 20); // If more than 20 hours selected, assume all-day

            // Use initialStart if provided (from calendar slot click), else default to tomorrow 9:00
            const defaultStart = initialStart || (() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(9, 0, 0, 0);
                return tomorrow;
            })();
            setStartDate(defaultStart);

            // RESPECT initialEnd if it exists (from drag-selection), otherwise default duration
            if (initialEnd) {
                setEndDate(initialEnd);
            } else {
                setEndDate(addMinutes(defaultStart, 15));
            }
        }
    }, [isOpen, appointment, propPatientId, propPatientName, users, services, doctors, initialStart, initialEnd]);


    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const { data: searchResults = [] } = useQuery<Patient[]>({
        queryKey: ['patients', 'search', debouncedQuery],
        queryFn: () => api.patients.list({ search: debouncedQuery, limit: 5 }),
        enabled: debouncedQuery.length > 1 && searchOpen,
    });

    // Update End Date when Start Date or Service changes
    useEffect(() => {
        // Only auto-update duration if:
        // 1. We are NOT in blocked mode (blocks are manual duration)
        // 2. This is NOT an existing appointment being edited
        // 3. The user has NOT made a manual drag selection on the calendar (respect the drag)
        const isManualDrag = initialStart && initialEnd && (initialEnd.getTime() - initialStart.getTime() > 0);

        if (!isBlockedMode && !appointment && !isManualDrag) {
            const service = services.find(s => s.id === selectedServiceId);
            const duration = service ? service.duration : 15;
            setEndDate(addMinutes(startDate, duration));
        }
    }, [startDate, selectedServiceId, isBlockedMode, appointment, services, initialStart, initialEnd]);

    // Collision Detection Logic
    const collisionWarning = useMemo(() => {
        if (!startDate || !endDate || !selectedDoctorName) return null;

        const newStart = isBlockedMode && isAllDay ? startOfDay(startDate) : startDate;
        const newEnd = isBlockedMode && isAllDay ? endOfDay(endDate) : endDate;

        const doctorAppointments = existingAppointments.filter(apt => {
            if (apt.doctor_name !== selectedDoctorName) return false;
            if (appointment && apt.id === appointment.id) return false;
            if (apt.status === 'cancelled') return false;
            return true;
        });

        const collision = doctorAppointments.find(apt => {
            const aptStart = typeof apt.start === 'string' ? parseISO(apt.start) : apt.start;
            let aptEnd = typeof apt.end === 'string' ? parseISO(apt.end) : apt.end;
            if (!aptEnd) aptEnd = addMinutes(aptStart, 15);

            return areIntervalsOverlapping(
                { start: newStart, end: newEnd },
                { start: aptStart, end: aptEnd }
            );
        });

        return collision;
    }, [startDate, endDate, selectedDoctorName, isBlockedMode, isAllDay, existingAppointments, appointment]);


    // Mutations
    const mutationFn = async (data: any) => {
        if (appointment) {
            return api.appointments.update(appointment.id, data);
        } else {
            return api.appointments.create(data);
        }
    };

    const createAppointmentMutation = useMutation({
        mutationFn: mutationFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success(appointment ? 'Randevu güncellendi' : 'Randevu oluşturuldu');
            onClose();
        },
        onError: (e) => {
            console.error(e);
            toast.error('İşlem başarısız');
        }
    });

    const handlePatientSelect = useCallback((patient: Patient) => {
        setSelectedPatient({ id: patient.id, name: `${patient.ad} ${patient.soyad}` });
        setSearchOpen(false);
        setSearchQuery('');
    }, []);

    const handleServiceSelect = useCallback((serviceId: string) => {
        setSelectedServiceId(serviceId);
    }, []);

    const handleDoctorSelect = useCallback((doc: string) => {
        setSelectedDoctorName(doc);
    }, []);

    const handleSubmit = () => {
        if (!isBlockedMode && !selectedPatient) {
            toast.error('Devam etmek için lütfen bir hasta seçin.');
            return;
        }

        if (isBlockedMode && blockedCategory === 'Ameliyat' && !selectedPatient) {
            toast.error('Lütfen ameliyat olacak hastayı seçin.');
            return;
        }

        if (isBlockedMode && !notes.trim()) {
            toast.error('Lütfen kapatma gerekçesini girin.');
            return;
        }

        if (startDate >= endDate && !(isBlockedMode && isAllDay)) {
            toast.error('Bitiş zamanı başlangıçtan sonra olmalıdır.');
            return;
        }

        if (collisionWarning) {
            const confirmed = window.confirm("Seçilen saatte başka bir randevu var. Yinede devam etmek istiyor musunuz?");
            if (!confirmed) return;
        }

        const finalStart = isBlockedMode && isAllDay ? startOfDay(startDate) : startDate;
        const finalEnd = isBlockedMode && isAllDay ? endOfDay(endDate) : endDate;

        const service = services.find(s => s.id === selectedServiceId);

        const finalTitle = isBlockedMode
            ? `${blockedCategory.toUpperCase()}${selectedPatient ? `: ${selectedPatient.name}` : ''}${notes ? ` - ${notes.substring(0, 30)}${notes.length > 30 ? '...' : ''}` : ''}`
            : `${selectedPatient?.name} - ${service?.label || 'Randevu'}`;

        // Format with timezone offset to prevent UTC interpretation
        const formatWithTZ = (date: Date) => {
            const offset = -date.getTimezoneOffset();
            const sign = offset >= 0 ? '+' : '-';
            const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
            const mins = String(Math.abs(offset) % 60).padStart(2, '0');
            return format(date, "yyyy-MM-dd'T'HH:mm:ss") + sign + hours + ':' + mins;
        };

        // Find doctor_id from selectedDoctorName
        const matchedDoctor = users.find((u: any) =>
            u.full_name === selectedDoctorName || u.username === selectedDoctorName
        );
        const doctorId = matchedDoctor ? matchedDoctor.id : undefined;

        createAppointmentMutation.mutate({
            hasta_id: isBlockedMode ? null : (selectedPatient?.id || null),
            title: finalTitle,
            start: formatWithTZ(finalStart),
            end: formatWithTZ(finalEnd),
            type: isBlockedMode ? 'BLOCKED' : (service ? service.id : (selectedServiceId || 'Muayene')),
            notes: notes,
            status: isBlockedMode ? 'blocked' : 'scheduled',
            doctor_name: selectedDoctorName,
            doctor_id: doctorId,
        });
    };

    const handleDateChange = (type: 'start' | 'end', d: Date | undefined) => {
        if (!d) return;
        if (type === 'start') {
            setStartDate((prev) => {
                const next = new Date(d);
                next.setHours(prev.getHours(), prev.getMinutes());
                return next;
            });
            // Also update end date to the same day (keeping its time)
            setEndDate((prev) => {
                const next = new Date(d);
                next.setHours(prev.getHours(), prev.getMinutes());
                return next;
            });
        } else {
            setEndDate((prev) => {
                const next = new Date(d);
                next.setHours(prev.getHours(), prev.getMinutes());
                return next;
            });
        }
    };

    const handleTimeChange = (type: 'start' | 'end', val: string) => {
        const [hours, minutes] = val.split(':').map(Number);
        if (type === 'start') {
            const next = new Date(startDate);
            next.setHours(hours, minutes);
            setStartDate(next);
        } else {
            const next = new Date(endDate);
            next.setHours(hours, minutes);
            setEndDate(next);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] overflow-visible">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-8">
                        <DialogTitle>{appointment ? 'Randevuyu Düzenle' : (isBlockedMode ? 'Randevu Kapat / Bloke Et' : 'Yeni Randevu Oluştur')}</DialogTitle>
                        {!appointment && (
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setIsBlockedMode(false)}
                                    className={cn(
                                        "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                        !isBlockedMode ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Randevu
                                </button>
                                <button
                                    onClick={() => setIsBlockedMode(true)}
                                    className={cn(
                                        "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                        isBlockedMode ? "bg-white shadow-sm text-red-600" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Bloke Et
                                </button>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    {isBlockedMode && (
                        <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                            <Label>Bloke Gerekçesi</Label>
                            <Select value={blockedCategory} onValueChange={setBlockedCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Gerekçe seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Ameliyat">Ameliyat</SelectItem>
                                    <SelectItem value="Toplantı">Toplantı</SelectItem>
                                    <SelectItem value="Firma Görüşmesi">Firma Görüşmesi</SelectItem>
                                    <SelectItem value="Kongre">Kongre</SelectItem>
                                    <SelectItem value="İzin">İzin</SelectItem>
                                    <SelectItem value="Eğitim">Eğitim</SelectItem>
                                    <SelectItem value="Hasta Vizit (Yatan Hasta)">Hasta Vizit (Yatan Hasta)</SelectItem>
                                    <SelectItem value="Akademik Çalışma">Akademik Çalışma</SelectItem>
                                    <SelectItem value="Hastalık/Rapor">Hastalık/Rapor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {(isBlockedMode && blockedCategory === 'Ameliyat' || !isBlockedMode) && (
                        <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                            <Label>{blockedCategory === 'Ameliyat' ? 'Hasta Seçimi (Ameliyat)' : 'Hasta'}</Label>
                            {!selectedPatient ? (
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="İsim, TC No veya Telefon ile ara..."
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setSearchOpen(true);
                                            }}
                                            className="pl-9 h-11 bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm rounded-xl"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    {searchOpen && searchQuery.length > 1 && (
                                        <div className="absolute z-[100] mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            {searchResults.length === 0 ? (
                                                <div className="p-4 text-center">
                                                    <p className="text-sm text-slate-500 mb-3">Sonuç bulunamadı.</p>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full rounded-lg border-blue-100 text-blue-600 bg-blue-50 hover:bg-blue-100"
                                                        onClick={() => {
                                                            const parts = searchQuery.trim().split(' ');
                                                            const soyad = parts.length > 1 ? parts.pop() : '';
                                                            const ad = parts.join(' ');
                                                            router.push(`/patients/create?ad=${encodeURIComponent(ad)}&soyad=${encodeURIComponent(soyad || '')}`);
                                                            setSearchOpen(false);
                                                            onClose();
                                                        }}
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" /> Yeni Hasta Oluştur
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="max-h-[300px] overflow-y-auto p-1">
                                                    {searchResults.map((patient: Patient) => (
                                                        <button
                                                            key={patient.id}
                                                            onClick={() => handlePatientSelect(patient)}
                                                            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-left group"
                                                        >
                                                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold shrink-0">
                                                                {patient.ad[0]?.toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col flex-1 truncate">
                                                                <span className="font-bold text-slate-800 text-sm">{patient.ad} {patient.soyad}</span>
                                                                <span className="text-xs text-slate-500">{patient.tc_kimlik || 'TC Belirtilmemiş'}</span>
                                                            </div>
                                                            <ChevronRight className="h-4 w-4 text-slate-300" />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-4 border border-blue-100 rounded-xl bg-blue-50/50 shadow-sm animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold italic">
                                            {selectedPatient.name[0]?.toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-900 leading-tight uppercase italic">{selectedPatient.name}</span>
                                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Seçili Hasta</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-blue-100 text-blue-400" onClick={() => {
                                        if (appointment) {
                                            toast.info("Randevu düzenlenirken hasta değiştirilemez.");
                                            return;
                                        }
                                        setSelectedPatient(null)
                                    }}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

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

                    {collisionWarning && (
                        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg animate-in slide-in-from-top-1">
                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-amber-800">
                                    {collisionWarning.status === 'blocked' ? 'Saat Bloke Edilmiş' : 'Çakışma Tespit Edildi'}
                                </span>
                                <span className="text-xs text-amber-700">
                                    Seçili saatte <b>{collisionWarning.title}</b> {collisionWarning.status === 'blocked' ? 'mevcut' : 'ile çakışıyor'}.
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label>{isBlockedMode ? 'Kapatma Gerekçesi' : 'Notlar'}</Label>
                        <Textarea
                            placeholder={isBlockedMode ? "Neden randevu verilmeyecek? (Kongre, İzin vb.)" : "Randevu notları..."}
                            className={cn("h-20", isBlockedMode && "border-red-100 bg-red-50/20 focus:ring-red-500/20")}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>İptal</Button>
                    <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]" disabled={createAppointmentMutation.isPending}>
                        {createAppointmentMutation.isPending ? 'İşleniyor...' : (appointment ? 'Güncelle' : (isBlockedMode ? 'Bloke Et' : 'Randevu Oluştur'))}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

