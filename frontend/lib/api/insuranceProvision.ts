import { apiFetch } from './client';
import { useAuthStore } from '@/stores/auth-store';

export interface InsuranceProvisionDTO {
    hasta_id?: string;
    appointment_id?: number;
    save_to_documents?: boolean;

    sigorta_sirketi?: string;
    provizyon_no?: string;
    irtibat_tel?: string;
    irtibat_faks?: string;

    saglik_kurulusu_adi?: string;
    kurum_kodu?: string;
    telefon_no?: string;
    faks_no?: string;

    sigortali_adi_soyadi?: string;
    dogum_tarihi?: string;
    cinsiyet?: string;
    police_no?: string;
    kart_musteri_no?: string;
    tc_kimlik_no?: string;
    eposta?: string;
    basvuru_tarihi?: string;
    planlanan_yatis_cikis_tarihi?: string;

    sikayet_oyku?: string;
    sikayet_baslangic_tarihi?: string;
    daha_once_basvuru_var_mi?: string;
    gecmis_oyku_ilaclar?: string;
    fizik_muayene_bulgulari?: string;
    tetkikler_sonuclari?: string;
    giris_tipi?: string; // "Poliklinik", "Cerrahi Yatış", "Acil", "Dahili Yatış"
    on_tani_tani?: string;
    icd10_kodu?: string;
    planlanan_tedavi_islem?: string;
    anlasma_durumu?: string; // "Anlaşmalı", "Anlaşmasız"
    operator?: string;
    anestezi?: string;
    asistan?: string;
    tarih?: string;
}

export const insuranceProvisionApi = {
    getPrefill: async (params: { hasta_id?: string; appointment_id?: number; exam_id?: string }): Promise<InsuranceProvisionDTO> => {
        const queryParams = new URLSearchParams();
        if (params.hasta_id) queryParams.append('hasta_id', params.hasta_id);
        if (params.appointment_id) queryParams.append('appointment_id', params.appointment_id.toString());
        if (params.exam_id) queryParams.append('exam_id', params.exam_id);
        return apiFetch<InsuranceProvisionDTO>(`/api/v1/insurance-provision/prefill?${queryParams.toString()}`);
    },

    generatePDF: async (dto: InsuranceProvisionDTO): Promise<Blob> => {
        const token = useAuthStore.getState().token;
        const response = await fetch('/api/v1/insurance-provision/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            let errorText = 'PDF oluşturulurken sunucu hatası oluştu.';
            try {
                const errJson = await response.json();
                errorText = errJson.detail || errorText;
            } catch {
                errorText = await response.text();
            }
            throw new Error(errorText);
        }

        return await response.blob();
    },
};
