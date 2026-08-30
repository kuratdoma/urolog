'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormLabel } from '@/components/ui/form';
import { Plus, Trash2, Edit, LogOut, Printer, Calendar, Info, Users } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { CreateAppointmentDialog } from '@/components/appointments/create-appointment-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { formatPhoneNumber } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ReferenceInput } from './reference-input';
import { useSystemDefinitions } from '@/hooks/useSystemDefinitions';
import { ComboboxSelect } from '@/components/ui/combobox-select';

function validateTCKN(value: string) {
    if (!value) return true;
    if (typeof value !== 'string') return false;
    if (value.length !== 11) return false;
    if (!/^\d+$/.test(value)) return false;
    if (value[0] === '0') return false;

    const digits = value.split('').map(Number);
    const sumOdd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const sumEven = digits[1] + digits[3] + digits[5] + digits[7];

    const tenth = (sumOdd * 7 - sumEven) % 10;
    const eleventh = (sumOdd + sumEven + digits[9]) % 10;

    return tenth === digits[9] && eleventh === digits[10];
}

const patientSchema = z.object({
    ad: z.string().min(2, 'Ad zorunludur'),
    soyad: z.string().min(2, 'Soyad zorunludur'),
    tc_kimlik: z.string().optional(),
    dogum_tarihi: z.string().optional().refine((val) => {
        if (!val) return true;
        const year = parseInt(val.split('-')[0]);
        return year >= 1900 && year <= 2100;
    }, { message: "Geçerli bir yıl giriniz (1900-2100)" }),
    dogum_yeri: z.string().optional(),
    cinsiyet: z.string().optional(),
    medeni_hal: z.string().optional(),
    cocuk_sayisi: z.string().optional(),
    kan_grubu: z.string().optional(),
    meslek: z.string().optional(),
    kurum: z.string().optional(),
    sigorta: z.string().optional(),
    ozelsigorta: z.string().optional(),
    referans: z.string().optional(),
    doktor: z.string().optional(),
    protokol_no: z.string().optional(),
    cep_tel: z.string().optional(),
    ev_tel: z.string().optional(),
    email: z.string().email('Geçersiz email').optional().or(z.literal('')),
    adres: z.string().optional(),
    sokak_kapi_no: z.string().optional(),
    ilce: z.string().optional(),
    sehir: z.string().optional(),
    postakodu: z.string().optional(),
    kimlik_notlar: z.string().optional().nullable(),
    is_passport: z.boolean().default(false).optional(),
    // New Fields
    sms_izin: z.string().optional(),
    arama_izni: z.string().optional(),
    email_izin: z.string().optional(),
    iletisim_kaynagi: z.string().optional(),
    iletisim_tercihi: z.string().optional(),
    kayit_notu: z.string().optional(),
    iletisim_yakini_iliski: z.string().optional().nullable(),
    iletisim_yakini_tel: z.string().optional().nullable(),

}).superRefine((data, ctx) => {
    if (!data.is_passport && data.tc_kimlik && data.tc_kimlik.length > 0) {
        if (!validateTCKN(data.tc_kimlik)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Geçersiz TC Kimlik No",
                path: ["tc_kimlik"],
            });
        }
    }
});

type PatientFormValues = z.infer<typeof patientSchema>;

interface PatientFormProps {
    initialData?: any;
    onSubmit: (data: PatientFormValues) => void;
    isEditing?: boolean;
    onDelete?: () => void;
    patientId?: string;
    patientName?: string;
    isSubmitting?: boolean;
}

