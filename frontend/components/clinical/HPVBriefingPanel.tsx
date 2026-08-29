'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { HPVBriefingResponse } from '@/lib/api/hpvBriefing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dna, Loader2, ChevronDown, ChevronRight,
    User, Calendar, RefreshCw,
    Syringe, AlertTriangle, TrendingDown, TrendingUp, Minus,
    CheckCircle2, XCircle, Clock, FileText, Lightbulb
} from 'lucide-react';

interface HPVBriefingPanelProps {
    patientId: string;
    // Optional props for controlled mode (e.g. running in the background at page level)
    briefing?: HPVBriefingResponse | null;
    isLoading?: boolean;
    isError?: boolean;
    error?: any;
    refetch?: () => void;
    handleGenerate?: () => void;
    shouldFetch?: boolean;
}

// Detailed error explainer helper
const getDetailedErrorMessage = (err: any): { title: string; description: string; action?: string } => {
    if (!err) {
        return {
            title: "Bilinmeyen Hata",
            description: "Analiz oluşturulurken tanımlanamayan bir hata meydana geldi."
        };
    }

    const message = err.message || (typeof err === 'string' ? err : '');
    const status = err.status || err.statusCode || (err.response && err.response.status);
    const detail = err.detail || (err.response && err.response.data && err.response.data.detail);

    const fullText = `${message} ${detail} ${status}`.toLowerCase();

    if (fullText.includes("api key missing") || fullText.includes("gemini library not found") || fullText.includes("api_key") || fullText.includes("api key")) {
        return {
            title: "Gemini API Anahtarı Eksik",
            description: "Google Gemini yapay zeka entegrasyonu için geçerli bir API anahtarı tanımlanmamış. Bu nedenle klinik özetleme sistemi çalıştırılamıyor.",
            action: "Lütfen 'Ayarlar > AI Entegrasyonları' sayfasına giderek geçerli bir Gemini API Anahtarı ekleyin ve kaydedin."
        };
    }
    
    if (fullText.includes("model no longer available") || fullText.includes("not_found") || fullText.includes("gemini-2.0-flash")) {
        return {
            title: "Yapay Zeka Modeli Bulunamadı",
            description: "Sistemde yapılandırılan yapay zeka modeli (gemini-2.0-flash) artık servis dışı bırakılmış veya mevcut API anahtarınız bu modeli desteklemiyor.",
            action: "UroLOG sistemi otomatik olarak en güncel 'gemini-2.5-flash' modelini kullanacak şekilde güncellenmiştir. Lütfen Docker konteynerlerini yeniden başlatarak yeni kodların yüklendiğinden emin olun."
        };
    }

    if (fullText.includes("quota exceeded") || fullText.includes("limit") || fullText.includes("429")) {
        return {
            title: "API İstek Sınırı Aşıldı",
            description: "Gemini API anahtarınızın ücretsiz kullanım kotası veya saniye/dakika başına istek sınırı geçici olarak aşıldı (HTTP 429).",
            action: "Lütfen 1-2 dakika bekledikten sonra tekrar 'Briefing Yenile' butonuna basarak deneyin."
        };
    }

    if (fullText.includes("network") || fullText.includes("conn") || fullText.includes("fetch") || fullText.includes("failed to fetch") || fullText.includes("502") || fullText.includes("503")) {
        return {
            title: "Sunucu Bağlantı Hatası",
            description: "Next.js arayüz sunucusu, FastAPI backend servislerine erişemiyor (HTTP 500/502). Backend sunucusu veya veritabanı konteyneri kapalı olabilir.",
            action: "Lütfen bilgisayarınızda Docker servisinin ve 'urolog_backend' konteynerinin sorunsuz çalıştığından emin olun."
        };
    }

    return {
        title: `Sistem Hatası (HTTP ${status || "500"})`,
        description: detail || message || "AI analizi sırasında sunucu tarafında beklenmedik bir istisna oluştu.",
        action: "Hastanın muayene notları, şikayet veya tedavi verilerinde geçersiz karakterler olup olmadığını kontrol edin veya sayfayı yenileyip tekrar deneyin."
    };
};

