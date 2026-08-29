"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
    Settings,
    Users,
    Database,
    Building2,
    CreditCard,
    Save,
    Plus,
    Trash2,
    Upload,
    Clock,
    UserCircle,
    Pencil,
    Loader2,
    Info,
    ShieldCheck,
    Brain,
    Zap,
    Activity,
    Users2,
    CalendarDays,
    FlaskConical,
    Microscope,
    ClipboardList,
    Briefcase,
    FileText,
    Pill,
    Stethoscope,
    FileEdit,
    Wallet,
    Package,
    FileSignature
} from "lucide-react";
import { AuditLogsSettings } from "@/components/settings/audit-logs";
import { ConsentFormsSettings } from "@/components/settings/consent-forms-settings";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings-store";
import { useAuthStore } from "@/stores/auth-store";
import { Slider } from "@/components/ui/slider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, SystemUser, SystemUserCreate, SystemSetting, SystemSettingCreate, ICDTani, ICDTaniCreate } from "@/lib/api";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { DoctorsSettings } from "@/components/settings/doctors-settings";
import { DefinitionList } from "@/components/settings/definition-list";
import { AppointmentTypeSettings } from "@/components/settings/appointment-type-settings";
import { BiopsyTemplateSettings } from "@/components/settings/biopsy-template-settings";
import { DrugsSettings } from "@/components/settings/drugs-settings";
import { PrescriptionTemplateSettings } from "@/components/settings/prescription-template-settings";
import { GeneralTemplateSettings } from "@/components/settings/general-template-settings";
import { IntegrationsSettings } from "@/components/settings/integrations-settings";



// --- SUBSIDIARY COMPONENTS ---



