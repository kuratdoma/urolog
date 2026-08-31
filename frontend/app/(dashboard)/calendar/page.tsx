'use client';

import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, parseISO, startOfMonth, endOfMonth, addMonths, addDays, addWeeks, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import '../../calendar.css';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api, Appointment } from '@/lib/api';
import { CreateAppointmentDialog } from '@/components/appointments/create-appointment-dialog';
import { CalendarHeader } from '@/components/calendar/calendar-header';
import { CalendarEvent } from '@/components/calendar/calendar-event';
import { CalendarAgenda } from '@/components/calendar/calendar-agenda';
import { ExaminationSummaryDialog } from '@/components/calendar/examination-summary-dialog';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

const DnDCalendar = withDragAndDrop(Calendar);

const locales = {
    'tr': tr,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

// Custom Toolbar is now handled by CalendarHeader component

const messages = {
    allDay: 'Tüm Gün',
    previous: 'Geri',
    next: 'İleri',
    today: 'Bugün',
    month: 'Ay',
    week: 'Hafta',
    day: 'Gün',
    agenda: 'Ajanda',
    date: 'Tarih',
    time: 'Zaman',
    event: 'Etkinlik',
    noEventsInRange: 'Bu aralıkta etkinlik yok.',
};

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource: Appointment;
    changeStatus?: 'deleted' | 'modified' | 'history' | null;
}