export function PatientForm({ initialData, onSubmit, isEditing = false, onDelete, patientId, patientName, isSubmitting = false }: PatientFormProps) {
    const router = useRouter();
    const [editMode, setEditMode] = useState(!initialData || isEditing);
    const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);



    const sanitizedInitialData: any = initialData ? Object.fromEntries(
        Object.entries(initialData).map(([key, value]) => [
            key,
            value === null || value === undefined ? ''
                : (typeof value === 'object' || typeof value === 'boolean') ? value
                    : String(value)
        ])
    ) : undefined;



    // Split address if it contains newline
    if (sanitizedInitialData && sanitizedInitialData.adres) {
        const parts = sanitizedInitialData.adres.split('\n');
        if (parts.length > 1) {
            sanitizedInitialData.adres = parts[0];
            sanitizedInitialData.sokak_kapi_no = parts.slice(1).join('\n');
        }
    }

    const form = useForm<PatientFormValues>({
        resolver: zodResolver(patientSchema),
        defaultValues: sanitizedInitialData || {
            ad: '', soyad: '', tc_kimlik: '', dogum_tarihi: '',
            dogum_yeri: '', cinsiyet: 'ERKEK', medeni_hal: 'EVLI',
            cocuk_sayisi: '', kan_grubu: '', meslek: '',
            kurum: '', sigorta: '', ozelsigorta: '', referans: '',
            doktor: '', protokol_no: '',
            cep_tel: '+90 ', ev_tel: '+90 ', email: '',
            adres: '', sokak_kapi_no: '', ilce: '', sehir: '', postakodu: '',
            kimlik_notlar: '',
            is_passport: sanitizedInitialData?.tc_kimlik ? !validateTCKN(String(sanitizedInitialData.tc_kimlik)) : false,
            // Defaults
            sms_izin: 'Evet',
            arama_izni: 'Evet',
            email_izin: 'Evet',
            iletisim_kaynagi: '',
            iletisim_tercihi: '',
            kayit_notu: '',
            iletisim_yakini_iliski: '',
            iletisim_yakini_tel: '+90 ',

        },
    });

    // Settings for dynamic sources
    const { data: settings = [] } = useQuery({
        queryKey: ['settings'],
        queryFn: () => api.settings.getAll()
    });


    // Unified System Definitions Hook
    const {
        doctors,
        institutions,
        occupations,
        insurances
    } = useSystemDefinitions(
        initialData?.doktor || '',
        (doc) => {
            if (!initialData?.doktor && !form.getValues('doktor')) {
                form.setValue('doktor', doc);
            }
        }
    );

    // Reset form when initialData changes (e.g. after refetch)
    useEffect(() => {
        if (initialData) {
            console.log('PatientForm received initialData:', initialData);

            const sanitized: any = Object.fromEntries(
                Object.entries(initialData).map(([key, value]) => [
                    key,
                    value === null || value === undefined ? ''
                        : (typeof value === 'object' || typeof value === 'boolean') ? value
                            : String(value)
                ])
            );



            // Split address for form
            if (sanitized.adres) {
                const parts = sanitized.adres.split('\n');
                if (parts.length > 1) {
                    sanitized.adres = parts[0];
                    sanitized.sokak_kapi_no = parts.slice(1).join('\n'); // Join rest in case of multiple lines
                }
            }
            // Auto-detect passport mode if TCKN is invalid
            if (sanitized.tc_kimlik && !validateTCKN(String(sanitized.tc_kimlik))) {
                sanitized.is_passport = true;
            }
            form.reset(sanitized);
        }
    }, [initialData, form]);

    const handleSubmit = (data: PatientFormValues) => {
        onSubmit(data);
        if (initialData) {
            setEditMode(false);
        }
    };

    const onError = (errors: any) => {
        console.error("Form validation errors:", errors);
        // You might want to show a toast here if errors are not obvious
    };

    return (
        <div className="space-y-6">
            {/* Top Action Bar */}
            <div className="bg-white p-2 rounded-lg border shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50 flex flex-col items-center gap-1 h-auto py-2" onClick={() => router.push('/patients/create')}>
                        <Plus className="h-5 w-5" />
                        <span className="text-[10px] font-bold">YENİ KAYIT</span>
                    </Button>
                    <Separator orientation="vertical" className="h-8 bg-slate-300" />
                    {initialData && (
                        <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 flex flex-col items-center gap-1 h-auto py-2" onClick={onDelete}>
                            <Trash2 className="h-5 w-5" />
                            <span className="text-[10px] font-bold">HASTA SİL</span>
                        </Button>
                    )}
                    <Separator orientation="vertical" className="h-8 bg-slate-300" />
                    <Button
                        variant="ghost"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex flex-col items-center gap-1 h-auto py-2"
                        disabled={isSubmitting}
                        onClick={() => {
                            if (editMode) {
                                form.handleSubmit(handleSubmit, onError)();
                            } else {
                                setEditMode(true);
                            }
                        }}
                    >
                        {editMode ? (
                            isSubmitting ? (
                                <span className="flex flex-col items-center gap-1"><div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div><span className="text-[10px] font-bold">KAYDEDİLİYOR</span></span>
                            ) : (
                                <span className="flex flex-col items-center gap-1"><div className="h-5 w-5 flex items-center justify-center font-bold text-lg">💾</div><span className="text-[10px] font-bold">KAYDET</span></span>
                            )
                        ) : (
                            <span className="flex flex-col items-center gap-1"><Edit className="h-5 w-5" /><span className="text-[10px] font-bold">DÜZENLE</span></span>
                        )}
                    </Button>
                    <Separator orientation="vertical" className="h-8 bg-slate-300" />
                    <Button variant="ghost" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 flex flex-col items-center gap-1 h-auto py-2" onClick={() => router.push('/patients')}>
                        <LogOut className="h-5 w-5" />
                        <span className="text-[10px] font-bold">ÇIKIŞ</span>
                    </Button>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 flex flex-col items-center gap-1 h-auto py-2"
                        onClick={() => setAppointmentDialogOpen(true)}
                    >
                        <Calendar className="h-5 w-5" />
                        <span className="text-[10px] font-bold">+ RANDEVU</span>
                    </Button>


                    <Separator orientation="vertical" className="h-8 bg-slate-300" />
                    <Button variant="ghost" className="text-slate-600 flex flex-col items-center gap-1 h-auto py-2" onClick={() => {
                        const id = patientId || initialData?.id || initialData?.hasta_rec_id;
                        if (id) window.open(`/print/patient/${id}`, '_blank');
                    }}>
                        <Printer className="h-5 w-5" />
                        <span className="text-[10px] font-bold">PRINT</span>
                    </Button>
                </div>
            </div>

            {/* Main Form */}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    {/* Command Center (Operational Metadata) - Single Row, No Header, Color-Coded */}
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mb-6">
                        <div className="px-4 py-2 flex flex-row items-center justify-between gap-x-8 gap-y-2 flex-wrap lg:flex-nowrap">

                            {/* İletişim Tercihi */}
                            <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">İletişim</FormLabel>
                                <FormField control={form.control} name="iletisim_tercihi" render={({ field }) => {
                                    const getPrefColor = (val: string) => {
                                        switch (val) {
                                            case 'Telefon': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
                                            case 'Whatsapp': return 'bg-pink-100 text-black border-pink-200';
                                            case 'Email': return 'bg-purple-100 text-purple-700 border-purple-200';
                                            case 'Diğer': return 'bg-brown-100 text-brown-700 border-brown-200';
                                            default: return 'bg-slate-50 text-slate-500 border-slate-100';
                                        }
                                    };
                                    return (
                                        <Select onValueChange={field.onChange} value={field.value || ""} disabled={!editMode}>
                                            <FormControl>
                                                <SelectTrigger className={`h-7 text-[10px] border flex-1 px-2 font-bold transition-colors ${getPrefColor(field.value || "")}`}>
                                                    <SelectValue placeholder="Seç" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Telefon" className="focus:bg-yellow-50">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-yellow-400" />
                                                        <span className="font-bold text-yellow-700">TELEFON</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="Whatsapp" className="focus:bg-pink-50">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-pink-400" />
                                                        <span className="font-bold text-pink-700">WHATSAPP</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="Email" className="focus:bg-purple-50">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-purple-400" />
                                                        <span className="font-bold text-purple-700">EMAİL</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="Diğer" className="focus:bg-red-50">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-red-400" />
                                                        <span className="font-bold text-red-700">DİĞER</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    );
                                }} />
                            </div>

                            {/* Arama İzni */}
                            <div className="flex items-center gap-3">
                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">Arama</FormLabel>
                                <FormField control={form.control} name="arama_izni" render={({ field }) => (
                                    <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded border border-slate-100 w-24">
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={!editMode}
                                            className={`h-6 flex-1 text-[9px] font-bold px-0 transition-all ${field.value === 'Evet' ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
                                            onClick={() => field.onChange('Evet')}
                                        >EVET</Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={!editMode}
                                            className={`h-6 flex-1 text-[9px] font-bold px-0 transition-all ${field.value === 'Hayır' ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
                                            onClick={() => field.onChange('Hayır')}
                                        >HAYIR</Button>
                                    </div>
                                )} />
                            </div>

                            {/* SMS İzni */}
                            <div className="flex items-center gap-3">
                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">SMS</FormLabel>
                                <FormField control={form.control} name="sms_izin" render={({ field }) => (
                                    <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded border border-slate-100 w-24">
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={!editMode}
                                            className={`h-6 flex-1 text-[9px] font-bold px-0 transition-all ${field.value === 'Evet' ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
                                            onClick={() => field.onChange('Evet')}
                                        >EVET</Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={!editMode}
                                            className={`h-6 flex-1 text-[9px] font-bold px-0 transition-all ${field.value === 'Hayır' ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
                                            onClick={() => field.onChange('Hayır')}
                                        >HAYIR</Button>
                                    </div>
                                )} />
                            </div>

                            {/* Email İzni */}
                            <div className="flex items-center gap-3">
                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">Email</FormLabel>
                                <FormField control={form.control} name="email_izin" render={({ field }) => (
                                    <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded border border-slate-100 w-24">
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={!editMode}
                                            className={`h-6 flex-1 text-[9px] font-bold px-0 transition-all ${field.value === 'Evet' ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
                                            onClick={() => field.onChange('Evet')}
                                        >EVET</Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={!editMode}
                                            className={`h-6 flex-1 text-[9px] font-bold px-0 transition-all ${field.value === 'Hayır' ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
                                            onClick={() => field.onChange('Hayır')}
                                        >HAYIR</Button>
                                    </div>
                                )} />
                            </div>

                            {/* İletişim Kaynağı */}
                            <div className="flex items-center gap-3 flex-[1.5] min-w-[200px]">
                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">Kaynak</FormLabel>
                                <FormField control={form.control} name="iletisim_kaynagi" render={({ field }) => {
                                    const defaultSources = ["Telefon", "Whatsapp", "Email", "Google", "Sosyal Medya", "Tavsiye", "Diğer"];
                                    const setting = settings?.find((s: any) => s.key === "iletisim_kaynaklari");
                                    let sources = defaultSources;
                                    if (setting?.value) {
                                        try {
                                            const parsed = JSON.parse(setting.value);
                                            if (Array.isArray(parsed)) sources = parsed;
                                        } catch (e) {
                                            if (typeof setting.value === 'string' && !setting.value.startsWith('[')) {
                                                sources = setting.value.split(',').map((s: string) => s.trim());
                                            }
                                        }
                                    }
                                    return (
                                        <div className="flex items-center gap-1.5 flex-1">
                                            <Select onValueChange={field.onChange} value={field.value || ""} disabled={!editMode}>
                                                <FormControl><SelectTrigger className="h-7 text-[10px] border-slate-100 bg-slate-50/50 px-2 font-medium"><SelectValue placeholder="Seç" /></SelectTrigger></FormControl>
                                                <SelectContent>{sources.map((src: string) => (<SelectItem key={src} value={src} className="text-[10px]">{src}</SelectItem>))}</SelectContent>
                                            </Select>
                                            <Popover>
                                                <PopoverTrigger asChild><Info className="h-3 w-3 text-slate-300 cursor-pointer hover:text-blue-500 transition-colors" /></PopoverTrigger>
                                                <PopoverContent className="w-auto p-2 text-[10px] bg-slate-800 text-white border-none shadow-xl"><p>Hasta Bize ilk nasıl ulaştı?</p></PopoverContent>
                                            </Popover>
                                        </div>
                                    )
                                }} />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-3">
                        {/* LEFT COLUMN - KİMLİK BİLGİLERİ (60%) */}
                        <div className="w-full lg:w-[66%] bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 rounded-sm bg-red-500/10 flex items-center justify-center">
                                        <Users className="w-3 h-3 text-red-600" />
                                    </div>
                                    <h2 className="font-bold text-xs text-red-600 uppercase tracking-wider">KİMLİK BİLGİLERİ</h2>
                                </div>
                                {form.watch('protokol_no') && (
                                    <div className="text-[11px] font-bold text-blue-600 tracking-wider">
                                        {form.watch('protokol_no')}
                                    </div>
                                )}
                            </div>

                            <div className="px-3 py-2 grid grid-cols-12 gap-x-3 gap-y-2">
                                {/* ROW 1: AD / SOYAD */}
                                <div className="col-span-6 space-y-1">
                                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">AD</FormLabel>
                                    <FormField control={form.control} name="ad" render={({ field }) => (
                                        <Input {...field} value={field.value ?? ''} disabled={!editMode} placeholder="Ad" className="h-8 text-sm font-mono border-slate-200 bg-white leading-relaxed" />
                                    )} />
                                </div>
                                <div className="col-span-6 space-y-1">
                                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">SOYAD</FormLabel>
                                    <FormField control={form.control} name="soyad" render={({ field }) => (
                                        <Input {...field} value={field.value ?? ''} disabled={!editMode} placeholder="Soyad" className="h-8 text-sm font-mono border-slate-200 bg-white leading-relaxed" />
                                    )} />
                                </div>

                                {/* ROW 2: TC KİMLİK NO / DOĞUM TARİHİ */}
                                <div className="col-span-6 space-y-1">
                                    <FormField control={form.control} name="is_passport" render={({ field }) => (
                                        <div className="flex items-center gap-2">
                                            <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{field.value ? "PASAPORT NO" : "TC KİMLİK NO"}</FormLabel>
                                            {editMode && (
                                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100">
                                                    <Checkbox id="is_passport_grid" checked={field.value} onCheckedChange={field.onChange} className="h-3 w-3" />
                                                    <label htmlFor="is_passport_grid" className="text-[8px] font-semibold text-slate-400 cursor-pointer">PASAPORT</label>
                                                </div>
                                            )}
                                        </div>
                                    )} />
                                    <FormField control={form.control} name="tc_kimlik" render={({ field }) => (
                                        <Input {...field} value={field.value ?? ''} disabled={!editMode} placeholder={form.watch('is_passport') ? "Pasaport No" : "11 Haneli Kimlik No"} className="h-8 text-sm font-mono border-slate-200 bg-white leading-relaxed" onChange={(e) => !form.watch('is_passport') ? field.onChange(e.target.value.replace(/\D/g, '').slice(0, 11)) : field.onChange(e.target.value)} />
                                    )} />
                                </div>
                                <div className="col-span-6 space-y-1">
                                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">DOĞUM TARİHİ</FormLabel>
                                    <FormField control={form.control} name="dogum_tarihi" render={({ field }) => (
                                        <Input type="date" {...field} value={field.value ?? ''} disabled={!editMode} className="h-8 text-sm font-mono border-slate-200 bg-white leading-relaxed" />
                                    )} />
                                </div>

                                {/* ROW 3: CİNSİYET / (MEDENİ HAL | ÇOCUK SAYISI) */}
                                <div className="col-span-6 space-y-1">
                                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">CİNSİYET</FormLabel>
                                    <FormField control={form.control} name="cinsiyet" render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value || ""} disabled={!editMode}>
                                            <FormControl><SelectTrigger className="h-8 text-sm font-mono border-slate-200 bg-white leading-relaxed"><SelectValue placeholder="Seçiniz" /></SelectTrigger></FormControl>
                                            <SelectContent><SelectItem value="ERKEK">Erkek</SelectItem><SelectItem value="KADIN">Kadın</SelectItem></SelectContent>
                                        </Select>
                                    )} />
                                </div>
                                <div className="col-span-6 grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">MEDENİ HAL</FormLabel>
                                        <FormField control={form.control} name="medeni_hal" render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || ""} disabled={!editMode}>
                                                <FormControl><SelectTrigger className="h-8 text-sm font-mono border-slate-200 bg-white leading-relaxed"><SelectValue placeholder="Seç" /></SelectTrigger></FormControl>
                                                <SelectContent><SelectItem value="EVLI">Evli</SelectItem><SelectItem value="BEKAR">Bekar</SelectItem><SelectItem value="DUL">Dul</SelectItem></SelectContent>
                                            </Select>
                                        )} />
                                    </div>
                                    <div className="space-y-1">
                                        <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">ÇOCUK</FormLabel>
                                        <FormField control={form.control} name="cocuk_sayisi" render={({ field }) => (
                                            <Input {...field} value={field.value ?? ''} disabled={!editMode} type="number" placeholder="0" className="h-8 text-sm font-mono border-slate-200 bg-white leading-relaxed" />
                                        )} />
                                    </div>
                                </div>

                                {/* ROW 4: MESLEK / ÖZEL SİGORTA */}
                                <div className="col-span-6 space-y-1">
                                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">MESLEK</FormLabel>
                                    <FormField control={form.control} name="meslek" render={({ field }) => (
                                        <ComboboxSelect value={field.value || ''} onChange={field.onChange} options={occupations} placeholder="Meslek seçiniz veya yazınız..." disabled={!editMode} />
                                    )} />
                                </div>
                                <div className="col-span-6 space-y-1">
                                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">ÖZEL SİGORTA</FormLabel>
                                    <FormField control={form.control} name="ozelsigorta" render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value || ""} disabled={!editMode}>
                                            <FormControl><SelectTrigger className="h-8 text-sm font-mono border-slate-200 bg-white leading-relaxed"><SelectValue placeholder="Sigorta Şirketi" /></SelectTrigger></FormControl>
                                            <SelectContent>{insurances.map(ins => <SelectItem key={ins} value={ins}>{ins}</SelectItem>)}</SelectContent>
                                        </Select>
                                    )} />
                                </div>

                                {/* ROW 5: REFERANS / DOKTOR */}
                                <div className="col-span-6 space-y-1">
                                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">REFERANS</FormLabel>
                                    <FormField control={form.control} name="referans" render={({ field }) => (
                                        <ReferenceInput value={field.value || ''} onChange={field.onChange} disabled={!editMode} className="h-8 text-xs" />
                                    )} />
                                </div>
                                <div className="col-span-6 space-y-1">
                                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">DOKTOR</FormLabel>
                                    <FormField control={form.control} name="doktor" render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value || ""} disabled={!editMode}>
                                            <FormControl><SelectTrigger className="h-8 text-sm font-mono border-slate-200 bg-white leading-relaxed"><SelectValue placeholder="Doktor" /></SelectTrigger></FormControl>
                                            <SelectContent>{doctors.map(doc => <SelectItem key={doc} value={doc}>{doc}</SelectItem>)}</SelectContent>
                                        </Select>
                                    )} />
                                </div>

                                {/* Hidden fields preserved for data integrity */}
                                <FormField control={form.control} name="kan_grubu" render={() => <input type="hidden" />} />
                                <FormField control={form.control} name="kurum" render={() => <input type="hidden" />} />
                            </div>
                        </div>

                        {/* RIGHT COLUMN - İLETİŞİM BİLGİLERİ (40%) */}
                        <div className="w-full lg:w-[34%] bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 rounded-sm bg-red-500/10 flex items-center justify-center">
                                        <Users className="w-3 h-3 text-red-600" />
                                    </div>
                                    <h2 className="font-bold text-xs text-red-600 uppercase tracking-wider">İLETİŞİM BİLGİLERİ</h2>
                                </div>
                            </div>

                            <div className="px-3 py-2 space-y-2">
                                {/* MOBİL TELEFON */}
                                <div className="space-y-1">
                                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">MOBİL TELEFON</FormLabel>
                                    <FormField control={form.control} name="cep_tel" render={({ field }) => (
                                        <Input
                                            {...field}
                                            value={field.value ?? ''}
                                            disabled={!editMode}
                                            placeholder="+90 5xx xxx xx xx"
                                            className="h-8 text-sm font-mono border-slate-200 bg-white leading-relaxed"
                                            onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                                            onFocus={(e) => {
                                                if (editMode && !e.target.value) field.onChange('+90 ');
                                            }}
                                        />
                                    )} />
                                </div>

                                {/* EV TELEFONU */}
                                <div className="space-y-1">
                                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">EV TELEFONU</FormLabel>
                                    <FormField control={form.control} name="ev_tel" render={({ field }) => (
                                        <Input
                                            {...field}
                                            value={field.value ?? ''}
                                            disabled={!editMode}
                                            placeholder="+90 xxx xxx xx xx"
                                            className="h-8 text-sm font-mono border-slate-200 bg-white leading-relaxed"
                                            onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                                            onFocus={(e) => {
                                                if (editMode && !e.target.value) field.onChange('+90 ');
                                            }}
                                        />
                                    )} />
                                </div>

                                {/* İLETİŞİM TELEFONU */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">İLETİŞİM TELEFONU</FormLabel>
                                        {form.watch('iletisim_yakini_iliski') && (
                                            <span className="text-[8px] font-semibold text-slate-400 italic truncate">
                                                ({form.watch('iletisim_yakini_iliski')})
                                            </span>
                                        )}
                                    </div>
                                    <FormField control={form.control} name="iletisim_yakini_tel" render={({ field }) => (
                                        <div className="relative flex items-center">
                                            <Input
                                                {...field}
                                                value={field.value ?? ''}
                                                disabled={!editMode}
                                                placeholder="+90 xxx xxx xx xx"
                                                className="h-8 text-sm font-mono border-slate-200 bg-white pr-8 w-full leading-relaxed"
                                                onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                                                onFocus={(e) => {
                                                    if (editMode && !e.target.value) field.onChange('+90 ');
                                                }}
                                            />
                                            {editMode && (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="absolute right-1 h-7 w-7 text-slate-400 hover:text-blue-500">
                                                            <Users className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-40 p-1 shadow-xl border-slate-100" align="end">
                                                        <div className="grid grid-cols-1 gap-1">
                                                            {["Anne", "Baba", "Kardeş", "Oğlu", "Kızı", "Arkadaşı", "Diğer"].map((rel) => (
                                                                <Button
                                                                    key={rel}
                                                                    variant="ghost"
                                                                    className="h-7 text-[10px] justify-start font-medium hover:bg-blue-50 hover:text-blue-600 px-3"
                                                                    onClick={() => form.setValue('iletisim_yakini_iliski', rel, { shouldDirty: true })}
                                                                >
                                                                    {rel}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                        </div>
                                    )} />
                                </div>

                                {/* E-POSTA */}
                                <div className="space-y-1">
                                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">E-POSTA</FormLabel>
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <Input {...field} value={field.value ?? ''} disabled={!editMode} placeholder="ornek@mail.com" className="h-8 text-sm font-mono border-slate-200 bg-white leading-relaxed" />
                                    )} />
                                </div>

                                {/* ADRES BİLGİLERİ Sub-section */}
                                <div className="pt-1">
                                    <h3 className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-2">ADRES BİLGİLERİ</h3>
                                    <div className="space-y-2">
                                        <div className="space-y-1">
                                            <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">ADRES</FormLabel>
                                            <FormField control={form.control} name="adres" render={({ field }) => (
                                                <Textarea
                                                    {...field}
                                                    value={field.value ?? ''}
                                                    disabled={!editMode}
                                                    placeholder="Mahalle, Sokak, Kapı No..."
                                                    rows={3}
                                                    className="text-sm font-mono border-slate-200 bg-white resize-none leading-relaxed"
                                                />
                                            )} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">İLÇE</FormLabel>
                                                <FormField control={form.control} name="ilce" render={({ field }) => (
                                                    <Input {...field} value={field.value ?? ''} disabled={!editMode} placeholder="İlçe" className="h-8 text-sm font-mono border-slate-200 bg-white leading-relaxed" />
                                                )} />
                                            </div>
                                            <div className="space-y-1">
                                                <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">ŞEHİR</FormLabel>
                                                <FormField control={form.control} name="sehir" render={({ field }) => (
                                                    <Input {...field} value={field.value ?? ''} disabled={!editMode} placeholder="Şehir" className="h-8 text-sm font-mono border-slate-200 bg-white leading-relaxed" />
                                                )} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col mt-4">
                        <div className="p-3">
                            <FormField control={form.control} name="kimlik_notlar" render={({ field }) => (
                                <Textarea
                                    {...field}
                                    value={field.value ?? ''}
                                    disabled={!editMode}
                                    placeholder="Hastanın tıbbi geçmişi, alerjileri veya özel durumları hakkında notlar..."
                                    className="min-h-[60px] text-sm font-mono border-slate-200 bg-white resize-none leading-relaxed"
                                />
                            )} />
                        </div>
                    </div>
                </form>


                {/* Footer Line - Existing Bottom Notes moved down effectively, but we keep it as container end */}
            </Form>

            <CreateAppointmentDialog
                isOpen={appointmentDialogOpen}
                onClose={() => setAppointmentDialogOpen(false)}
                patientId={patientId || initialData?.hasta_rec_id}
                patientName={patientName || (initialData ? `${initialData.ad} ${initialData.soyad}` : undefined)}
            />
        </div >
    );
}
