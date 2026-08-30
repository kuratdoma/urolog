import React, { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, SystemSetting, SystemSettingCreate } from "@/lib/api";
import { useSettingsStore } from "@/stores/settings-store";
import {
    Building2, Save, Upload, Settings, Activity, Wallet, Package, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { WorkingHoursCard } from "@/components/settings/WorkingHoursCard";

export function GeneralSettingsTab() {
    const {
        logoUrl, setLogoUrl,
        logoWidth, setLogoWidth,
        examinationModules, setExaminationModule,
        showFinanceModule, setShowFinanceModule,
        showStockModule, setShowStockModule,
        autoCapitalize, setAutoCapitalize
    } = useSettingsStore();

    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- API: Settings ---
    const { data: settings = [], refetch: refetchSettings } = useQuery({
        queryKey: ['settings'],
        queryFn: api.settings.getAll,
    });

    const getSetting = useCallback((key: string) =>
        settings.find((s: SystemSetting) => s.key === key)?.value || '',
        [settings]
    );

    const updateSettingsMutation = useMutation({
        mutationFn: (data: SystemSettingCreate[]) => api.settings.batchUpdate(data),
        onSuccess: () => {
            refetchSettings();
            toast.success("Ayarlar kaydedildi.");
        },
        onError: () => toast.error("Ayarlar kaydedilemedi.")
    });

    const [clinicInfo, setClinicInfo] = useState({ name: '', phone: '', address: '', footer: '' });

    const [workingHours, setWorkingHours] = useState<Record<string, { isOpen: boolean, start: string, end: string }>>({
        monday: { isOpen: true, start: "09:00", end: "18:00" },
        tuesday: { isOpen: true, start: "09:00", end: "18:00" },
        wednesday: { isOpen: true, start: "09:00", end: "18:00" },
        thursday: { isOpen: true, start: "09:00", end: "18:00" },
        friday: { isOpen: true, start: "09:00", end: "18:00" },
        saturday: { isOpen: true, start: "09:00", end: "14:00" },
        sunday: { isOpen: false, start: "09:00", end: "18:00" },
    });

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
                    if (parsed.weekdayStart) {
                        setWorkingHours({
                            monday: { isOpen: true, start: parsed.weekdayStart, end: parsed.weekdayEnd },
                            tuesday: { isOpen: true, start: parsed.weekdayStart, end: parsed.weekdayEnd },
                            wednesday: { isOpen: true, start: parsed.weekdayStart, end: parsed.weekdayEnd },
                            thursday: { isOpen: true, start: parsed.weekdayStart, end: parsed.weekdayEnd },
                            friday: { isOpen: true, start: parsed.weekdayStart, end: parsed.weekdayEnd },
                            saturday: { isOpen: parsed.isWeekendActive, start: parsed.weekendStart || "09:00", end: parsed.weekendEnd || "14:00" },
                            sunday: { isOpen: false, start: "09:00", end: "18:00" },
                        });
                    } else {
                        setWorkingHours(parsed);
                    }
                } catch (e) {
                    console.error("Error parsing working hours", e);
                }
            }

            const logo = getSetting('system_logo_url');
            if (logo && logo !== "[large_logo_placeholder]") {
                setLogoUrl(logo);
                setLogoPreview(logo);
            }
            const width = getSetting('system_logo_width');
            if (width) setLogoWidth(Number(width));
        }
    }, [settings, getSetting, setLogoUrl, setLogoWidth]);

    useEffect(() => {
        const loadLogo = async () => {
            try {
                const res = await api.settings.get('system_logo_url');
                if (res?.value && res.value !== "[large_logo_placeholder]") {
                    setLogoUrl(res.value);
                    setLogoPreview(res.value);
                }
            } catch (error) {
                console.error("Failed to load logo", error);
            }
        };
        loadLogo();
    }, [setLogoUrl]);

    useEffect(() => {
        if (logoUrl) {
            setLogoPreview(logoUrl);
        }
    }, [logoUrl]);

    const handleSaveClinicInfo = useCallback(() => {
        updateSettingsMutation.mutate([
            { key: 'clinic_name', value: clinicInfo.name },
            { key: 'clinic_phone', value: clinicInfo.phone },
            { key: 'clinic_address', value: clinicInfo.address },
            { key: 'clinic_footer', value: clinicInfo.footer }
        ]);
    }, [clinicInfo, updateSettingsMutation]);

    const handleSaveWorkingHours = useCallback(() => {
        updateSettingsMutation.mutate([
            { key: 'working_hours', value: JSON.stringify(workingHours) }
        ]);
    }, [workingHours, updateSettingsMutation]);

    const compressImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(img.src);
                const canvas = document.createElement('canvas');
                let { width, height } = img;

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
                resolve(canvas.toDataURL(format, 0.8));
            };
            img.onerror = (err) => reject(err);
        });
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressedBase64 = await compressImage(file, 400, 400);
                setLogoPreview(compressedBase64);
                toast.success("Logo seçildi ve optimize edildi. Kaydetmek için 'Yükle' butonuna basınız.");
            } catch (err) {
                console.error("Logo compression failed, falling back to original", err);
                if (file.size > 10 * 1024 * 1024) {
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
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Klinik Bilgileri & Logo */}
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
                        {/* Sol: Klinik Bilgileri */}
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

                        {/* Sağ: Logo */}
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

            {/* Çalışma Saatleri */}
            <WorkingHoursCard
                workingHours={workingHours}
                setWorkingHours={setWorkingHours}
                onSave={handleSaveWorkingHours}
            />

            {/* Gelişmiş Ayarlar */}
            <Card className="border-slate-100 shadow-sm md:col-span-2">
                <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Settings className="h-3.5 w-3.5 text-slate-500" />
                        Gelişmiş Ayarlar
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
    );
}