export default function SettingsPage() {
    // --- Store ---
    const {
        logoUrl, logoWidth, setLogoUrl, setLogoWidth, setDarkMode, setCompactMode,
        examinationModules, setExaminationModule,
        showFinanceModule, showStockModule, setShowFinanceModule, setShowStockModule,
        aiScribeEnabled, aiScribeMode, aiHpvBriefingEnabled,
        setAiScribeEnabled, setAiScribeMode, setAiHpvBriefingEnabled,
        autoCapitalize, setAutoCapitalize
    } = useSettingsStore();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();



    // --- State: General ---
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- API: Settings ---
    const { data: settings = [], isLoading: isLoadingSettings, refetch: refetchSettings } = useQuery({
        queryKey: ['settings'],
        queryFn: api.settings.getAll,
    });

    // Helper to find setting value
    const getSetting = (key: string) => settings.find((s: SystemSetting) => s.key === key)?.value || '';

    const updateSettingsMutation = useMutation({
        mutationFn: (data: SystemSettingCreate[]) => api.settings.batchUpdate(data),
        onSuccess: () => {
            refetchSettings();
            toast.success("Ayarlar kaydedildi.");
        },
        onError: () => toast.error("Ayarlar kaydedilemedi.")
    });

    const [clinicInfo, setClinicInfo] = useState({ name: '', phone: '', address: '', footer: '' });
    const [scribePath, setScribePath] = useState('static/recordings');
    const [saveTranscript, setSaveTranscript] = useState(false);

    // Sync from API to local state


    const handleSaveClinicInfo = useCallback(() => {
        updateSettingsMutation.mutate([
            { key: 'clinic_name', value: clinicInfo.name },
            { key: 'clinic_phone', value: clinicInfo.phone },
            { key: 'clinic_address', value: clinicInfo.address },
            { key: 'clinic_footer', value: clinicInfo.footer }
        ]);
    }, [clinicInfo, updateSettingsMutation]);

    // Initialize preview from store on mount
    useEffect(() => {
        if (logoUrl) {
            setLogoPreview(logoUrl);
        }
    }, [logoUrl]);

    // --- State: Working Hours ---
    const [workingHours, setWorkingHours] = useState<Record<string, { isOpen: boolean, start: string, end: string }>>({
        monday: { isOpen: true, start: "09:00", end: "18:00" },
        tuesday: { isOpen: true, start: "09:00", end: "18:00" },
        wednesday: { isOpen: true, start: "09:00", end: "18:00" },
        thursday: { isOpen: true, start: "09:00", end: "18:00" },
        friday: { isOpen: true, start: "09:00", end: "18:00" },
        saturday: { isOpen: true, start: "09:00", end: "14:00" },
        sunday: { isOpen: false, start: "09:00", end: "18:00" },
    });



    const handleSaveWorkingHours = useCallback(() => {
        updateSettingsMutation.mutate([
            { key: 'working_hours', value: JSON.stringify(workingHours) }
        ]);
    }, [workingHours, updateSettingsMutation]);

    // --- State: Theme ---
    const [themeSettings, setThemeSettings] = useState({ darkMode: false, compactMode: false });

    // Sync from API to local state
    useEffect(() => {
        if (settings.length > 0) {
            setClinicInfo({
                name: getSetting('clinic_name'),
                phone: getSetting('clinic_phone'),
                address: getSetting('clinic_address'),
                footer: getSetting('clinic_footer')
            });
            const wh = getSetting('working_hours');
            if (wh) {
                try {
                    const parsed = JSON.parse(wh);
                    // Check if it is the old format (has weekdayStart)
                    if (parsed.weekdayStart) {
                        const newFormat: any = {
                            monday: { isOpen: true, start: parsed.weekdayStart, end: parsed.weekdayEnd },
                            tuesday: { isOpen: true, start: parsed.weekdayStart, end: parsed.weekdayEnd },
                            wednesday: { isOpen: true, start: parsed.weekdayStart, end: parsed.weekdayEnd },
                            thursday: { isOpen: true, start: parsed.weekdayStart, end: parsed.weekdayEnd },
                            friday: { isOpen: true, start: parsed.weekdayStart, end: parsed.weekdayEnd },
                            saturday: { isOpen: parsed.isWeekendActive, start: parsed.weekendStart || "09:00", end: parsed.weekendEnd || "14:00" },
                            sunday: { isOpen: false, start: "09:00", end: "18:00" },
                        };
                        setWorkingHours(newFormat);
                    } else {
                        setWorkingHours(parsed);
                    }
                } catch (e) {
                    console.error("Error parsing working hours", e);
                }
            }
            const dark = getSetting('theme_dark_mode') === 'true';
            const compact = getSetting('theme_compact') === 'true';
            setThemeSettings({
                darkMode: dark,
                compactMode: compact
            });
            setDarkMode(dark);
            setCompactMode(compact);

            const logo = getSetting('system_logo_url');
            if (logo && logo !== "[large_logo_placeholder]") {
                setLogoUrl(logo);
                setLogoPreview(logo);
            }
            const width = getSetting('system_logo_width');
            if (width) setLogoWidth(Number(width));
        }
    }, [settings]);

    // Fetch full logo separately if it was omitted in bulk API
    useEffect(() => {
        const loadLogo = async () => {
            try {
                const res = await api.settings.get('system_logo_url');
                if (res && res.value && res.value !== "[large_logo_placeholder]") {
                    setLogoUrl(res.value);
                    setLogoPreview(res.value);
                }
            } catch (error) {
                console.error("Failed to load logo", error);
            }
        };
        loadLogo();
    }, [setLogoUrl]);

    const handleSaveTheme = useCallback((newSettings: any) => {
        updateSettingsMutation.mutate([
            { key: 'theme_dark_mode', value: String(newSettings.darkMode) },
            { key: 'theme_compact', value: String(newSettings.compactMode) }
        ]);
        setDarkMode(newSettings.darkMode);
        setCompactMode(newSettings.compactMode);
    }, [updateSettingsMutation, setDarkMode, setCompactMode]);

    // --- UI State ---
    const [activeCategory, setActiveCategory] = useState('clinical');
    const [activeDefinition, setActiveDefinition] = useState('doctors');

    // --- API: Users ---
    const { data: users = [], isLoading: isLoadingUsers } = useQuery({
        queryKey: ['users'],
        queryFn: api.auth.getUsers,
    });

    const createUserMutation = useMutation({
        mutationFn: (data: SystemUserCreate) => api.auth.createUser(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success("Yeni kullanıcı oluşturuldu.");
            setIsUserDialogOpen(false);
            resetUserForm();
        },
        onError: (error: any) => {
            toast.error(error?.message || "Kullanıcı oluşturulamadı.");
        }
    });

    const updateUserMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<SystemUserCreate> }) => api.auth.updateUser(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success("Kullanıcı güncellendi.");
            setIsUserDialogOpen(false);
            resetUserForm();
        },
        onError: (error: any) => {
            toast.error(error?.message || "Kullanıcı güncellenemedi.");
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: (id: string) => api.auth.deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success("Kullanıcı silindi.");
            setIsDeleteDialogOpen(false);
            setUserToDelete(null);
        },
        onError: (error: any) => {
            toast.error(error?.message || "Kullanıcı silinemedi.");
        }
    });

    // --- State: User Dialog ---
    const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [newUser, setNewUser] = useState({
        full_name: '',
        username: '',
        password: '',
        email: '',
        role: 'DOCTOR' as string,
        is_active: true,
        is_superuser: false,
    });
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [confirmPassword, setConfirmPassword] = useState('');


    const compressImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Canvas context is not available"));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                const dataUrl = canvas.toDataURL(format, 0.8);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        });
    };

    // Handlers: Logo
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Compress/resize the logo to a maximum of 400x400 to optimize DB payload
                const compressedBase64 = await compressImage(file, 400, 400);
                setLogoPreview(compressedBase64);
                toast.success("Logo seçildi ve optimize edildi. Kaydetmek için 'Yükle' butonuna basınız.");
            } catch (err) {
                console.error("Logo compression failed, falling back to original", err);
                if (file.size > 10 * 1024 * 1024) { // 10MB limit
                    toast.error("Dosya boyutu 10MB'dan büyük olamaz.");
                    return;
                }
                const reader = new FileReader();
                reader.onloadend = () => {
                    setLogoPreview(reader.result as string);
                    toast.success("Logo seçildi. Kaydetmek için 'Yükle' butonuna basınız.");
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleSaveLogo = () => {
        if (logoPreview) {
            setLogoUrl(logoPreview);
            updateSettingsMutation.mutate([
                { key: 'system_logo_url', value: logoPreview },
                { key: 'system_logo_width', value: String(logoWidth) }
            ]);
            // toast success handled by mutation
        }
    };

    const resetUserForm = useCallback(() => {
        setNewUser({ full_name: '', username: '', role: 'DOCTOR', password: '', email: '', is_active: true, is_superuser: false });
        setConfirmPassword('');
        setEditingUserId(null);
    }, []);

    const handleSaveUser = useCallback(() => {
        if (!newUser.full_name || !newUser.email) {
            toast.error("Lütfen ad ve e-posta adresi giriniz.");
            return;
        }

        if (newUser.password !== confirmPassword) {
            toast.error("Şifreler eşleşmiyor.");
            return;
        }

        if (!editingUserId && !newUser.password) {
            toast.error("Yeni kullanıcı için şifre gereklidir.");
            return;
        }

        const userData: any = {
            full_name: newUser.full_name,
            email: newUser.email,
            role: newUser.role,
            is_active: newUser.is_active,
            is_superuser: newUser.role === 'ADMIN' || newUser.is_superuser,
        };

        if (newUser.password) {
            userData.password = newUser.password;
        }

        if (editingUserId) {
            updateUserMutation.mutate({ id: editingUserId, data: userData });
        } else {
            createUserMutation.mutate(userData as any);
        }
    }, [newUser, confirmPassword, editingUserId, updateUserMutation, createUserMutation]);

    const handleEditUser = useCallback((user: SystemUser) => {
        setNewUser({
            full_name: user.full_name || '',
            username: user.username,
            role: user.role || 'DOCTOR',
            password: '',
            email: user.email || '',
            is_active: user.is_active,
            is_superuser: user.is_superuser
        });
        setEditingUserId(user.id);
        setConfirmPassword('');
        setIsUserDialogOpen(true);
    }, []);

    const handleDeleteUser = useCallback((id: string) => {
        setUserToDelete(id);
        setIsDeleteDialogOpen(true);
    }, []);



    return (
        <div className="flex h-full flex-col gap-6 p-6 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        <Settings className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 leading-tight">Sistem Ayarları</h2>
                        <div className="text-xs text-slate-500">
                            Uygulama yapılandırması, kullanıcılar ve tanımlamalar
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1">
                <Tabs defaultValue="general" className="space-y-6">
                    <TabsList className="bg-white p-1 border border-slate-200 rounded-xl w-full justify-start h-12 overflow-x-auto flex-nowrap">
                        <TabsTrigger value="general" className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                            <Building2 className="h-4 w-4" /> Genel & Kurum
                        </TabsTrigger>
                        <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                            <Users className="h-4 w-4" /> Kullanıcılar & Yetki
                        </TabsTrigger>
                        <TabsTrigger value="definitions" className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                            <Database className="h-4 w-4" /> Tanımlar
                        </TabsTrigger>
                        <TabsTrigger value="consent-forms" className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                            <FileText className="h-4 w-4" /> Onam Formları
                        </TabsTrigger>
                        <TabsTrigger value="integrations" className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                            <Zap className="h-4 w-4" /> Entegrasyonlar
                        </TabsTrigger>
                        <TabsTrigger value="audit" className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                            <ShieldCheck className="h-4 w-4" /> Denetim Kayıtları
                        </TabsTrigger>
                    </TabsList>

                    {/* GENERAL SETTINGS */}
                    <TabsContent value="general">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            {/* Klinik Bilgileri & Logo - Combined Card */}
                            <Card className="border-slate-100 shadow-sm md:col-span-2">
                                <CardHeader className="py-3 px-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Building2 className="h-3.5 w-3.5 text-teal-500" />
                                            Klinik Bilgileri & Logo
                                        </CardTitle>
                                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={handleSaveClinicInfo} disabled={updateSettingsMutation.isPending}>
                                            {updateSettingsMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-4 pb-4 pt-0">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Left: Clinic Info */}
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <Label className="text-[10px] text-slate-500">Klinik Adı</Label>
                                                    <Input value={clinicInfo.name} onChange={(e) => setClinicInfo(prev => ({ ...prev, name: e.target.value }))} placeholder="Klinik adı" className="h-8 text-xs" />
                                                </div>
                                                <div>
                                                    <Label className="text-[10px] text-slate-500">Telefon</Label>
                                                    <Input value={clinicInfo.phone} onChange={(e) => setClinicInfo(prev => ({ ...prev, phone: e.target.value }))} placeholder="+90 212 555 00 00" className="h-8 text-xs" />
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-[10px] text-slate-500">Adres</Label>
                                                <Input value={clinicInfo.address} onChange={(e) => setClinicInfo(prev => ({ ...prev, address: e.target.value }))} placeholder="Adres" className="h-8 text-xs" />
                                            </div>
                                            <div>
                                                <Label className="text-[10px] text-slate-500">Kaşe / Alt Bilgi</Label>
                                                <Textarea value={clinicInfo.footer} onChange={(e) => setClinicInfo(prev => ({ ...prev, footer: e.target.value }))} placeholder="Dr. Ad Soyad - Dip. No: ..." className="min-h-[50px] text-xs" />
                                            </div>
                                        </div>

                                        {/* Right: Logo */}
                                        <div className="space-y-3 md:border-l md:pl-4 border-slate-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Upload className="h-3.5 w-3.5 text-blue-500" />
                                                <span className="text-xs font-semibold text-slate-600">Logo</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="h-16 w-16 shrink-0 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors overflow-hidden"
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    {logoPreview ? (
                                                        <img src={logoPreview} alt="Logo" className="object-contain w-full h-full" />
                                                    ) : (
                                                        <Upload className="h-5 w-5 text-slate-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <p className="text-[10px] text-slate-400">PNG/JPG, max 10MB</p>
                                                    <div className="flex gap-1.5">
                                                        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => fileInputRef.current?.click()}>Seç</Button>
                                                        <Button size="sm" className="h-7 text-xs px-2" onClick={handleSaveLogo} disabled={!logoPreview || logoPreview === logoUrl}>Yükle</Button>
                                                    </div>
                                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs">Genişlik</Label>
                                                    <span className="text-[10px] font-mono text-slate-400">{logoWidth}px</span>
                                                </div>
                                                <Slider value={[logoWidth]} onValueChange={(vals) => setLogoWidth(vals[0])} max={200} min={50} step={1} className="w-full" />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Çalışma Saatleri - Compact */}
                            <Card className="border-slate-100 shadow-sm md:row-span-2">
                                <CardHeader className="py-3 px-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Clock className="h-3.5 w-3.5 text-orange-500" />
                                            Çalışma Saatleri
                                        </CardTitle>
                                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={handleSaveWorkingHours}>
                                            <Save className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-4 pb-4 pt-0">
                                    <div className="space-y-1.5">
                                        {[
                                            { key: 'monday', label: 'Pzt' },
                                            { key: 'tuesday', label: 'Sal' },
                                            { key: 'wednesday', label: 'Çar' },
                                            { key: 'thursday', label: 'Per' },
                                            { key: 'friday', label: 'Cum' },
                                            { key: 'saturday', label: 'Cmt' },
                                            { key: 'sunday', label: 'Paz' }
                                        ].map((day) => {
                                            const daySettings = workingHours[day.key] || { isOpen: false, start: "09:00", end: "18:00" };
                                            return (
                                                <div key={day.key} className={cn(
                                                    "flex items-center gap-2 py-1 px-2 rounded-md border transition-colors",
                                                    daySettings.isOpen ? "bg-white border-slate-200" : "bg-slate-50 border-transparent opacity-60"
                                                )}>
                                                    <Switch
                                                        checked={daySettings.isOpen}
                                                        onCheckedChange={(checked) => setWorkingHours(prev => ({ ...prev, [day.key]: { ...prev[day.key], isOpen: checked } }))}
                                                        className="scale-[0.6] data-[state=checked]:bg-green-500"
                                                    />
                                                    <Label className={cn("text-[10px] font-bold w-6", daySettings.isOpen ? "text-slate-700" : "text-slate-400")}>{day.label}</Label>
                                                    {daySettings.isOpen ? (
                                                        <div className="flex items-center gap-1 flex-1">
                                                            <Input type="time" value={daySettings.start} onChange={(e) => setWorkingHours(prev => ({ ...prev, [day.key]: { ...prev[day.key], start: e.target.value } }))} className="h-6 text-[10px] px-1 w-[70px]" />
                                                            <span className="text-slate-300 text-[10px]">-</span>
                                                            <Input type="time" value={daySettings.end} onChange={(e) => setWorkingHours(prev => ({ ...prev, [day.key]: { ...prev[day.key], end: e.target.value } }))} className="h-6 text-[10px] px-1 w-[70px]" />
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic flex-1 text-center">Kapalı</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* AI Scribe & Metin Ayarları - Combined Compact */}
                            <Card className="border-slate-100 shadow-sm md:col-span-2">
                                <CardHeader className="py-3 px-4">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Settings className="h-3.5 w-3.5 text-slate-500" />
                                        Gelişmiş Ayarlar
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pb-4 pt-0">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Otomatik Büyük Harf */}
                                        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Activity className="h-4 w-4 text-green-500" />
                                                    <div>
                                                        <Label className="text-xs font-bold">Otomatik Büyük Harf</Label>
                                                        <p className="text-[10px] text-slate-400">Tüm metin girişlerini BÜYÜK HARFE çevir</p>
                                                    </div>
                                                </div>
                                                <Switch checked={autoCapitalize} onCheckedChange={setAutoCapitalize} className="scale-90 data-[state=checked]:bg-green-600" />
                                            </div>
                                        </div>

                                        {/* Mikro-enerji Modülü (Lipus) */}
                                        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Activity className="h-4 w-4 text-indigo-500" />
                                                    <div>
                                                        <Label className="text-xs font-bold">Mikro-enerji (Lipus) Modülü</Label>
                                                        <p className="text-[10px] text-slate-400">Menüde klinik işlem kısayolu</p>
                                                    </div>
                                                </div>
                                                <Switch checked={examinationModules?.microEnergyModule ?? true} onCheckedChange={(c) => setExaminationModule('microEnergyModule', c)} className="scale-90 data-[state=checked]:bg-indigo-600" />
                                            </div>
                                        </div>

                                        {/* Finansal İşlemler */}
                                        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Wallet className="h-4 w-4 text-emerald-500" />
                                                    <div>
                                                        <Label className="text-xs font-bold">Finansal İşlemler</Label>
                                                        <p className="text-[10px] text-slate-400">Finans paneli ve gelir/gider takibi</p>
                                                    </div>
                                                </div>
                                                <Switch checked={showFinanceModule} onCheckedChange={setShowFinanceModule} className="scale-90 data-[state=checked]:bg-emerald-600" />
                                            </div>
                                        </div>

                                        {/* Stok Yönetimi */}
                                        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Package className="h-4 w-4 text-blue-500" />
                                                    <div>
                                                        <Label className="text-xs font-bold">Stok Yönetimi</Label>
                                                        <p className="text-[10px] text-slate-400">Envanter ve stok takibi</p>
                                                    </div>
                                                </div>
                                                <Switch checked={showStockModule} onCheckedChange={setShowStockModule} className="scale-90 data-[state=checked]:bg-blue-600" />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                        </div>
                    </TabsContent>

                    {/* USERS */}
                    <TabsContent value="users">
                        <Card className="border-white shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            Kullanıcı Yönetimi
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600 rounded-full">
                                                        <Info className="h-4 w-4" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[450px] text-sm p-5 space-y-4" align="start">
                                                    <div className="font-semibold text-slate-800 pb-2 border-b flex items-center gap-2">
                                                        <ShieldCheck className="h-4 w-4 text-blue-500" />
                                                        Kullanıcı Yetki Seviyeleri (RBAC)
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="text-xs leading-relaxed"><span className="font-bold text-blue-600">ADMIN:</span> Sistemde tam yetkilidir. Modül kısıtlaması yoktur, tüm kullanıcıları yönetebilir ve yeni admin oluşturabilir.</div>
                                                        <div className="text-xs leading-relaxed"><span className="font-bold text-emerald-600">DOCTOR:</span> Klinik, Lab, Görüntüleme vb. tıbbi işlemlerde tam yetkilidir. Kullanıcı ekleyebilir ancak <span className="font-semibold underline">yeni ADMIN oluşturamaz</span> ve mevcut adminleri silemez.</div>
                                                        <div className="text-xs leading-relaxed"><span className="font-bold text-indigo-600">NURSE:</span> Klinik verileri okuyabilir ve kısıtlı girişler yapabilir. Laboratuvar/Görüntüleme kısımlarına erişebilir ancak kullanıcı yönetemez.</div>
                                                        <div className="text-xs leading-relaxed"><span className="font-bold text-orange-600">TECHNICIAN:</span> Sadece Laboratuvar ve Görüntüleme modüllerine tam yetkiyle veri girişi yapabilir. Diğer hasta verilerini (muayene vb.) değiştiremez.</div>
                                                        <div className="text-xs leading-relaxed"><span className="font-bold text-purple-600">FRONTDESK:</span> Sekreter. Randevu, vezne ve hasta kaydı işlemlerinde tam yetkilidir. Tıbbi verilere sadece okuma amaçlı (read-only) erişebilir, kullanıcı yönetemez.</div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </CardTitle>
                                        <CardDescription>Doktor, sekreter ve diğer kullanıcı hesapları yönetimi</CardDescription>
                                    </div>
                                </div>
                                <Dialog open={isUserDialogOpen} onOpenChange={(val) => { setIsUserDialogOpen(val); if (!val) resetUserForm(); }}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="h-4 w-4 mr-2" /> Yeni Kullanıcı
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px]">
                                        <DialogHeader>
                                            <DialogTitle>{editingUserId ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}</DialogTitle>
                                            <DialogDescription>
                                                Kullanıcı bilgilerini ve yetki seviyesini belirleyin.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Ad Soyad</Label>
                                                <Input value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="Örn: Dr. Ali Veli" />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>E-posta (Giriş Kimliği)</Label>
                                                    <Input
                                                        type="email"
                                                        value={newUser.email}
                                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value, username: e.target.value })}
                                                        placeholder="ornek@email.com"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Şifre {editingUserId && <span className="text-xs text-slate-400 font-normal">(Değiştirme: Boş Bırakın)</span>}</Label>
                                                    <Input
                                                        type="password"
                                                        value={newUser.password}
                                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                                        placeholder="******"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Şifre Tekrar</Label>
                                                    <Input
                                                        type="password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        placeholder="******"
                                                        className={newUser.password && confirmPassword && newUser.password !== confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-sm font-semibold">Yetki Seviyesi (Rol)</Label>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {user?.role === 'ADMIN' && (
                                                        <label className={cn(
                                                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                                            newUser.role === 'ADMIN' ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                                                        )}>
                                                            <input
                                                                type="radio"
                                                                name="role"
                                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                                checked={newUser.role === 'ADMIN'}
                                                                onChange={() => setNewUser({ ...newUser, role: 'ADMIN', is_superuser: true })}
                                                            />
                                                            <div>
                                                                <div className="font-medium text-sm text-slate-900">Tam Yetki (Yönetici)</div>
                                                                <div className="text-xs text-slate-500">Tüm ayarlara ve kayıtlara tam erişim.</div>
                                                            </div>
                                                        </label>
                                                    )}

                                                    <label className={cn(
                                                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                                        newUser.role === 'DOCTOR' ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                                                    )}>
                                                        <input
                                                            type="radio"
                                                            name="role"
                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                            checked={newUser.role === 'DOCTOR'}
                                                            onChange={() => setNewUser({ ...newUser, role: 'DOCTOR', is_superuser: false })}
                                                        />
                                                        <div>
                                                            <div className="font-medium text-sm text-slate-900">Klinik & Hasta Yönetimi (Doktor)</div>
                                                            <div className="text-xs text-slate-500">Hasta kayıtları, muayene ve operasyon yönetimi.</div>
                                                        </div>
                                                    </label>

                                                    <label className={cn(
                                                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                                        newUser.role === 'NURSE' ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                                                    )}>
                                                        <input
                                                            type="radio"
                                                            name="role"
                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                            checked={newUser.role === 'NURSE'}
                                                            onChange={() => setNewUser({ ...newUser, role: 'NURSE', is_superuser: false })}
                                                        />
                                                        <div>
                                                            <div className="font-medium text-sm text-slate-900">Hemşire</div>
                                                            <div className="text-xs text-slate-500">Hasta takibi ve tedavi yönetimi.</div>
                                                        </div>
                                                    </label>

                                                    <label className={cn(
                                                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                                        newUser.role === 'TECHNICIAN' ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                                                    )}>
                                                        <input
                                                            type="radio"
                                                            name="role"
                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                            checked={newUser.role === 'TECHNICIAN'}
                                                            onChange={() => setNewUser({ ...newUser, role: 'TECHNICIAN', is_superuser: false })}
                                                        />
                                                        <div>
                                                            <div className="font-medium text-sm text-slate-900">Teknisyen (Lab/Görüntüleme)</div>
                                                            <div className="text-xs text-slate-500">Sadece Laboratuvar ve Görüntüleme erişimi.</div>
                                                        </div>
                                                    </label>

                                                    <label className={cn(
                                                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                                        newUser.role === 'FRONTDESK' ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                                                    )}>
                                                        <input
                                                            type="radio"
                                                            name="role"
                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                            checked={newUser.role === 'FRONTDESK'}
                                                            onChange={() => setNewUser({ ...newUser, role: 'FRONTDESK', is_superuser: false })}
                                                        />
                                                        <div>
                                                            <div className="font-medium text-sm text-slate-900">Randevu & Kayıt (Sekreter)</div>
                                                            <div className="text-xs text-slate-500">Sadece hasta kaydı ve randevu işlemleri.</div>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>

                                            {editingUserId && (
                                                <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                                                    <div className="space-y-0.5">
                                                        <Label className="text-sm font-medium">Kullanıcı Durumu</Label>
                                                        <div className="text-xs text-slate-500">Kullanıcının sisteme giriş yapabilmesi</div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("text-xs font-bold", newUser.is_active ? "text-emerald-600" : "text-red-600")}>
                                                            {newUser.is_active ? 'AKTİF' : 'PASİF'}
                                                        </span>
                                                        <Switch
                                                            checked={newUser.is_active}
                                                            onCheckedChange={(checked) => setNewUser({ ...newUser, is_active: checked })}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <DialogFooter>
                                            <Button variant="ghost" onClick={() => setIsUserDialogOpen(false)}>İptal</Button>
                                            <Button onClick={handleSaveUser} disabled={createUserMutation.isPending || updateUserMutation.isPending}>
                                                {(createUserMutation.isPending || updateUserMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Kaydet
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border border-slate-200">
                                    <div className="grid grid-cols-12 gap-4 p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                        <div className="col-span-4">Ad Soyad</div>
                                        <div className="col-span-3">E-posta</div>
                                        <div className="col-span-2">Rol</div>
                                        <div className="col-span-2 text-right">Durum</div>
                                        <div className="col-span-1 text-center">İşlem</div>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {isLoadingUsers ? (
                                            <div className="p-8 text-center text-slate-400">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                                Yükleniyor...
                                            </div>
                                        ) : users.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400">
                                                Henüz kullanıcı bulunmuyor.
                                            </div>
                                        ) : (
                                            users.map((user) => (
                                                <div key={user.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-slate-50 transition-colors">
                                                    <div className="col-span-4 font-medium text-slate-900 flex items-center gap-2">
                                                        <UserCircle className="h-5 w-5 text-slate-400" />
                                                        {user.full_name || user.email || user.username}
                                                    </div>
                                                    <div className="col-span-3 text-slate-600 truncate" title={user.email || user.username}>
                                                        {user.email || user.username}
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className={cn(
                                                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                            user.role === 'ADMIN' ? "bg-purple-100 text-purple-700" :
                                                                user.role === 'DOCTOR' ? "bg-blue-100 text-blue-700" :
                                                                    user.role === 'NURSE' ? "bg-green-100 text-green-700" :
                                                                        "bg-slate-100 text-slate-700"
                                                        )}>
                                                            {user.role === 'ADMIN' ? 'Yönetici' :
                                                                user.role === 'DOCTOR' ? 'Doktor' :
                                                                    user.role === 'NURSE' ? 'Hemşire' : 'Sekreter'}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2 text-right">
                                                        <span className={cn("text-xs font-bold", user.is_active ? "text-emerald-600" : "text-red-600")}>
                                                            {user.is_active ? 'Aktif' : 'Pasif'}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-1 flex justify-center gap-1">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-blue-600" onClick={() => handleEditUser(user)}>
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => handleDeleteUser(user.id)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* DEFINITIONS */}
                    <TabsContent value="definitions">
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col md:flex-row gap-4">
                                {/* Categories Sidebar */}
                                <div className="w-full md:w-64 space-y-2">
                                    <div className="px-3 py-2">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Tanım Grupları</h3>
                                        <div className="space-y-1">
                                            {[
                                                { id: 'clinical', name: 'Klinik Tanımlar', icon: <Database className="w-4 h-4" /> },
                                                { id: 'surgical', name: 'Operasyon Tanımları', icon: <Activity className="w-4 h-4" /> },
                                                { id: 'financial', name: 'Finansal Tanımlar', icon: <CreditCard className="w-4 h-4" /> },
                                                { id: 'templates', name: 'Şablon Yönetimi', icon: <FileText className="w-4 h-4" /> },
                                            ].map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => {
                                                        setActiveCategory(cat.id);
                                                        // Auto-select first item of category
                                                        if (cat.id === 'clinical') setActiveDefinition('doctors');
                                                        if (cat.id === 'surgical') setActiveDefinition('hastaneler');
                                                        if (cat.id === 'financial') setActiveDefinition('institutions');
                                                        if (cat.id === 'templates') setActiveDefinition('biopsy-templates');
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                                                        activeCategory === cat.id
                                                            ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                                                            : "text-slate-600 hover:bg-slate-100"
                                                    )}
                                                >
                                                    {cat.icon}
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <Separator className="my-2" />
                                    <div className="px-3 py-2">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Tanım Listeleri</h3>
                                        <div className="space-y-1">
                                            {activeCategory === 'clinical' && [
                                                { id: 'doctors', name: 'Doktorlar & Ekip', icon: <Users2 className="w-4 h-4" /> },
                                                { id: 'appointment-types', name: 'Randevu Türleri', icon: <CalendarDays className="w-4 h-4" /> },
                                                { id: 'imaging', name: 'Tetkik Tanımları (Rad)', icon: <Microscope className="w-4 h-4" /> },
                                                { id: 'followup', name: 'Takip Konuları', icon: <ClipboardList className="w-4 h-4" /> },
                                                { id: 'anesthesia', name: 'Anestezi Tipleri', icon: <Activity className="w-4 h-4" /> },
                                                { id: 'occupations', name: 'Meslek Listesi', icon: <Briefcase className="w-4 h-4" /> },
                                                { id: 'urine-antibiogram', name: 'İdrar Antibiyogram Tanımı', icon: <FlaskConical className="w-4 h-4" /> },
                                            ].map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setActiveDefinition(cat.id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                                                        activeDefinition === cat.id
                                                            ? "bg-slate-900 text-white"
                                                            : "text-slate-500 hover:bg-slate-200/50"
                                                    )}
                                                >
                                                    {cat.icon}
                                                    {cat.name}
                                                </button>
                                            ))}
                                            {activeCategory === 'surgical' && [
                                                { id: 'hastaneler', name: 'Hastane', icon: <Building2 className="w-4 h-4" /> },
                                                { id: 'cerrahlar', name: 'Cerrah', icon: <Users2 className="w-4 h-4" /> },
                                                { id: 'asistanlar', name: 'Asistan', icon: <Users2 className="w-4 h-4" /> },
                                                { id: 'hemsireler', name: 'Hemşire', icon: <Users2 className="w-4 h-4" /> },
                                                { id: 'anesteziPersonelleri', name: 'Anestezi', icon: <Users2 className="w-4 h-4" /> },
                                            ].map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setActiveDefinition(cat.id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                                                        activeDefinition === cat.id
                                                            ? "bg-slate-900 text-white"
                                                            : "text-slate-500 hover:bg-slate-200/50"
                                                    )}
                                                >
                                                    {cat.icon}
                                                    {cat.name}
                                                </button>
                                            ))}
                                            {activeCategory === 'financial' && [
                                                { id: 'institutions', name: 'Kurumlar', icon: <Building2 className="w-4 h-4" /> },
                                                { id: 'insurances', name: 'Özel Sigortalar', icon: <ShieldCheck className="w-4 h-4" /> },
                                            ].map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setActiveDefinition(cat.id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                                                        activeDefinition === cat.id
                                                            ? "bg-slate-900 text-white"
                                                            : "text-slate-500 hover:bg-slate-200/50"
                                                    )}
                                                >
                                                    {cat.icon}
                                                    {cat.name}
                                                </button>
                                            ))}
                                            {activeCategory === 'templates' && [
                                                { id: 'biopsy-templates', name: 'TRUS Biyopsi Şablonu', icon: <ClipboardList className="w-4 h-4" /> },
                                                { id: 'prescription-templates', name: 'Reçete Şablonları', icon: <Pill className="w-4 h-4" /> },
                                                { id: 'operation-notes', name: 'Ameliyat Notu Şablonları', icon: <FileSignature className="w-4 h-4" /> },
                                                { id: 'medical-interventions', name: 'Tıbbi Müdahale Şablonları', icon: <Stethoscope className="w-4 h-4" /> },
                                            ].map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setActiveDefinition(cat.id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                                                        activeDefinition === cat.id
                                                            ? "bg-slate-900 text-white"
                                                            : "text-slate-500 hover:bg-slate-200/50"
                                                    )}
                                                >
                                                    {cat.icon}
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Content Area */}
                                <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 min-h-[640px] shadow-sm">
                                    {activeDefinition === 'doctors' && <DoctorsSettings />}
                                    {activeDefinition === 'hastaneler' && <DefinitionList title="Hastane" category="hastaneler" />}
                                    {activeDefinition === 'cerrahlar' && <DefinitionList title="Cerrah" category="cerrahlar" />}
                                    {activeDefinition === 'asistanlar' && <DefinitionList title="Asistan" category="asistanlar" />}
                                    {activeDefinition === 'anesteziPersonelleri' && <DefinitionList title="Anestezi" category="anesteziPersonelleri" />}
                                    {activeDefinition === 'hemsireler' && <DefinitionList title="Hemşire" category="hemsireler" />}
                                    {activeDefinition === 'institutions' && <DefinitionList title="Kurum" category="kurumlar" />}
                                    {activeDefinition === 'occupations' && <DefinitionList title="Meslek" category="meslekler" />}
                                    {activeDefinition === 'insurances' && <DefinitionList title="Sigorta" category="sigortalar" />}
                                    {activeDefinition === 'appointment-types' && <AppointmentTypeSettings />}
                                    {activeDefinition === 'biopsy-templates' && <BiopsyTemplateSettings />}
                                    { activeDefinition === 'imaging' && <DefinitionList title="Tetkik (Görüntüleme)" category="tetkikTanimlari" customGrup="RADYOLOJI" /> }
                                    { activeDefinition === 'urine-antibiogram' && <DefinitionList title="İdrar Antibiyogram Paneli" category="tetkikTanimlari" customGrup="IDRAR_ANTIBIYOGRAM" /> }
                                    { activeDefinition === 'anesthesia' && <DefinitionList title="Anestezi Tipi" category="anesteziTipleri" /> }
                                    {activeDefinition === 'followup' && <DefinitionList title="Takip Konusu" category="takipKonulari" />}
                                    {activeDefinition === 'prescription-templates' && <PrescriptionTemplateSettings />}
                                    {activeDefinition === 'operation-notes' && <GeneralTemplateSettings grup="operation_note" title="Ameliyat Notu Şablonları" description="Ameliyat notu girişinde kullanılacak şablonlar. 'Başlık | Not İçeriği' formatında yazılması önerilir." />}
                                    {activeDefinition === 'medical-interventions' && <GeneralTemplateSettings grup="medical_intervention" title="Tıbbi Müdahale Şablonları" description="Tıbbi müdahale raporlarında kullanılacak hazır metin şablonları." />}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="consent-forms">
                        <ConsentFormsSettings />
                    </TabsContent>

                    <TabsContent value="audit">
                        <AuditLogsSettings />
                    </TabsContent>

                    <TabsContent value="integrations">
                        <IntegrationsSettings />
                    </TabsContent>

                </Tabs >
            </div >

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve kullanıcının tüm yetkileri iptal edilecektir.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {deleteUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kullanıcıyı Sil"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
