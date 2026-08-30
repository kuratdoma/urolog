'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, CheckCircle2, XCircle, Link2, ExternalLink, Brain, Save, Zap, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { api, SystemSettingCreate, SystemSetting } from "@/lib/api";
import { UserGoogleStatus } from "@/lib/api/integrations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";

export function IntegrationsSettings() {
    const queryClient = useQueryClient();
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectingUserId, setConnectingUserId] = useState<number | null>(null);
    const [apiKey, setApiKey] = useState("");
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('google_sync') === 'success') {
                toast.success("Google Takvim başarıyla bağlandı!");
                queryClient.invalidateQueries({ queryKey: ['integrations', 'google', 'status'] });
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            }
        }
    }, [queryClient]);
    
    // Google Calendar Credentials local states
    const [clientId, setClientId] = useState("");
    const [clientSecret, setClientSecret] = useState("");
    const [calendarId, setCalendarId] = useState("");
    const [showClientId, setShowClientId] = useState(false);
    const [showClientSecret, setShowClientSecret] = useState(false);
    
    const {
        aiScribeEnabled, aiScribeMode, aiHpvBriefingEnabled,
        setAiScribeEnabled, setAiScribeMode, setAiHpvBriefingEnabled,
    } = useSettingsStore();

    // Get settings
    const { data: settings = [] } = useQuery({
        queryKey: ['settings'],
        queryFn: api.settings.getAll,
    });

    const isApiKeySet = settings.find((s: SystemSetting) => s.key === "google_api_key")?.value === "••••••••••••••••";
    const isClientIdSet = settings.find((s: SystemSetting) => s.key === "google_client_id")?.value === "••••••••••••••••";
    const isClientSecretSet = settings.find((s: SystemSetting) => s.key === "google_client_secret")?.value === "••••••••••••••••";
    const dbCalendarId = settings.find((s: SystemSetting) => s.key === "google_calendar_id")?.value || "";

    useEffect(() => {
        if (dbCalendarId) {
            setCalendarId(dbCalendarId);
        }
    }, [dbCalendarId]);

    const updateSettingsMutation = useMutation({
        mutationFn: (data: SystemSettingCreate[]) => api.settings.batchUpdate(data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            queryClient.invalidateQueries({ queryKey: ['integrations', 'google', 'config-status'] });
            
            const isGoogleCreds = variables.some(v => v.key.startsWith('google_client') || v.key === 'google_calendar_id');
            if (isGoogleCreds) {
                toast.success("Google OAuth ayarları başarıyla güncellendi.");
                setClientId("");
                setClientSecret("");
            } else {
                toast.success("API Anahtarı başarıyla güncellendi.");
                setApiKey("");
            }
        },
        onError: () => toast.error("Ayarlar güncellenemedi.")
    });

    const handleSaveApiKey = () => {
        if (!apiKey) return;
        updateSettingsMutation.mutate([
            { key: "google_api_key", value: apiKey }
        ]);
    };

    const handleSaveGoogleCredentials = () => {
        const payload: SystemSettingCreate[] = [];
        if (clientId) payload.push({ key: "google_client_id", value: clientId });
        if (clientSecret) payload.push({ key: "google_client_secret", value: clientSecret });
        payload.push({ key: "google_calendar_id", value: calendarId });
        
        updateSettingsMutation.mutate(payload);
    };

    // Get Google Sync Status
    const { data: status, isLoading: isLoadingStatus } = useQuery({
        queryKey: ['integrations', 'google', 'status'],
        queryFn: api.integrations.getGoogleStatus,
    });

    // Get Google Config Status
    const { data: configStatus, isLoading: isLoadingConfig } = useQuery({
        queryKey: ['integrations', 'google', 'config-status'],
        queryFn: api.integrations.getGoogleConfigStatus,
    });

    // All users Google status
    const { data: allUsersStatus = [], isLoading: isLoadingAllUsers } = useQuery({
        queryKey: ['integrations', 'google', 'all-users-status'],
        queryFn: api.integrations.getAllUsersGoogleStatus,
    });

    const disconnectMutation = useMutation({
        mutationFn: (userId: number) => api.integrations.disconnectGoogle(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integrations', 'google'] });
            toast.success("Google bağlantısı kesildi");
        },
        onError: () => toast.error("Bağlantı kesilemedi"),
    });

    const handleConnectGoogleForUser = async (userId: number) => {
        try {
            setConnectingUserId(userId);
            const { url } = await api.integrations.getGoogleAuthUrl(userId);
            window.location.href = url;
        } catch (error: any) {
            toast.error("Google bağlantı URL'i alınamadı: " + error.message);
            setConnectingUserId(null);
        }
    };

    const handleConnectGoogle = async () => {
        try {
            setIsConnecting(true);
            const { url } = await api.integrations.getGoogleAuthUrl();
            // Redirect to Google OAuth
            window.location.href = url;
        } catch (error: any) {
            toast.error("Google bağlantı URL'i alınamadı: " + error.message);
            setIsConnecting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Calendar Card */}
            <Card className="border-white shadow-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            Google Calendar Entegrasyonu
                        </CardTitle>
                        {status?.connected ? (
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Bağlı
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-slate-400 flex items-center gap-1">
                                <XCircle className="h-3 w-3" /> Bağlı Değil
                            </Badge>
                        )}
                    </div>
                    <CardDescription>
                        Randevularınızı otomatik olarak kişisel Google takviminizle senkronize edin.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Google OAuth Credentials Configuration Form */}
                    <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 space-y-3.5">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Google OAuth Kimlik Bilgileri</div>
                        
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-slate-600 font-medium">Client ID</Label>
                                {isClientIdSet && (
                                    <span className="text-[10px] text-emerald-600 flex items-center gap-0.5 font-medium">
                                        <CheckCircle2 className="h-3 w-3" /> Kayıtlı
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <Input
                                    type={showClientId ? "text" : "password"}
                                    value={clientId}
                                    onChange={(e) => {
                                        setClientId(e.target.value);
                                        if (e.target.value && !showClientId) setShowClientId(true);
                                    }}
                                    onBlur={() => setShowClientId(false)}
                                    placeholder={isClientIdSet ? "••••••••••••••••" : "Google Client ID girin"}
                                    className="font-mono text-xs pr-10 w-full h-8"
                                />
                                {clientId && (
                                    <button
                                        type="button"
                                        onClick={() => setShowClientId(!showClientId)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showClientId ? <EyeOff className="h-3.5 h-3.5" /> : <Eye className="h-3.5 h-3.5" />}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-slate-600 font-medium">Client Secret</Label>
                                {isClientSecretSet && (
                                    <span className="text-[10px] text-emerald-600 flex items-center gap-0.5 font-medium">
                                        <CheckCircle2 className="h-3 w-3" /> Kayıtlı
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <Input
                                    type={showClientSecret ? "text" : "password"}
                                    value={clientSecret}
                                    onChange={(e) => {
                                        setClientSecret(e.target.value);
                                        if (e.target.value && !showClientSecret) setShowClientSecret(true);
                                    }}
                                    onBlur={() => setShowClientSecret(false)}
                                    placeholder={isClientSecretSet ? "••••••••••••••••" : "Google Client Secret girin"}
                                    className="font-mono text-xs pr-10 w-full h-8"
                                />
                                {clientSecret && (
                                    <button
                                        type="button"
                                        onClick={() => setShowClientSecret(!showClientSecret)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showClientSecret ? <EyeOff className="h-3.5 h-3.5" /> : <Eye className="h-3.5 h-3.5" />}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-600 font-medium">Google Calendar ID (İsteğe Bağlı)</Label>
                            <Input
                                type="text"
                                value={calendarId}
                                onChange={(e) => setCalendarId(e.target.value)}
                                placeholder="primary (varsayılan) veya takvim_id@group.calendar.google.com"
                                className="font-mono text-xs w-full h-8"
                            />
                            <p className="text-[10px] text-slate-400">
                                Boş bırakılırsa ana takviminiz kullanılır. Özel bir takvim için Google Takvim ayarlarından Takvim Kimliğini kopyalayıp buraya yapıştırın.
                            </p>
                        </div>

                        <Button 
                            onClick={handleSaveGoogleCredentials} 
                            disabled={(!clientId && !clientSecret && calendarId === dbCalendarId) || updateSettingsMutation.isPending}
                            className="w-full h-8 text-xs bg-slate-800 hover:bg-slate-900 text-white font-bold"
                        >
                            {updateSettingsMutation.isPending ? <Loader2 className="h-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 h-3.5 mr-1.5" />}
                            Kimlik Bilgilerini Kaydet
                        </Button>
                    </div>

                    <div className="border-t border-slate-100 pt-3"></div>

                    {isLoadingStatus ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : status?.connected ? (
                        <div className="space-y-4">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                                <p className="text-xs text-slate-500">Bağlantı Durumu</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700">Google Hesabı Aktif</span>
                                    {status.expiry && (
                                        <span className="text-[10px] text-slate-400">
                                            Geçerlilik: {format(new Date(status.expiry), 'dd MMMM HH:mm', { locale: tr })}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={handleConnectGoogle}
                                    disabled={isConnecting || !configStatus?.configured}
                                >
                                    {isConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                                    Yeniden Bağla
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-sm text-slate-600 leading-relaxed">
                                Google Calendar bağlantısı kurduğunuzda, UroLog üzerinden oluşturduğunuz randevular anında takviminize işlenir.
                            </div>
                            <Button
                                className="w-full bg-[#4285F4] hover:bg-[#357abd] text-white"
                                onClick={handleConnectGoogle}
                                disabled={isConnecting || !configStatus?.configured}
                            >
                                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                                Google ile Bağlan
                            </Button>
                            {!configStatus?.configured && !isLoadingConfig && (
                                <p className="text-[10px] text-rose-500 text-center font-medium">
                                    * Bağlantı kurmadan önce Google OAuth Client ID ve Client Secret bilgilerini yukarıdaki formdan kaydedin.
                                </p>
                            )}

                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="link" className="w-full text-slate-500 text-xs">
                                        Kurulum Rehberi (Admin)
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0">
                                    <DialogHeader className="p-6 pb-2">
                                        <DialogTitle>Google Calendar Entegrasyon Kurulumu</DialogTitle>
                                        <DialogDescription>
                                            Bu adımlar, sistem yöneticisinin (.env dosyası yetkisi olan) backend tarafında Google Cloud ayarlarını yapması içindir.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex-1 px-6 pb-6 overflow-y-auto">
                                        <div className="space-y-6 text-sm text-slate-700 leading-relaxed max-w-none">
                                            <div>
                                                <h3 className="font-bold text-base mb-2">Adım 1: Google Cloud Projesi Oluşturma</h3>
                                                <ul className="list-decimal pl-5 space-y-1 text-slate-600">
                                                    <li>Tarayıcınızdan <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 underline">Google Cloud Console</a> adresine gidin.</li>
                                                    <li>Sağ üst köşedeki <strong>Proje Oluştur</strong> butonuna tıklayın.</li>
                                                    <li>Proje adını <code>UroLOG-Calendar</code> olarak belirleyin ve <strong>Oluştur</strong>&apos;a tıklayın.</li>
                                                    <li>Proje oluşturulduktan sonra üst menüden bu projeyi seçtiğinize emin olun.</li>
                                                </ul>
                                            </div>

                                            <div>
                                                <h3 className="font-bold text-base mb-2">Adım 2: Google Calendar API&apos;sini Aktifleştirme</h3>
                                                <ul className="list-decimal pl-5 space-y-1 text-slate-600">
                                                    <li>Sol menüden <strong>API&apos;ler ve Hizmetler &gt; Kitaplık</strong> sekmesine gidin.</li>
                                                    <li>Arama çubuğuna <strong>Google Calendar API</strong> yazın ve çıkan sonuca tıklayın.</li>
                                                    <li><strong>Etkinleştir</strong> butonuna basarak API&apos;yi açın.</li>
                                                </ul>
                                            </div>

                                            <div>
                                                <h3 className="font-bold text-base mb-2">Adım 3: OAuth Onay Ekranını Ayarlama</h3>
                                                <ul className="list-decimal pl-5 space-y-1 text-slate-600">
                                                    <li>Sol menüden <strong>API&apos;ler ve Hizmetler &gt; OAuth onay ekranı</strong> sekmesine gidin.</li>
                                                    <li>Kullanıcı Tipi olarak <strong>Harici (External)</strong> seçeneğini işaretleyip <strong>Oluştur</strong> butonuna tıklayın.</li>
                                                    <li><strong>Uygulama Adı:</strong> <code>UroLOG Web Client</code> girin ve destek e-postalarını doldurun.</li>
                                                    <li><strong>Kapsamlar</strong> adımında <code>https://www.googleapis.com/auth/calendar.events</code> kapsamını ekleyin.</li>
                                                    <li><strong className="text-red-600">Test Kullanıcıları</strong> adımında kendi e-postanızı eklemeyi UNUTMAYIN.</li>
                                                    <li>Kaydedip devam edin.</li>
                                                </ul>
                                            </div>

                                            <div>
                                                <h3 className="font-bold text-base mb-2">Adım 4: Kimlik Bilgilerini Oluşturma</h3>
                                                <ul className="list-decimal pl-5 space-y-1 text-slate-600">
                                                    <li>Sol menüden <strong>API&apos;ler ve Hizmetler &gt; Kimlik Bilgileri</strong> sekmesine gidin.</li>
                                                    <li>Üstten <strong>+ Kimlik Bilgisi Oluştur &gt; OAuth istemci kimliği</strong> seçeneğine tıklayın.</li>
                                                    <li>Uygulama Türü: <strong>Web uygulaması</strong> seçin.</li>
                                                    <li><strong>Yetkilendirilmiş yönlendirme URI&apos;leri</strong> kısmında + URI Ekle diyerek sunucunuzun callback adresini (örn: <code>http://localhost:8000/api/v1/integrations/google/callback</code>) girin.</li>
                                                    <li><strong>Oluştur</strong> butonuna tıklayın.</li>
                                                </ul>
                                            </div>

                                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                                                <h3 className="font-bold text-orange-800 mb-2">Adım 5: Backend .env Konfigürasyonu</h3>
                                                <p className="text-orange-900 text-xs mb-3">Google&apos;dan aldığınız <strong>Client ID</strong> ve <strong>Client Secret</strong> değerlerini backend sunucusundaki <code>backend/.env</code> dosyasına şu şekilde ekleyip backend konteynerini yeniden başlatın:</p>
                                                <pre className="bg-slate-900 text-slate-50 p-3 rounded-md text-xs font-mono overflow-x-auto">
                                                    {`GOOGLE_CLIENT_ID="1234...apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."`}
                                                </pre>
                                            </div>

                                            <div>
                                                <h3 className="font-bold text-base mb-2">Adım 6: Google Takvim&apos;de Özel Takvim Oluşturma ve ID Alma (İsteğe Bağlı)</h3>
                                                <p className="text-slate-600 mb-2">
                                                    Eğer randevuların kişisel ana takviminiz yerine UroLog için özel oluşturulmuş bir takvime eklenmesini istiyorsanız şu adımları izleyin:
                                                 </p>
                                                <ul className="list-decimal pl-5 space-y-1 text-slate-600">
                                                    <li><a href="https://calendar.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 underline">Google Takvim</a> sayfasına gidin.</li>
                                                    <li>Sol alt köşedeki <strong>Diğer takvimler</strong> başlığının yanındaki <strong>+ (Diğer takvimleri ekle)</strong> butonuna tıklayın ve <strong>Yeni takvim oluştur</strong> seçeneğini seçin.</li>
                                                    <li>Takvime bir isim verin (Örn: <code>Urolog Randevuları</code>) ve <strong>Takvim oluştur</strong> butonuna basın.</li>
                                                    <li>Sol menüde yeni oluşturduğunuz takvimin üzerine gelip üç noktaya tıklayarak <strong>Ayarlar ve paylaşım</strong> seçeneğine gidin.</li>
                                                    <li>Açılan sayfanın aşağısındaki <strong>Takvimi entegre edin</strong> bölümünü bulun.</li>
                                                    <li>Burada yer alan <strong>Takvim Kimliği (Calendar ID)</strong> değerini (Örn: <code>example@group.calendar.google.com</code>) kopyalayın.</li>
                                                    <li>Bu kopyaladığınız kimliği, sol taraftaki <strong>Google Calendar ID</strong> alanına yapıştırıp kaydedin.</li>
                                                </ul>
                                            </div>

                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                                <h3 className="font-bold text-blue-800 mb-2">Adım 7: Test Aşamasından Canlıya (Production) Geçiş</h3>
                                                <p className="text-blue-900 text-xs mb-2">Google OAuth ekranı varsayılan olarak <strong>Test</strong> modundadır ve sadece test kullanıcıları giriş yapabilir. Canlıya almak için iki yöntem vardır:</p>
                                                <ul className="list-disc pl-5 space-y-1 text-xs text-blue-900">
                                                    <li><strong>Kurumsal Dahili Kullanım (Önerilen):</strong> Google Workspace (kurumsal Gmail) kullanıyorsanız, <em>OAuth onay ekranı</em> sayfasında User Type değerini <strong>Dahili (Internal)</strong> yapın. Google doğrulamasına gerek kalmadan tüm personeliniz uyarısız şekilde bağlanabilir.</li>
                                                    <li><strong>Genel Kullanım (Canlıya Alma):</strong> OAuth onay ekranında <strong>Uygulamayı Yayınla (Publish App)</strong> seçeneğine tıklayın. Google doğrulaması tamamlanana kadar giriş yaparken <em>&quot;Güvenli Değil / Doğrulanmadı&quot;</em> uyarısı çıkacaktır; bunu geçmek için kullanıcılar <strong>Gelişmiş &gt; Urolog sitesine git (güvenli değil)</strong> adımlarını takip edebilirler.</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* API Card */}
            <Card className="border-white shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="h-4 w-4 text-purple-500" />
                        API (C-3PO)
                    </CardTitle>
                    <CardDescription>
                        C-3PO Ses Analizi ve yapay zeka destekli tıbbi raporlama modülleri için API ayarlarını yönetin.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                            <div className="flex items-center gap-2">
                                <Brain className="h-4 w-4 text-purple-500" />
                                <div>
                                    <Label className="text-xs font-bold">C-3PO Durumu</Label>
                                    <p className="text-[10px] text-slate-400">Sesli notları raporla</p>
                                </div>
                            </div>
                            <Switch checked={aiScribeEnabled} onCheckedChange={setAiScribeEnabled} className="scale-90 data-[state=checked]:bg-purple-600" />
                        </div>

                        {aiScribeEnabled && (
                            <div className="space-y-2 border-b border-slate-200/60 pb-3">
                                <Label className="text-xs font-semibold text-slate-700">Raporlama Modu</Label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setAiScribeMode('gemini')}
                                        className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md border text-[10px] font-medium transition-all",
                                            aiScribeMode === 'gemini' ? "border-purple-200 bg-purple-50 text-purple-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <Brain className="h-3 w-3" /> Bulut
                                    </button>
                                    <button
                                        onClick={() => setAiScribeMode('local')}
                                        className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md border text-[10px] font-medium transition-all",
                                            aiScribeMode === 'local' ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <Zap className="h-3 w-3" /> Yerel
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                            <div className="flex items-center gap-2">
                                <Brain className="h-4 w-4 text-purple-500" />
                                <div>
                                    <Label className="text-xs font-bold">AI HPV Briefing</Label>
                                    <p className="text-[10px] text-slate-400">Kondilom hastaları için AI asistanı</p>
                                </div>
                            </div>
                            <Switch checked={aiHpvBriefingEnabled} onCheckedChange={setAiHpvBriefingEnabled} className="scale-90 data-[state=checked]:bg-purple-600" />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold text-slate-700">API Anahtarı</Label>
                                {isApiKeySet && (
                                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 flex items-center gap-1 text-[10px]">
                                        <CheckCircle2 className="h-3 w-3" /> Sistemde Kayıtlı
                                    </Badge>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        type={showApiKey ? "text" : "password"}
                                        value={apiKey}
                                        onChange={(e) => {
                                            setApiKey(e.target.value);
                                            // Show plain text on pasting or starting to type
                                            if (e.target.value && !showApiKey) {
                                                setShowApiKey(true);
                                            }
                                        }}
                                        onBlur={() => setShowApiKey(false)}
                                        placeholder=""
                                        className="font-mono text-xs pr-10 w-full"
                                    />
                                    {apiKey && (
                                        <button
                                            type="button"
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    )}
                                </div>
                                <Button 
                                    onClick={handleSaveApiKey} 
                                    disabled={!apiKey || updateSettingsMutation.isPending}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {updateSettingsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Kaydet
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Per-User Google Calendar Connections */}
            <Card className="border-white shadow-sm col-span-1 md:col-span-2">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            Kullanıcı Bazında Google Takvim Bağlantıları
                        </CardTitle>
                    </div>
                    <CardDescription>
                        Her kullanıcı (doktor/asistan) için Google Takvim bağlantısını yönetin. Randevular, randevuya atanan doktorun takviminde görünür.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingAllUsers ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : allUsersStatus.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">Kullanıcı bulunamadı.</p>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {allUsersStatus.map((u: UserGoogleStatus) => (
                                <div key={u.user_id} className="flex items-center justify-between py-3 px-1">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                            {u.user_name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">{u.user_name}</p>
                                            <p className="text-xs text-slate-400">{u.user_email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {u.connected ? (
                                            <>
                                                {u.is_expired ? (
                                                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[10px]">
                                                        <XCircle className="h-3 w-3 mr-1" /> Süresi Dolmuş
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px]">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Bağlı
                                                    </Badge>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => handleConnectGoogleForUser(u.user_id)}
                                                    disabled={connectingUserId === u.user_id || !configStatus?.configured}
                                                >
                                                    {connectingUserId === u.user_id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ExternalLink className="h-3 w-3 mr-1" />}
                                                    Yenile
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                                    onClick={() => disconnectMutation.mutate(u.user_id)}
                                                    disabled={disconnectMutation.isPending}
                                                >
                                                    <XCircle className="h-3 w-3 mr-1" />
                                                    Kes
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                size="sm"
                                                className="h-7 text-xs bg-[#4285F4] hover:bg-[#357abd] text-white"
                                                onClick={() => handleConnectGoogleForUser(u.user_id)}
                                                disabled={connectingUserId === u.user_id || !configStatus?.configured}
                                            >
                                                {connectingUserId === u.user_id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Link2 className="h-3 w-3 mr-1" />}
                                                Google ile Bağla
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {!configStatus?.configured && !isLoadingConfig && (
                        <p className="text-[10px] text-rose-500 text-center font-medium mt-3">
                            * Bağlantı kurmadan önce Google OAuth Client ID ve Client Secret bilgilerini yukarıdaki formdan kaydedin.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
