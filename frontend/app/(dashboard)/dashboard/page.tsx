"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Calendar,
    MoreHorizontal,
    Plus,
    User,
    AlertCircle,
    Trash2,
    Edit2,
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    ChevronRight,
    Wallet,
    X,
    PhoneOff
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { usePatientStore } from '@/stores/patient-store';

import { api, Appointment } from "@/lib/api";
import { lookupICDNamesBatch } from "@/lib/icd-codes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CreateAppointmentDialog } from "@/components/appointments/create-appointment-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FileText, Stethoscope, Binoculars } from 'lucide-react';
import { cn } from "@/lib/utils";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
    }).format(amount);
};

// Async ICD Name Renderer component
const IcdNameDisplay = ({ name }: { name?: string }) => {
    return <span title={name}>{name || '-'}</span>;
};


export default function DashboardPage() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | undefined>(undefined);
    const [briefAppointment, setBriefAppointment] = useState<Appointment | null>(null);
    const { setActivePatient } = usePatientStore();
    const [popoverState, setPopoverState] = useState<{ x: number, y: number, patient: any | null } | null>(null);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

    // Patient Search State
    const [adInput, setAdInput] = useState('');
    const [soyadInput, setSoyadInput] = useState('');

    // Debounced states
    const [debouncedAd, setDebouncedAd] = useState('');
    const [debouncedSoyad, setDebouncedSoyad] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedAd(adInput);
            setDebouncedSoyad(soyadInput);
        }, 300);
        return () => clearTimeout(timer);
    }, [adInput, soyadInput]);

    // Fetch Dashboard Summary
    const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
        queryKey: ['dashboard'],
        queryFn: api.dashboard.get,
        staleTime: 180 * 1000,
        refetchInterval: 60000
    });

    // Fetch Patients (Activity-Sorted)
    const { data: patients, isLoading: isPatientsLoading } = useQuery({
        queryKey: ['patients', debouncedAd, debouncedSoyad],
        queryFn: () => api.patients.list({
            limit: 15,
            ad: debouncedAd || undefined,
            soyad: debouncedSoyad || undefined
        }),
    });

    // Tanı (ICD) kodlarını satır başına ayrı istek yerine TEK istekte çözümle
    const sonTaniCodes = (patients ?? []).map((p) => p.son_tani).filter(Boolean) as string[];
    const { data: icdNameMap = {} } = useQuery({
        queryKey: ['icd-names-batch', sonTaniCodes],
        queryFn: () => lookupICDNamesBatch(sonTaniCodes),
        enabled: sonTaniCodes.length > 0,
    });



    // Fetch Today's Appointments
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: appointments, isLoading: isAppointmentsLoading } = useQuery({
        queryKey: ['appointments', 'today'],
        queryFn: () => api.appointments.list({
            start: todayStart.toISOString(),
            end: todayEnd.toISOString()
        }),
        staleTime: 180 * 1000,
    });

    // Finance Summary
    const { data: financeSummary } = useQuery({
        queryKey: ['finance_summary'],
        queryFn: () => api.finance.getSummary(),
        refetchInterval: 120000
    });

    // Debtors
    const { data: debtors = [] } = useQuery({
        queryKey: ['finance_debtors'],
        queryFn: () => api.finance.getDebtors(0),
        refetchInterval: 120000
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.appointments.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            toast.success("Randevu silindi");
        },
        onError: () => toast.error("Silme işlemi başarısız")
    });

    const handleDelete = (id: string) => {
        if (confirm("Bu randevuyu silmek istediğinize emin misiniz?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleEdit = (apt: Appointment) => {
        setEditingAppointment(apt);
        setShowCreateDialog(true);
    };

    // Sort appointments by time
    const sortedAppointments = appointments?.sort((a, b) =>
        new Date(a.start).getTime() - new Date(b.start).getTime()
    ) || [];

    const todayStr = format(new Date(), "d MMMM yyyy, EEEE", { locale: tr });

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'confirmed': return 'Onaylı';
            case 'scheduled': return 'Planlı';
            case 'unreachable': return 'Ulaşılamadı';
            case 'cancelled': return 'İptal';
            case 'completed': return 'Tamamlandı';
            default: return status;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'completed':
                return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
            case 'unreachable':
                return <PhoneOff className="h-4 w-4 text-amber-500 shrink-0" />;
            case 'cancelled':
                return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
            default:
                return null;
        }
    };

    if (isDashboardLoading || isAppointmentsLoading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Klinik Yönetimi</h2>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2 capitalize">
                        <Calendar className="h-4 w-4" />
                        {todayStr}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/patients">
                        <Button
                            variant="outline"
                            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                        >
                            <Users className="h-4 w-4 mr-2 text-indigo-600" />
                            Hastalar
                        </Button>
                    </Link>
                    <Link href="/patients/create">
                        <Button
                            variant="outline"
                            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                        >
                            <Plus className="h-4 w-4 mr-2 text-blue-600" />
                            Yeni Hasta
                        </Button>
                    </Link>
                    <Button
                        onClick={() => {
                            setEditingAppointment(undefined);
                            setShowCreateDialog(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Yeni Randevu
                    </Button>
                </div>
            </div>


            {/* Main Content Area */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Left Column: Today's Agenda (2/3 width) */}
                <div className="xl:col-span-2 space-y-6">
                    <Card className="border-white shadow-sm border-t-4 border-t-blue-500 overflow-hidden">
                        <CardHeader className="bg-white border-b border-slate-50 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                        <Users className="h-5 w-5 text-blue-600" /> Son Hareketler & Hastalar
                                    </CardTitle>
                                    <CardDescription className="text-xs font-medium text-slate-500 mt-1">
                                        Son kayıt ve işlem yapılan hastalar
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex flex-col lg:flex-row items-center gap-2 mt-2 px-1">
                                <Input
                                    placeholder="Ad"
                                    value={adInput}
                                    onChange={(e) => setAdInput(e.target.value)}
                                    className="flex-1 lg:max-w-[300px] h-9 text-xs bg-slate-50 border-slate-200"
                                />
                                <Input
                                    placeholder="Soyad"
                                    value={soyadInput}
                                    onChange={(e) => setSoyadInput(e.target.value)}
                                    className="flex-1 lg:max-w-[300px] h-9 text-xs bg-slate-50 border-slate-200"
                                />
                                {(adInput || soyadInput) && (
                                    <Button variant="ghost" size="icon" onClick={() => { setAdInput(''); setSoyadInput(''); }} className="h-9 w-9 text-slate-400 hover:text-red-500">
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[800px] overflow-auto">
                                <div className="max-h-[800px] overflow-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                            <TableRow>
                                                <TableHead className="w-[95px] font-semibold text-slate-500 text-xs">PROTOKOL</TableHead>
                                                <TableHead className="flex-1 min-w-[190px] font-semibold text-slate-500 text-xs">HASTA</TableHead>
                                                <TableHead className="w-[220px] font-semibold text-slate-500 text-xs">TANI</TableHead>
                                                <TableHead className="w-[110px] font-semibold text-slate-500 text-xs text-right">SON İŞLEM</TableHead>
                                                <TableHead className="w-[35px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isPatientsLoading ? (
                                                Array(5).fill(0).map((_, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                                    </TableRow>
                                                ))
                                            ) : patients?.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-400">Hasta bulunamadı.</TableCell>
                                                </TableRow>
                                            ) : (
                                                patients?.map((patient) => {
                                                    const lastActionDate = patient.son_islem_tarihi || patient.updated_at || patient.created_at;
                                                    return (
                                                        <TableRow
                                                            key={patient.id}
                                                            className="cursor-pointer hover:bg-slate-50 transition-colors group"
                                                            onClick={(e) => {
                                                                setPopoverState({ x: e.clientX, y: e.clientY, patient: patient });
                                                                setSelectedPatientId(patient.id);
                                                                setActivePatient({
                                                                    id: patient.id,
                                                                    ad: patient.ad,
                                                                    soyad: patient.soyad,
                                                                    tc_kimlik: patient.tc_kimlik
                                                                });
                                                            }}
                                                        >
                                                            <TableCell>
                                                                <span className="font-mono text-[11px] text-blue-600 font-bold uppercase">
                                                                    {patient.protokol_no || '-'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-col py-0.5">
                                                                    <span className="font-semibold text-sm text-slate-900 group-hover:text-blue-700 transition-colors">
                                                                        {patient.ad} {patient.soyad}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 mt-0.5">
                                                                        {patient.tc_kimlik || 'TC yok'}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-xs text-slate-600 max-w-[220px] truncate">
                                                                <IcdNameDisplay name={patient.son_tani ? (icdNameMap[patient.son_tani.toUpperCase()] || patient.son_tani) : undefined} />
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <span className="font-mono text-[11px] text-slate-600 font-medium">
                                                                    {lastActionDate ? format(new Date(lastActionDate), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-blue-400 transition-all group-hover:translate-x-0.5" />
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>

                                    {/* Popover */}
                                    <Popover open={!!popoverState} onOpenChange={(open) => !open && setPopoverState(null)}>
                                        {popoverState && (
                                            <>
                                                <PopoverAnchor
                                                    virtualRef={{
                                                        current: {
                                                            getBoundingClientRect: () => ({
                                                                width: 0, height: 0,
                                                                top: popoverState.y, left: popoverState.x,
                                                                right: popoverState.x, bottom: popoverState.y,
                                                            } as any),
                                                        } as any
                                                    }}
                                                />
                                                <PopoverContent className="w-56 p-1.5 shadow-xl border-slate-100 bg-white/95 backdrop-blur-sm rounded-xl" align="start" sideOffset={5}>
                                                    <div className="px-3 py-2.5 mb-1 border-b border-slate-50">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hızlı İşlemler</p>
                                                        <p className="text-sm font-bold text-slate-800 truncate">
                                                            {popoverState.patient.ad} {popoverState.patient.soyad}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            className="justify-start gap-3 h-10 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 w-full rounded-lg"
                                                            onClick={() => router.push(`/patients/${popoverState.patient.id}`)}
                                                        >
                                                            <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
                                                                <FileText className="h-3.5 w-3.5" />
                                                            </div>
                                                            Hasta Detayı
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            className="justify-start gap-3 h-10 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 w-full rounded-lg"
                                                            onClick={() => router.push(`/patients/${popoverState.patient.id}/examination`)}
                                                        >
                                                            <div className="w-6 h-6 rounded-md bg-red-100 text-red-600 flex items-center justify-center">
                                                                <Stethoscope className="h-3.5 w-3.5" />
                                                            </div>
                                                            Muayene Başlat
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            className="justify-start gap-3 h-10 text-xs font-semibold text-slate-600 hover:text-green-600 hover:bg-green-50 w-full rounded-lg"
                                                            onClick={() => router.push(`/patients/${popoverState.patient.id}/followup`)}
                                                        >
                                                            <div className="w-6 h-6 rounded-md bg-green-100 text-green-600 flex items-center justify-center">
                                                                <Binoculars className="h-3.5 w-3.5" />
                                                            </div>
                                                            Takip Notu Ekle
                                                        </Button>
                                                    </div>
                                                </PopoverContent>
                                            </>
                                        )}
                                    </Popover>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Patients & Recent Logs */}
                <div className="space-y-6">
                    {/* Patient Search & List Card */}
                    <Card className="border-white shadow-sm border-t-4 border-t-cyan-500 overflow-hidden">
                        <CardHeader className="bg-white border-b border-slate-50 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-indigo-500" /> Günün Ajandası
                                    </CardTitle>
                                    <CardDescription className="text-xs font-medium text-slate-500 mt-1">Bugünkü randevu akışı</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {sortedAppointments.length === 0 ? (
                                    <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                                            <Calendar className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <p className="font-medium">Bugün için planlanmış randevu yok.</p>
                                        <p className="text-xs text-slate-400">Yeni bir randevu oluşturmak için butonu kullanın.</p>
                                    </div>
                                ) : (
                                    sortedAppointments.map((apt) => {
                                        const startTime = parseISO(apt.start);
                                        const endTime = parseISO(apt.end);
                                        const isPast = new Date() > endTime;
                                        const isConfirmed = apt.status === 'confirmed';
                                        const isUnreachable = apt.status === 'unreachable';
                                        const isCancelled = apt.status === 'cancelled';
                                        const isBlocked = apt.status === 'blocked';

                                        const statusBorderClass = isConfirmed
                                            ? 'border-l-4 border-l-emerald-500 bg-emerald-50/70 hover:bg-emerald-100/70'
                                            : isUnreachable
                                                ? 'border-l-4 border-l-amber-500 bg-amber-50/70 hover:bg-amber-100/70'
                                                : isCancelled
                                                    ? 'border-l-4 border-l-red-400 bg-red-50/40'
                                                    : isBlocked
                                                        ? 'border-l-4 border-l-red-600 bg-red-50/40'
                                                        : 'border-l-4 border-l-blue-500 bg-blue-50/70 hover:bg-blue-100/70';

                                        return (
                                            <div key={apt.id} className={cn("flex group transition-colors", statusBorderClass, isPast && "opacity-60")}>
                                                {/* Time Column */}
                                                <div className="w-20 shrink-0 border-r border-slate-100 p-3 flex flex-col items-end gap-1 text-right bg-slate-50/30">
                                                    <span className="text-sm font-bold text-slate-700 font-mono">{format(startTime, 'HH:mm')}</span>
                                                    <span className="text-xs text-slate-400 font-mono">{format(endTime, 'HH:mm')}</span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setBriefAppointment(apt)}
                                                        className="mt-1 h-6 w-full px-1 text-[10px] font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 hover:text-indigo-700 border-indigo-200/60 rounded-md transition-all flex items-center justify-center gap-1 shadow-xs"
                                                    >
                                                        <FileText className="w-3 h-3 text-indigo-500" />
                                                        Brief
                                                    </Button>
                                                </div>

                                                    {/* Content Column */}
                                                    {(() => {
                                                        const patientId = apt.hasta_id || apt.hasta?.id;
                                                        const displayName = apt.hasta ? `${apt.hasta.ad} ${apt.hasta.soyad}` : apt.title;

                                                        const onPatientClick = () => {
                                                            if (!patientId) return;
                                                            if (apt.hasta) {
                                                                setActivePatient({
                                                                    id: String(apt.hasta.id),
                                                                    ad: apt.hasta.ad,
                                                                    soyad: apt.hasta.soyad,
                                                                    tc_kimlik: apt.hasta.tc_kimlik,
                                                                });
                                                            } else {
                                                                const nameParts = (apt.title || '').trim().split(' ');
                                                                const soyad = nameParts.length > 1 ? nameParts.pop() || '' : '';
                                                                const ad = nameParts.join(' ') || apt.title;
                                                                setActivePatient({
                                                                    id: String(patientId),
                                                                    ad,
                                                                    soyad,
                                                                });
                                                            }
                                                        };

                                                        return (
                                                            <div className="flex-1 min-w-0 p-3 flex items-start gap-3">
                                                                <div className="mt-1">
                                                                    {patientId ? (
                                                                        <Link
                                                                            href={`/patients/${patientId}/examination`}
                                                                            onClick={onPatientClick}
                                                                            title="Muayene Formunu Aç"
                                                                            className="block rounded-full hover:ring-2 hover:ring-indigo-400 transition-all cursor-pointer"
                                                                        >
                                                                            <Avatar className={cn("h-10 w-10 border border-slate-200", isPast ? "bg-slate-100" : "bg-white")}>
                                                                                <AvatarFallback className="text-xs font-bold text-slate-600">
                                                                                    {apt.hasta ? `${apt.hasta.ad[0]}${apt.hasta.soyad[0]}` : apt.title.substring(0, 2).toUpperCase()}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                        </Link>
                                                                    ) : (
                                                                        <Avatar className={cn("h-10 w-10 border border-slate-200", isPast ? "bg-slate-100" : "bg-white")}>
                                                                            <AvatarFallback className="text-xs font-bold text-slate-600">
                                                                                {apt.hasta ? `${apt.hasta.ad[0]}${apt.hasta.soyad[0]}` : apt.title.substring(0, 2).toUpperCase()}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                    )}
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <h4 className="text-sm font-bold text-slate-900 truncate">
                                                                            {patientId ? (
                                                                                <Link
                                                                                    href={`/patients/${patientId}/examination`}
                                                                                    onClick={onPatientClick}
                                                                                    className="hover:text-indigo-600 hover:underline transition-colors inline-flex items-center gap-1.5"
                                                                                    title="Muayene Formunu Aç"
                                                                                >
                                                                                    <span>{displayName}</span>
                                                                                    <Stethoscope className="w-3.5 h-3.5 text-indigo-500 opacity-60 hover:opacity-100 shrink-0" />
                                                                                </Link>
                                                                            ) : (
                                                                                apt.title
                                                                            )}
                                                                        </h4>
                                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                                            {isConfirmed && (
                                                                                <Badge className="text-[10px] font-bold h-4.5 px-1.5 bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs flex items-center gap-1">
                                                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Onaylı
                                                                                </Badge>
                                                                            )}
                                                                            {isUnreachable && (
                                                                                <Badge className="text-[10px] font-bold h-4.5 px-1.5 bg-amber-100 text-amber-900 border-amber-300 shadow-2xs flex items-center gap-1">
                                                                                    <PhoneOff className="w-3 h-3 text-amber-600" /> Ulaşılamadı
                                                                                </Badge>
                                                                            )}
                                                                            {isCancelled && (
                                                                                <Badge className="text-[10px] font-bold h-4.5 px-1.5 bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
                                                                                    <XCircle className="w-3 h-3 text-red-600" /> İptal
                                                                                </Badge>
                                                                            )}
                                                                            {!isConfirmed && !isUnreachable && !isCancelled && !isBlocked && (
                                                                                <Badge variant="outline" className="text-[10px] font-bold h-4.5 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                                                                                    Planlı
                                                                                </Badge>
                                                                            )}

                                                                            <DropdownMenu>
                                                                                <DropdownMenuTrigger asChild>
                                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                                    </Button>
                                                                                </DropdownMenuTrigger>
                                                                                <DropdownMenuContent align="end" className="w-36">
                                                                                    {patientId && (
                                                                                        <DropdownMenuItem asChild>
                                                                                            <Link
                                                                                                href={`/patients/${patientId}/examination`}
                                                                                                onClick={onPatientClick}
                                                                                                className="cursor-pointer font-medium text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50"
                                                                                            >
                                                                                                <Stethoscope className="mr-2 h-3.5 w-3.5" />
                                                                                                Muayene Formu
                                                                                            </Link>
                                                                                        </DropdownMenuItem>
                                                                                    )}
                                                                                    <DropdownMenuItem onClick={() => handleEdit(apt)}>
                                                                                        <Edit2 className="mr-2 h-3.5 w-3.5" />
                                                                                        Düzenle
                                                                                    </DropdownMenuItem>
                                                                                    <DropdownMenuItem onClick={() => handleDelete(apt.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                                                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                                                        Sil
                                                                                    </DropdownMenuItem>
                                                                                </DropdownMenuContent>
                                                                            </DropdownMenu>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                                                                        {apt.doctor?.full_name && (
                                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                                                                <User className="w-3.5 h-3.5 text-slate-400" />
                                                                                <span>{apt.doctor.full_name}</span>
                                                                            </div>
                                                                        )}
                                                                        {apt.type && (
                                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                                                <span>{apt.type}</span>
                                                                            </div>
                                                                        )}
                                                                        {apt.notes && (
                                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 max-w-full min-w-0 truncate bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                                                <AlertCircle className="w-3 h-3 text-slate-400" />
                                                                                <span className="italic">{apt.notes}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Debtors Widget Card */}
                    {debtors.filter(d => d.bakiye > 0).length > 0 && (
                        <Card className="border-white shadow-sm border-t-4 border-t-amber-500 overflow-hidden">
                            <CardHeader className="bg-white border-b border-slate-50 pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                        <Wallet className="h-5 w-5 text-amber-500" /> Bekleyen Ödemeler
                                    </CardTitle>
                                    <Link href="/finance/debtors" className="text-[10px] font-bold text-amber-600 hover:underline">TÜMÜ</Link>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="max-h-[300px] overflow-auto">
                                    {debtors.filter(d => d.bakiye > 0).slice(0, 5).map((debtor) => (
                                        <div key={debtor.hasta_id} className="p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => router.push(`/patients/${debtor.hasta_id}/finance`)}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700 group-hover:text-amber-600 transition-colors uppercase">
                                                        {debtor.hasta_adi}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">Bakiye Borç</span>
                                                </div>
                                                <span className="text-sm font-black text-amber-600">
                                                    {formatCurrency(debtor.bakiye)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Screen-Centered Brief Modal / Dialog */}
            <Dialog open={!!briefAppointment} onOpenChange={(open) => !open && setBriefAppointment(null)}>
                <DialogContent
                    showCloseButton={true}
                    className="w-[90vw] md:w-[45vw] lg:w-[35vw] min-w-[380px] max-w-[650px] p-0 shadow-2xl border-slate-200 rounded-2xl overflow-hidden bg-white z-50 animate-in zoom-in-95 duration-200"
                >
                    {briefAppointment && (
                        <>
                            {/* Modal Header */}
                            <DialogHeader className="bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white pr-12 text-left space-y-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
                                            <Stethoscope className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <DialogDescription className="text-[10px] uppercase font-bold tracking-wider text-indigo-100 block">
                                                Klinik Brief / Hızlı Bakış
                                            </DialogDescription>
                                            <DialogTitle className="text-base font-black uppercase tracking-tight text-white truncate max-w-[320px]">
                                                {briefAppointment.hasta ? `${briefAppointment.hasta.ad} ${briefAppointment.hasta.soyad}` : briefAppointment.title}
                                            </DialogTitle>
                                        </div>
                                    </div>
                                    <Badge className="bg-white/20 text-white hover:bg-white/20 border-none text-[10px] font-bold uppercase">
                                        {briefAppointment.type || 'Muayene'}
                                    </Badge>
                                </div>
                            </DialogHeader>

                            {/* Modal Body */}
                            <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto bg-slate-50/40">
                                {briefAppointment.clinical_brief && (briefAppointment.clinical_brief.son_muayene_tani || briefAppointment.clinical_brief.son_muayene_sikayet || briefAppointment.clinical_brief.son_not_icerik || briefAppointment.clinical_brief.son_muayene_sonuc || briefAppointment.clinical_brief.son_muayene_tedavi) ? (
                                    <>
                                        {/* Son Muayene Tarihi & Şikayet */}
                                        <div className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-xs space-y-2.5">
                                            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4 text-blue-500" />
                                                    Son Muayene
                                                </span>
                                                {briefAppointment.clinical_brief.son_muayene_tarih && (
                                                    <span className="text-xs font-semibold text-slate-600">
                                                        {format(new Date(briefAppointment.clinical_brief.son_muayene_tarih), 'dd.MM.yyyy', { locale: tr })}
                                                    </span>
                                                )}
                                            </div>

                                            {briefAppointment.clinical_brief.son_muayene_sikayet && (
                                                <div>
                                                    <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Şikayet / Başvuru</span>
                                                    <p className="text-xs text-slate-700 font-medium italic bg-slate-50 p-2.5 rounded-lg border border-slate-100/80">
                                                        &quot;{briefAppointment.clinical_brief.son_muayene_sikayet}&quot;
                                                    </p>
                                                </div>
                                            )}

                                            {briefAppointment.clinical_brief.son_muayene_tani && (
                                                <div>
                                                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">Tanı</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold py-1 px-2.5">
                                                            {briefAppointment.clinical_brief.son_muayene_tani}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Sonuç & Karar */}
                                        {briefAppointment.clinical_brief.son_muayene_sonuc && (
                                            <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 shadow-xs">
                                                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1.5">
                                                    Sonuç / Karar & Tavsiye
                                                </span>
                                                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                                    {briefAppointment.clinical_brief.son_muayene_sonuc}
                                                </p>
                                            </div>
                                        )}

                                        {/* Tedavi & Reçete */}
                                        {briefAppointment.clinical_brief.son_muayene_tedavi && (
                                            <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 shadow-xs">
                                                <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block mb-1.5">
                                                    Tedavi / İlaç Planı
                                                </span>
                                                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                                    {briefAppointment.clinical_brief.son_muayene_tedavi}
                                                </p>
                                            </div>
                                        )}

                                        {/* Son Takip Notu */}
                                        {briefAppointment.clinical_brief.son_not_icerik && (
                                            <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80 shadow-xs">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                                                        Son Takip / Kontrol Notu
                                                    </span>
                                                    {briefAppointment.clinical_brief.son_not_tarih && (
                                                        <span className="text-[11px] font-semibold text-amber-700">
                                                            {format(new Date(briefAppointment.clinical_brief.son_not_tarih), 'dd.MM.yyyy', { locale: tr })}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-700 italic leading-relaxed">
                                                    {briefAppointment.clinical_brief.son_not_icerik}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                                        <AlertCircle className="w-8 h-8 text-slate-300" />
                                        <p className="text-xs font-medium">Bu hasta için henüz geçmiş muayene veya takip notu kaydı bulunmuyor.</p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            {briefAppointment.hasta && (
                                <div className="p-3.5 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
                                    <Link
                                        href={`/patients/${briefAppointment.hasta.id}/examination`}
                                        className="flex-1"
                                        onClick={() => setBriefAppointment(null)}
                                    >
                                        <Button variant="outline" size="sm" className="w-full h-9 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50">
                                            <Stethoscope className="w-4 h-4 mr-2 text-blue-600" />
                                            Muayene Geçmişi
                                        </Button>
                                    </Link>
                                    <Link
                                        href={`/patients/${briefAppointment.hasta.id}`}
                                        className="flex-1"
                                        onClick={() => setBriefAppointment(null)}
                                    >
                                        <Button size="sm" className="w-full h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
                                            <User className="w-4 h-4 mr-2" />
                                            Hasta Kartı
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <CreateAppointmentDialog
                isOpen={showCreateDialog}
                onClose={() => {
                    setShowCreateDialog(false);
                    setEditingAppointment(undefined);
                    queryClient.invalidateQueries({ queryKey: ['appointments'] });
                }}
                appointment={editingAppointment}
            />
        </div >
    );
}

function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50/50 p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <Skeleton className="xl:col-span-2 h-96 rounded-xl" />
                <Skeleton className="h-96 rounded-xl" />
            </div>
        </div>
    );
}