export default function CalendarPage() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const { user: currentUser } = useAuthStore();

    const [view, setView] = useState<View>(Views.WEEK);
    const [date, setDate] = useState(new Date());
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | undefined>(undefined);
    const [selectedSlotStart, setSelectedSlotStart] = useState<Date | undefined>(undefined);
    const [selectedSlotEnd, setSelectedSlotEnd] = useState<Date | undefined>(undefined);

    // Persistence for focus and viewing states
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('calendar_doctor_focus');
        return null;
    });
    const [isGhostMode, setIsGhostMode] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('calendar_ghost_mode') === 'true';
        return false;
    });
    const [zoom, setZoom] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('calendar_zoom');
            return saved ? Number(saved) : 150;
        }
        return 150;
    });

    const [summaryDialog, setSummaryDialog] = useState<{ open: boolean; patientId?: string; patientName?: string }>({ open: false });

    // Sidebar visibility with localStorage persistence
    const [showSidebar, setShowSidebar] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('calendar_sidebar_visible');
            return saved !== 'false'; // Default to true
        }
        return true;
    });

    // Change tracking mode with localStorage persistence
    const [showChanges, setShowChanges] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('calendar_show_changes') === 'true';
        }
        return false;
    });

    // Effect-based persistence handlers
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (selectedDoctorId) localStorage.setItem('calendar_doctor_focus', selectedDoctorId);
            else localStorage.removeItem('calendar_doctor_focus');
        }
    }, [selectedDoctorId]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('calendar_ghost_mode', String(isGhostMode));
        }
    }, [isGhostMode]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('calendar_zoom', String(zoom));
        }
    }, [zoom]);

    const toggleSidebar = useCallback(() => {
        setShowSidebar(prev => {
            const newValue = !prev;
            localStorage.setItem('calendar_sidebar_visible', String(newValue));
            return newValue;
        });
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('calendar_show_changes', String(showChanges));
        }
    }, [showChanges]);

    // Fetch Settings for Colors
    const { data: settings = [] } = useQuery({
        queryKey: ['settings'],
        queryFn: api.settings.getAll,
    });

    // Set default view to WEEK after settings load
    useEffect(() => {
        if (currentUser) {
            setView(Views.WEEK);
        }
    }, [currentUser]);

    // Parse working hours from settings to get active days AND time ranges
    const workingHoursConfig = useMemo(() => {
        const whSetting = settings.find((s: any) => s.key === 'working_hours');
        const dayMap: Record<string, number> = {
            sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
        };

        // Default config
        const defaultConfig = {
            activeDays: [1, 2, 3, 4, 5, 6],
            daySchedule: {} as Record<number, { start: string; end: string }>
        };

        // Set default hours for each day
        [1, 2, 3, 4, 5, 6].forEach(d => {
            defaultConfig.daySchedule[d] = { start: '09:00', end: '18:00' };
        });

        if (!whSetting?.value) {
            return defaultConfig;
        }

        try {
            const wh = JSON.parse(whSetting.value);
            const activeDays: number[] = [];
            const daySchedule: Record<number, { start: string; end: string }> = {};

            Object.entries(dayMap).forEach(([dayKey, dayIndex]) => {
                if (wh[dayKey]?.isOpen) {
                    activeDays.push(dayIndex);
                    daySchedule[dayIndex] = {
                        start: wh[dayKey].start || '09:00',
                        end: wh[dayKey].end || '18:00'
                    };
                }
            });

            return {
                activeDays: activeDays.length > 0 ? activeDays : defaultConfig.activeDays,
                daySchedule: Object.keys(daySchedule).length > 0 ? daySchedule : defaultConfig.daySchedule
            };
        } catch {
            return defaultConfig;
        }
    }, [settings]);

    // Fetch Users (Doctors)
    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: api.auth.getUsers,
    });

    const doctors = useMemo(() => {
        return users.filter((u: any) => u.role === 'DOCTOR' || u.role === 'ADMIN');
    }, [users]);

    // Calculate date range for query based on current view
    const dateRange = useMemo(() => {
        const start = startOfMonth(addMonths(date, -1));
        const end = endOfMonth(addMonths(date, 1));
        return { start: start.toISOString(), end: end.toISOString() };
    }, [date]);

    // Fetch appointments
    const { data: appointments, refetch } = useQuery({
        queryKey: ['appointments', dateRange.start, dateRange.end, showChanges],
        queryFn: () => api.appointments.list({ start: dateRange.start, end: dateRange.end, include_deleted: showChanges }),
        staleTime: 180 * 1000,
    });

    // Delete Mutation
    const deleteAppointmentMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason?: string }) => api.appointments.delete(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success('Randevu silindi');
        },
    });

    // Update Mutation
    const updateAppointmentMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.appointments.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success('Randevu güncellendi');
        },
    });

    const removeGoogleMutation = useMutation({
        mutationFn: (id: string) => api.integrations.removeFromGoogle(id),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success(data.message || "Google Calendar'dan silindi");
        },
        onError: async (err: any) => {
            const errorMessage = err.message || '';
            if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('Google API') || errorMessage.includes('auth')) {
                toast.error('Google Calendar yetkiniz zaman aşımına uğramış. Yönlendiriliyorsunuz...');
                try {
                    const res = await api.integrations.getGoogleAuthUrl();
                    if (res && res.url) {
                        window.location.href = res.url;
                    }
                } catch (e) {
                    toast.error('Bağlantı URL\'i alınamadı.');
                }
            } else {
                toast.error(err.message || 'Silme hatası');
            }
        }
    });

    // Transform API data to calendar events
    const allEvents: CalendarEvent[] = useMemo(() => {
        if (!appointments) return [];

        return appointments.map((apt: Appointment) => {
            // Determine change status
            let changeStatus: 'deleted' | 'modified' | 'history' | null = null;
            if (showChanges) {
                if ((apt.status as string) === 'history' || apt.is_deleted === 2) {
                    changeStatus = 'history';
                } else if (apt.is_deleted === 1) {
                    changeStatus = 'deleted';
                } else if (apt.updated_at && apt.created_at && apt.updated_at !== apt.created_at) {
                    changeStatus = 'modified';
                }
            }

            return {
                id: apt.id,
                title: apt.hasta
                    ? `${apt.hasta.ad} ${apt.hasta.soyad}`
                    : apt.title,
                start: parseISO(apt.start),
                end: parseISO(apt.end),
                resource: apt,
                changeStatus,
            };
        });
    }, [appointments, showChanges]);

    // Event source for the calendar (Handles Filtering vs Ghosting)
    const events = useMemo(() => {
        if (!selectedDoctorId) return allEvents;
        // If Ghost Mode is ON, we show ALL events and let the component handle the 'ghosted' state
        if (isGhostMode) return allEvents;
        // If Ghost Mode is OFF, we strictly filter for the focused doctor
        return allEvents.filter(e => String(e.resource.doctor_id) === selectedDoctorId);
    }, [allEvents, selectedDoctorId, isGhostMode]);

    // Filter appointments for the sidebar (Selected Date & Focus)
    const dayAppointments = useMemo(() => {
        return allEvents
            .filter(evt => {
                const sameDay = isSameDay(evt.start, date);
                if (!selectedDoctorId) return sameDay;
                return sameDay && String(evt.resource.doctor_id) === selectedDoctorId;
            })
            .sort((a, b) => a.start.getTime() - b.start.getTime());
    }, [allEvents, date, selectedDoctorId]);

    // Helper function to check if a time is within working hours for a given day
    const isWithinWorkingHours = useCallback((dateTime: Date): boolean => {
        const dayOfWeek = dateTime.getDay();

        // Check if day is active
        if (!workingHoursConfig.activeDays.includes(dayOfWeek)) {
            return false;
        }

        // Get schedule for this day
        const schedule = workingHoursConfig.daySchedule[dayOfWeek];
        if (!schedule) return false;

        const hours = dateTime.getHours();
        const minutes = dateTime.getMinutes();
        const currentMinutes = hours * 60 + minutes;

        const [startH, startM] = schedule.start.split(':').map(Number);
        const [endH, endM] = schedule.end.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }, [workingHoursConfig]);

    // Slot prop getter for styling non-working hours
    const slotPropGetter = useCallback((date: Date) => {
        if (!isWithinWorkingHours(date)) {
            return { className: 'rbc-off-hours' };
        }
        return {};
    }, [isWithinWorkingHours]);

    // Day prop getter for styling closed days
    const dayPropGetter = useCallback((date: Date) => {
        const dayOfWeek = date.getDay();

        if (!workingHoursConfig.activeDays.includes(dayOfWeek)) {
            return { className: 'rbc-closed-day' };
        }

        return {};
    }, [workingHoursConfig]);

    const eventPropGetter = useCallback((event: CalendarEvent) => {
        if (event.changeStatus === 'history' || event.changeStatus === 'deleted') {
            return { className: 'history-appointment' };
        }
        return {};
    }, []);

    // Handlers for DnD
    const onEventResize = useCallback(
        ({ event, start, end }: any) => {
            const calEvent = event as CalendarEvent;
            updateAppointmentMutation.mutate({
                id: calEvent.id,
                data: { start: start.toISOString(), end: end.toISOString() }
            });
        },
        [updateAppointmentMutation]
    );

    const onEventDrop = useCallback(
        ({ event, start, end }: any) => {
            const calEvent = event as CalendarEvent;
            updateAppointmentMutation.mutate({
                id: calEvent.id,
                data: { start: start.toISOString(), end: end.toISOString() }
            });
        },
        [updateAppointmentMutation]
    );

    // --- Cancellation Reason Dialog ---
    const [cancelDialog, setCancelDialog] = useState<{ open: boolean; id?: string }>({ open: false });
    const cancelReasons = ['Hasta Gelmedi', 'Hasta İptal Etti', 'Hekim İptal Etti', 'Yanlış Kayıt', 'Diğer'];

    // --- Deletion Reason Dialog ---
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id?: string }>({ open: false });
    const [deleteReason, setDeleteReason] = useState('');

    // CustomEvent is now a standalone component (CalendarEvent)
    const components = useMemo(() => ({
        event: ({ event }: any) => (
            <CalendarEvent
                event={event}
                view={view}
                onEdit={(apt) => {
                    setEditingAppointment(apt);
                    setShowCreateDialog(true);
                }}
                onStatusChange={(id, status) => {
                    if (status === 'cancelled') setCancelDialog({ open: true, id });
                    else updateAppointmentMutation.mutate({ id, data: { status } });
                }}
                onDelete={(id) => {
                    setDeleteReason('');
                    setDeleteDialog({ open: true, id });
                }}
                onSummary={(id, name) => setSummaryDialog({ open: true, patientId: id, patientName: name })}
                onGoToPatient={(id) => router.push(`/patients/${id}`)}
                onRemoveGoogle={(id) => removeGoogleMutation.mutate(id)}
                isFocused={String(event.resource.doctor_id) === selectedDoctorId}
                isGhosted={!!selectedDoctorId && isGhostMode && String(event.resource.doctor_id) !== selectedDoctorId}
                changeStatus={event.changeStatus}
            />
        ),
        toolbar: () => null // Handled externally
    }), [view, selectedDoctorId, isGhostMode, router, updateAppointmentMutation, removeGoogleMutation, showChanges]);

    // Calendar Styles
    const calendarStyles = `
        .rbc-calendar { font-family: inherit; }
        .rbc-toolbar { display: none !important; }
        .rbc-header { padding: 8px; font-weight: 700; font-size: 0.75rem; color: #64748b; border-bottom: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.05em; background: #fdfdfd; }
        .rbc-month-view { border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden; }
        .rbc-month-row { border-top: 1px solid #f1f5f9; }
        .rbc-day-bg { border-left: 1px solid #f1f5f9; }
        .rbc-today { background-color: #f8fafc; }
        .rbc-off-range-bg { background-color: #fcfcfc; opacity: 0.4; }
        
        /* Event Styling */
        .rbc-event { background: transparent; padding: 0; border: none !important; outline: none !important; box-shadow: none !important; overflow: visible !important; margin-bottom: 1px; z-index: 5; }
        .rbc-event-label { display: none; } 
        .rbc-event.rbc-selected { background-color: transparent !important; }
        .rbc-event:focus { outline: none !important; }

        .history-appointment {
            opacity: 0.6 !important;
            z-index: 10 !important;
            pointer-events: none !important;
        }

        .rbc-time-view { border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden; }
        .rbc-time-slot { font-size: 0.75rem; font-weight: 500; color: #94a3b8; }
        .rbc-label { font-size: 0.75rem; color: #94a3b8; font-weight: 600; padding: 0 4px; }
        
        /* Month Date Numbers */
        .rbc-date-cell { padding: 4px 8px; font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-align: right; }
        .rbc-date-cell.rbc-now { color: #ef4444; }
        .rbc-date-cell.rbc-now a { background: #fee2e2; padding: 2px 6px; border-radius: 6px; }

        .rbc-show-more { background: transparent; color: #94a3b8; font-size: 10px; font-weight: 700; padding-left: 8px; margin-top: 2px; }
        .rbc-show-more:hover { text-decoration: underline; color: #64748b; }

        .rbc-current-time-indicator { background-color: #ef4444 !important; height: 2px; }
        .rbc-current-time-indicator::before { content: ""; display: block; width: 8px; height: 8px; background-color: #ef4444; border-radius: 50%; position: absolute; left: -4px; top: -3px; }
        
        .rbc-timeslot-group { min-height: var(--rbc-zoom, 150px) !important; }
        .rbc-time-content { border-top: none; }

        .rbc-off-hours { 
            background-color: #f1f5f9 !important; 
            background-image: repeating-linear-gradient(
                135deg,
                transparent,
                transparent 4px,
                rgba(148, 163, 184, 0.1) 4px,
                rgba(148, 163, 184, 0.1) 8px
            );
        }
        .rbc-closed-day { 
            background-color: #f8fafc !important; 
            opacity: 0.5;
        }
        .rbc-day-bg.rbc-closed-day {
            cursor: not-allowed;
        }
    `;

    return (
        <div className="flex h-[calc(100vh-theme(spacing.8))] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-col">
            <style>{calendarStyles}</style>
            <style>{`.rbc-calendar { --rbc-zoom: ${zoom}px; }`}</style>

            <CalendarHeader
                date={date}
                view={view}
                onViewChange={setView}
                onNavigate={(action) => {
                    const amount = action === 'NEXT' ? 1 : -1;
                    if (action === 'TODAY') setDate(new Date());
                    else if (view === Views.MONTH) setDate(prev => addMonths(prev, amount));
                    else if (view === Views.WEEK) setDate(prev => addWeeks(prev, amount));
                    else setDate(prev => addDays(prev, amount));
                }}
                onDateSelect={setDate}
                doctors={doctors}
                selectedDoctorId={selectedDoctorId}
                onDoctorChange={setSelectedDoctorId}
                isGhostMode={isGhostMode}
                onGhostModeToggle={setIsGhostMode}
                showSidebar={showSidebar}
                toggleSidebar={toggleSidebar}
                zoom={zoom}
                onZoomChange={setZoom}
                onCreateAppointment={() => {
                    setEditingAppointment(undefined);
                    setShowCreateDialog(true);
                }}
                onRefresh={() => refetch()}
                showChanges={showChanges}
                onShowChangesToggle={setShowChanges}
            />

            <div className="flex flex-1 overflow-hidden relative">
                <div className="flex-1 overflow-hidden p-0 relative h-full">
                    {/* @ts-ignore */}
                    <DnDCalendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        culture='tr'
                        messages={messages}
                        view={view}
                        onView={setView}
                        date={date}
                        onNavigate={setDate}
                        scrollToTime={new Date(0, 0, 0, 8, 0, 0)}
                        min={new Date(0, 0, 0, 8, 0, 0)}
                        max={new Date(0, 0, 0, 21, 0, 0)}
                        components={components}
                        onEventDrop={onEventDrop}
                        onEventResize={onEventResize}
                        resizable
                        selectable
                        popup
                        step={30}
                        timeslots={2}
                        slotPropGetter={slotPropGetter}
                        dayPropGetter={dayPropGetter}
                        eventPropGetter={eventPropGetter}
                        onSelectSlot={(slotInfo) => {
                            if (!isWithinWorkingHours(slotInfo.start)) {
                                toast.error('Çalışma saatleri dışında randevu oluşturulamaz.');
                                return;
                            }
                            setEditingAppointment(undefined);
                            setSelectedSlotStart(slotInfo.start);
                            setSelectedSlotEnd(slotInfo.end);
                            setShowCreateDialog(true);
                        }}
                        className="h-full border-none"
                    />
                </div>

                <CalendarAgenda
                    date={date}
                    appointments={dayAppointments}
                    showSidebar={showSidebar}
                    toggleSidebar={toggleSidebar}
                    onEditAppointment={(apt) => {
                        setEditingAppointment(apt);
                        setShowCreateDialog(true);
                    }}
                />
            </div>

            <CreateAppointmentDialog
                isOpen={showCreateDialog}
                onClose={() => {
                    setShowCreateDialog(false);
                    setEditingAppointment(undefined);
                    setSelectedSlotStart(undefined);
                    setSelectedSlotEnd(undefined);
                    queryClient.invalidateQueries({ queryKey: ['appointments'] });
                }}
                appointment={editingAppointment}
                existingAppointments={appointments || []}
                initialStart={selectedSlotStart}
                initialEnd={selectedSlotEnd}
            />

            <ExaminationSummaryDialog
                isOpen={summaryDialog.open}
                onClose={() => setSummaryDialog({ open: false })}
                patientId={summaryDialog.patientId}
                patientName={summaryDialog.patientName}
            />

            {/* Cancellation Dialog */}
            <Dialog open={cancelDialog.open} onOpenChange={(o) => setCancelDialog({ ...cancelDialog, open: o })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Randevu İptal Nedeni</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-2 py-4">
                        {cancelReasons.map(reason => (
                            <Button
                                key={reason}
                                variant="outline"
                                className="justify-start h-12 text-sm font-medium hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                                onClick={() => {
                                    updateAppointmentMutation.mutate({
                                        id: cancelDialog.id!,
                                        data: { status: 'cancelled', cancel_reason: reason }
                                    });
                                    setCancelDialog({ open: false });
                                }}
                            >
                                {reason}
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Deletion Dialog */}
            <Dialog open={deleteDialog.open} onOpenChange={(o) => setDeleteDialog({ ...deleteDialog, open: o })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Randevu Silme Gerekçesi</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <p className="text-sm text-slate-500 italic">Bu randevu takvimden kaldırılacak ancak hasta kayıtlarında silinme gerekçesiyle birlikte saklanacaktır.</p>
                        <textarea
                            className="w-full min-h-[100px] p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Silme nedenini buraya yazınız..."
                            value={deleteReason}
                            onChange={(e) => setDeleteReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteDialog({ open: false })}>Vazgeç</Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={!deleteReason.trim()}
                            onClick={() => {
                                deleteAppointmentMutation.mutate({ id: deleteDialog.id!, reason: deleteReason });
                                setDeleteDialog({ open: false });
                            }}
                        >
                            Randevuyu Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
