import { apiFetch } from './client';

// ── Types ──

export interface TedaviKaydi {
    tarih: string;
    boyut_tahmini?: string;
    lezyon_tipi?: string;
    lokasyon?: string;
    tedavi_yontemi: string;
    notlar?: string;
}

export interface AsiDurumu {
    gardasil_doz1?: string;
    gardasil_doz2?: string;
    gardasil_doz3?: string;
    tamamlandi: boolean;
    notlar?: string;
}

export interface NuksAnalizi {
    toplam_nuks: number;
    nuks_tarihleri: string[];
    ortalama_aralik_gun?: number;
    trend: 'azalıyor' | 'artıyor' | 'stabil' | 'yetersiz_veri';
}

export interface HPVBriefingResponse {
    // Hasta Profili
    yas?: number;
    cinsiyet?: string;
    partner_durumu: string;
    sigara_durumu: string;

    // Kronoloji
    ilk_basvuru_tarihi?: string;
    ilk_tani_tarihi?: string;
    ilk_operasyon_tarihi?: string;
    toplam_operasyon_sayisi: number;
    takip_suresi_ay?: number;

    // Nüks
    nuks: NuksAnalizi;

    // Tedavi Haritası
    tedavi_haritasi: TedaviKaydi[];

    // Aşı
    asi_durumu: AsiDurumu;

    // Notlar
    onemli_notlar: string[];
    risk_faktorleri: string[];

    // Meta
    created_at?: string;
    data_sources_count: Record<string, number>;
}

// ── API ──

export const hpvBriefingApi = {
    generate: (patientId: string, forceRefresh: boolean = false) =>
        apiFetch<HPVBriefingResponse>(
            `/api/v1/ai/hpv-briefing/${patientId}${forceRefresh ? '?force_refresh=true' : ''}`
        ),
};