export function HPVBriefingPanel({
    patientId,
    briefing: controlledBriefing,
    isLoading: controlledIsLoading,
    isError: controlledIsError,
    error: controlledError,
    refetch: controlledRefetch,
    handleGenerate: controlledHandleGenerate,
    shouldFetch: controlledShouldFetch,
}: HPVBriefingPanelProps) {
    const [localShouldFetch, setLocalShouldFetch] = useState(false);

    const isControlled = controlledBriefing !== undefined || controlledIsLoading !== undefined;

    const localQuery = useQuery<HPVBriefingResponse | null>({
        queryKey: ['hpv-briefing', patientId],
        queryFn: () => api.hpvBriefing.generate(patientId),
        enabled: !isControlled && localShouldFetch,
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
        retry: 1,
    });

    const briefing = isControlled ? controlledBriefing : localQuery.data;
    const isLoading = isControlled ? controlledIsLoading : localQuery.isLoading;
    const isError = isControlled ? controlledIsError : localQuery.isError;
    const error = isControlled ? controlledError : localQuery.error;
    const refetch = isControlled ? (controlledRefetch || (() => {})) : localQuery.refetch;

    const handleGenerate = () => {
        if (isControlled) {
            if (controlledHandleGenerate) {
                controlledHandleGenerate();
            }
        } else {
            setLocalShouldFetch(true);
            if (briefing) {
                refetch();
            }
        }
    };

    const trendIcon = (trend: string) => {
        switch (trend) {
            case 'azalıyor': return <TrendingDown className="h-4 w-4 text-emerald-600" />;
            case 'artıyor': return <TrendingUp className="h-4 w-4 text-red-600" />;
            case 'stabil': return <Minus className="h-4 w-4 text-amber-500" />;
            default: return <Minus className="h-4 w-4 text-slate-400" />;
        }
    };

    const trendLabel = (trend: string) => {
        switch (trend) {
            case 'azalıyor': return 'Aralıklar uzuyor ✅';
            case 'artıyor': return 'Aralıklar kısalıyor ⚠️';
            case 'stabil': return 'Stabil';
            default: return 'Yetersiz veri';
        }
    };

    return (
        <Card className="border-purple-100 bg-white/95 backdrop-blur-md shadow-2xl text-slate-800 overflow-hidden">
            <CardHeader className="pb-3 border-b border-purple-50/50 bg-purple-50/20">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-purple-900 text-base font-semibold">
                        <Dna className="h-5 w-5 text-purple-600" />
                        AI HPV / Kondilom Briefing
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {briefing && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => refetch()}
                                disabled={isLoading}
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 h-8 px-2"
                                title="Yeniden Oluştur"
                            >
                                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </Button>
                        )}
                        {!briefing && !isLoading && (
                            <Button
                                size="sm"
                                onClick={handleGenerate}
                                className="bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs px-3 shadow-sm transition-all"
                            >
                                <Dna className="h-3.5 w-3.5 mr-1.5" />
                                Briefing Oluştur
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            {/* Loading State */}
            {isLoading && (
                <CardContent className="py-12">
                    <div className="flex flex-col items-center justify-center text-center gap-3 text-purple-600">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-800">Klinik Geçmiş Analiz Ediliyor...</p>
                            <p className="text-xs text-slate-500 max-w-xs">AI hastanın tüm muayene, ameliyat, tedavi ve takip notlarını tarıyor.</p>
                        </div>
                    </div>
                </CardContent>
            )}

            {/* Detailed Error State */}
            {isError && (() => {
                const errDetail = getDetailedErrorMessage(error);
                return (
                    <CardContent className="py-6">
                        <div className="bg-red-50 border border-red-200/60 rounded-xl p-4 space-y-3 text-sm">
                            <div className="flex items-start gap-2.5 text-red-800">
                                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-red-900">{errDetail.title}</h4>
                                    <p className="text-red-700/90 mt-1 leading-relaxed text-xs">{errDetail.description}</p>
                                </div>
                            </div>
                            {errDetail.action && (
                                <div className="pl-7 pt-2 border-t border-red-200/40 text-xs text-red-700 font-medium flex items-center gap-1.5">
                                    <Lightbulb className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                    <span>{errDetail.action}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                );
            })()}

            {/* Briefing Content */}
            {briefing && !isLoading && (
                <CardContent className="p-4 space-y-4 max-h-[65vh] overflow-y-auto">
                    {/* ── Hasta Profili ── */}
                    <Section title="Hasta Profili" icon={<User className="h-4 w-4 text-purple-600" />} defaultOpen>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm bg-slate-50/50 border border-slate-100 rounded-lg p-3">
                            <InfoRow label="Yaş / Cinsiyet" value={`${briefing.yas || '?'} yaş, ${briefing.cinsiyet || '?'}`} />
                            <InfoRow label="Partner Durumu" value={briefing.partner_durumu} />
                            <InfoRow
                                label="Sigara Durumu"
                                value={briefing.sigara_durumu}
                                highlight={briefing.sigara_durumu.toLowerCase().includes('aktif') || briefing.sigara_durumu.toLowerCase().includes('devam')}
                            />
                        </div>
                    </Section>

                    {/* ── Kronoloji ── */}
                    <Section title="Hastalık Kronolojisi" icon={<Calendar className="h-4 w-4 text-purple-600" />} defaultOpen>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm bg-slate-50/50 border border-slate-100 rounded-lg p-3">
                            <InfoRow label="İlk Başvuru" value={briefing.ilk_basvuru_tarihi || '?'} />
                            <InfoRow label="İlk Tanı" value={briefing.ilk_tani_tarihi || '?'} />
                            <InfoRow label="İlk Operasyon" value={briefing.ilk_operasyon_tarihi || 'Kayıt bulunamadı'} />
                            <InfoRow label="Toplam Operasyon" value={`${briefing.toplam_operasyon_sayisi}`} />
                            {briefing.takip_suresi_ay && (
                                <InfoRow label="Sistemdeki Takip" value={`${briefing.takip_suresi_ay} ay`} />
                            )}
                        </div>
                    </Section>

                    {/* ── Nüks Analizi ── */}
                    <Section title="Nüks Analizi" icon={<RefreshCw className="h-4 w-4 text-purple-600" />} defaultOpen>
                        <div className="bg-slate-50/50 border border-slate-100 rounded-lg p-3 space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <InfoRow label="Toplam Nüks Sayısı" value={`${briefing.nuks.toplam_nuks}`} />
                                {briefing.nuks.ortalama_aralik_gun != null && (
                                    <InfoRow
                                        label="Ort. Nüks Aralığı"
                                        value={`~${Math.round(briefing.nuks.ortalama_aralik_gun)} gün`}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-sm pt-1 border-t border-slate-100">
                                <span className="text-slate-500 font-medium">Nüks Trendi:</span>
                                <div className="flex items-center gap-1.5 bg-white border border-slate-200/60 rounded px-2 py-0.5 text-xs font-semibold">
                                    {trendIcon(briefing.nuks.trend)}
                                    <span className="text-slate-700">{trendLabel(briefing.nuks.trend)}</span>
                                </div>
                            </div>
                            {briefing.nuks.nuks_tarihleri.length > 0 && (
                                <div className="space-y-1 pt-1.5">
                                    <span className="text-xs font-medium text-slate-400">Nüks Tarihleri:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {briefing.nuks.nuks_tarihleri.map((t, i) => (
                                            <Badge key={i} variant="secondary" className="bg-purple-50 text-purple-700 border border-purple-100 text-xs px-2 py-0.5">
                                                {t}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Section>

                    {/* ── Tedavi Haritası ── */}
                    {briefing.tedavi_haritasi.length > 0 && (
                        <Section title={`Tedavi Haritası (${briefing.tedavi_haritasi.length} işlem)`} icon={<FileText className="h-4 w-4 text-purple-600" />}>
                            <div className="relative pl-4 border-l-2 border-purple-200 space-y-4 my-2 ml-2">
                                {briefing.tedavi_haritasi.map((t, i) => (
                                    <div key={i} className="relative">
                                        {/* Timeline dot */}
                                        <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-purple-600 border-2 border-white shadow-sm" />
                                        <div className="bg-slate-50/50 border border-slate-100 rounded-lg p-3 space-y-1">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <span className="text-purple-900 font-semibold text-sm">{t.tarih}</span>
                                                <Badge className="text-xs bg-purple-100 text-purple-800 border-none hover:bg-purple-100">
                                                    {t.tedavi_yontemi}
                                                </Badge>
                                            </div>
                                            <div className="text-slate-600 text-xs flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-slate-100/50">
                                                {t.boyut_tahmini && <span>📏 Boyut: <strong>{t.boyut_tahmini}</strong></span>}
                                                {t.lezyon_tipi && <span>🔢 Tip: <strong>{t.lezyon_tipi}</strong></span>}
                                                {t.lokasyon && <span>📍 Bölge: <strong>{t.lokasyon}</strong></span>}
                                            </div>
                                            {t.notlar && (
                                                <p className="text-slate-500 text-xs italic mt-1 bg-white p-1.5 rounded border border-slate-100 leading-normal">{t.notlar}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* ── Aşı Durumu ── */}
                    <Section title="Aşı Durumu (Gardasil)" icon={<Syringe className="h-4 w-4 text-purple-600" />}>
                        <div className="bg-slate-50/50 border border-slate-100 rounded-lg p-3 space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <DoseRow label="1. Doz" date={briefing.asi_durumu.gardasil_doz1} />
                                <DoseRow label="2. Doz" date={briefing.asi_durumu.gardasil_doz2} />
                                <DoseRow label="3. Doz" date={briefing.asi_durumu.gardasil_doz3} />
                            </div>
                            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                                {briefing.asi_durumu.tamamlandi ? (
                                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 hover:bg-emerald-50 text-xs">
                                        <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Tam Aşı Şeması (3/3)
                                    </Badge>
                                ) : (
                                    <Badge className="bg-amber-50 text-amber-800 border border-amber-200/50 hover:bg-amber-50 text-xs">
                                        <AlertTriangle className="h-3 w-3 mr-1 text-amber-600" /> Eksik Aşı Şeması
                                    </Badge>
                                )}
                            </div>
                            {briefing.asi_durumu.notlar && (
                                <p className="text-slate-500 text-xs mt-1 bg-white p-2 rounded border border-slate-100">{briefing.asi_durumu.notlar}</p>
                            )}
                        </div>
                    </Section>

                    {/* ── Önemli Notlar ── */}
                    {briefing.onemli_notlar.length > 0 && (
                        <Section title="Önemli Notlar" icon={<AlertTriangle className="h-4 w-4 text-purple-600" />}>
                            <ul className="space-y-1.5 text-sm text-slate-700 bg-purple-50/20 border border-purple-100/30 rounded-lg p-3">
                                {briefing.onemli_notlar.map((note, i) => (
                                    <li key={i} className="flex items-start gap-2 leading-relaxed text-xs">
                                        <span className="text-purple-600 mt-0.5 font-bold">•</span>
                                        {note}
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    )}

                    {/* ── Risk Faktörleri ── */}
                    {briefing.risk_faktorleri.length > 0 && (
                        <Section title="Risk Faktörleri" icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}>
                            <div className="flex flex-wrap gap-1.5 bg-amber-50/20 border border-amber-100/30 rounded-lg p-3">
                                {briefing.risk_faktorleri.map((risk, i) => (
                                    <Badge key={i} variant="outline" className="text-xs bg-amber-50/60 border-amber-200/60 text-amber-800 font-medium py-0.5">
                                        ⚠️ {risk}
                                    </Badge>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* ── Meta ── */}
                    <div className="flex flex-col gap-1.5 text-[10px] text-slate-400 pt-3 border-t border-slate-100">
                        <div className="flex justify-between items-center flex-wrap gap-1">
                            <span>
                                Kaynaklar: {Object.entries(briefing.data_sources_count)
                                    .filter(([, v]) => v > 0)
                                    .map(([k, v]) => `${k} (${v})`)
                                    .join(' · ')}
                            </span>
                            {briefing.created_at && (
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {briefing.created_at}
                                </span>
                            )}
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

// ── Helper Components ──

function Section({ title, icon, defaultOpen = false, children }: {
    title: string;
    icon: React.ReactNode;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="mb-1 border border-slate-100 rounded-lg bg-white overflow-hidden shadow-sm">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 w-full text-left py-2.5 px-3 hover:bg-purple-50/40 transition-colors"
            >
                <span className="text-purple-600">{icon}</span>
                <span className="text-sm font-semibold text-slate-700 flex-1">{title}</span>
                {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            </button>
            {open && (
                <div className="px-3 pb-3 border-t border-slate-50 pt-2 bg-slate-50/10">
                    {children}
                </div>
            )}
        </div>
    );
}

function InfoRow({ label, value, highlight = false }: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div className="flex items-center justify-between py-0.5 border-b border-slate-100/50 last:border-0 gap-4">
            <span className="text-slate-500 font-medium text-xs">{label}:</span>
            <span className={`text-xs font-semibold text-right ${highlight ? 'text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/40' : 'text-slate-800'}`}>
                {value}
            </span>
        </div>
    );
}

function DoseRow({ label, date }: { label: string; date?: string | null }) {
    return (
        <div className="flex items-center gap-2 bg-white border border-slate-100 p-2 rounded-lg shadow-sm">
            {date ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
                <XCircle className="h-4 w-4 text-slate-300 shrink-0" />
            )}
            <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium leading-none">{label}</span>
                <span className={`text-xs font-bold mt-0.5 ${date ? 'text-emerald-800' : 'text-slate-400'}`}>
                    {date || 'Kayıt Yok'}
                </span>
            </div>
        </div>
    );
}
