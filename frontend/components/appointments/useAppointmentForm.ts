import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { addMinutes, areIntervalsOverlapping } from 'date-fns';
import { api, Patient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

interface UseAppointmentFormProps {
    isOpen: boolean;
    onClose: () => void;
    patientId?: string;
    patientName?: string;
    appointment?: any;
    existingAppointments?: any[];
    initialStart?: Date;
    initialEnd?: Date;
}

export function useAppointmentForm({
    isOpen,
    onClose,
    patientId: propPatientId,
    patientName: propPatientName,
    appointment,
    existingAppointments = [],
    initialStart,
    initialEnd,
}: UseAppointmentFormProps) {
    const queryClient = useQueryClient();
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

    const getDefaultStart = useCallback(() => {
        if (initialStart) return initialStart;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        return tomorrow;
    }, [initialStart]);

    const getDefaultEnd = useCallback(() => {
        if (initialEnd) return initialEnd;
        return addMinutes(getDefaultStart(), 15);
    }, [initialEnd, getDefaultStart]);

    const [startDate, setStartDate] = useState<Date>(getDefaultStart);
    const [endDate, setEndDate] = useState<Date>(getDefaultEnd);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [services, setServices] = useState<any[]>([]);
    const [notes, setNotes] = useState('');

    const { data: settings = [] } = useQuery({
        queryKey: ['settings'],
        queryFn: api.settings.getAll,
    });

    const doctors = useMemo(() => {
        const docSetting = settings.find(s => s.key === 'doktorlar');
        if (docSetting && docSetting.value) {
            try {
                const parsed = JSON.parse(docSetting.value);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    }, [settings]);

    useEffect(() => {
        if (isOpen && doctors.length > 0) {
            if (appointment && appointment.doctor_name) {
                setSelectedDoctorName(appointment.doctor_name);
            } else if (!selectedDoctorName) {
                const matched = doctors.find((d: string) => d.toLowerCase() === currentUser?.full_name?.toLowerCase());
                setSelectedDoctorName(matched || doctors[0]);
            }
        }
    }, [isOpen, doctors, appointment, currentUser, selectedDoctorName]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const { data: searchResults = [] } = useQuery({
        queryKey: ['patient-search', debouncedQuery],
        queryFn: () => api.patients.list({ search: debouncedQuery, limit: 5 }),
        enabled: debouncedQuery.length > 1,
    });

    useEffect(() => {
        const fetchDefinitions = async () => {
            try {
                const defs = await api.definitions.randevuTurleri.list();
                if (defs && defs.length > 0) {
                    const mappedServices = defs.map((d: any) => ({
                        id: d.tur_adi,
                        label: d.tur_adi,
                        duration: d.varsayilan_sure || 15,
                        color: d.renk_kodu || '#3b82f6'
                    }));
                    setServices(mappedServices);
                    if (!selectedServiceId && !appointment) {
                        setSelectedServiceId(mappedServices[0].id);
                    }
                } else {
                    const fallback = [{ id: 'Muayene', label: 'Muayene', duration: 15, color: '#3b82f6' }];
                    setServices(fallback);
                    if (!selectedServiceId && !appointment) setSelectedServiceId(fallback[0].id);
                }
            } catch {
                const fallback = [{ id: 'Muayene', label: 'Muayene', duration: 15, color: '#3b82f6' }];
                setServices(fallback);
                if (!selectedServiceId && !appointment) setSelectedServiceId(fallback[0].id);
            }
        };
        if (isOpen) fetchDefinitions();
    }, [isOpen, appointment, selectedServiceId]);

    useEffect(() => {
        if (isOpen) {
            if (appointment) {
                setSelectedPatient({
                    id: appointment.patient_id,
                    name: appointment.title
                });
                setStartDate(new Date(appointment.start));
                setEndDate(new Date(appointment.end));
                setSelectedServiceId(appointment.service_id || 'Muayene');
                setNotes(appointment.notes || '');
                setIsBlockedMode(appointment.status === 'blocked');
            } else {
                if (propPatientId && propPatientName) {
                    setSelectedPatient({ id: propPatientId, name: propPatientName });
                } else {
                    setSelectedPatient(null);
                }
                const start = getDefaultStart();
                setStartDate(start);
                setEndDate(getDefaultEnd());
                setNotes('');
                setIsBlockedMode(false);
            }
            setSearchQuery('');
            setSearchOpen(false);
        }
    }, [isOpen, appointment, propPatientId, propPatientName, getDefaultStart, getDefaultEnd]);

    const handlePatientSelect = (patient: Patient) => {
        setSelectedPatient({ id: patient.id, name: `${patient.ad} ${patient.soyad}` });
        setSearchOpen(false);
        setSearchQuery('');
    };

    const handleServiceSelect = (serviceId: string) => {
        setSelectedServiceId(serviceId);
        const service = services.find(s => s.id === serviceId);
        if (service) {
            setEndDate(addMinutes(startDate, service.duration));
        }
    };

    const handleDoctorSelect = (doctorName: string) => {
        setSelectedDoctorName(doctorName);
    };

    const createAppointmentMutation = useMutation({
        mutationFn: async (data: any) => {
            if (appointment) {
                return api.appointments.update(appointment.id, data);
            }
            return api.appointments.create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success(appointment ? 'Randevu güncellendi' : 'Randevu oluşturuldu');
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.message || 'İşlem başarısız');
        }
    });

    const collisionWarning = useMemo(() => {
        if (isBlockedMode) return null;
        const currentRange = { start: startDate, end: endDate };
        const conflicting = existingAppointments.find(apt => {
            if (appointment && apt.id === appointment.id) return false;
            const aptDoctor = apt.doctor_name || apt.doctor;
            if (selectedDoctorName && aptDoctor && aptDoctor !== selectedDoctorName) return false;
            const aptRange = { start: new Date(apt.start), end: new Date(apt.end) };
            return areIntervalsOverlapping(currentRange, aptRange);
        });
        return conflicting || null;
    }, [startDate, endDate, existingAppointments, appointment, selectedDoctorName, isBlockedMode]);

    const handleSubmit = () => {
        if (!selectedPatient && (!isBlockedMode || blockedCategory === 'Ameliyat')) {
            toast.error(blockedCategory === 'Ameliyat' ? "Lütfen ameliyat olacak hastayı seçin" : "Lütfen bir hasta seçin");
            return;
        }

        const payload = {
            patient_id: selectedPatient?.id || null,
            title: isBlockedMode
                ? (blockedCategory === 'Ameliyat' && selectedPatient ? `[AMELİYAT] ${selectedPatient.name}` : `[BLOKE] ${blockedCategory}`)
                : selectedPatient?.name,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            service_id: isBlockedMode ? 'blocked' : selectedServiceId,
            doctor_name: selectedDoctorName,
            status: isBlockedMode ? 'blocked' : 'scheduled',
            notes: notes || undefined,
        };

        createAppointmentMutation.mutate(payload);
    };

    useKeyboardShortcuts({
        onSave: () => {
            if (isOpen && !createAppointmentMutation.isPending) {
                handleSubmit();
            }
        }
    });

    const handleDateChange = (type: 'start' | 'end', d: Date | undefined) => {
        if (!d) return;
        if (type === 'start') {
            const nextStart = new Date(d);
            nextStart.setHours(startDate.getHours(), startDate.getMinutes());
            setStartDate(nextStart);

            const duration = Math.max(15, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
            setEndDate(addMinutes(nextStart, duration));
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

    return {
        selectedPatient,
        setSelectedPatient,
        searchQuery,
        setSearchQuery,
        searchOpen,
        setSearchOpen,
        searchResults,
        handlePatientSelect,
        selectedDoctorName,
        handleDoctorSelect,
        doctors,
        isBlockedMode,
        setIsBlockedMode,
        isAllDay,
        setIsAllDay,
        blockedCategory,
        setBlockedCategory,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        handleDateChange,
        handleTimeChange,
        selectedServiceId,
        handleServiceSelect,
        services,
        notes,
        setNotes,
        collisionWarning,
        handleSubmit,
        isPending: createAppointmentMutation.isPending,
    };
}
