import { apiFetch } from './client';
import { validateResponse, PatientSchema } from '../schemas';
import {
    PaginatedResponse, Patient, PatientCreate, PatientReportDTO, TimelineItem
} from './types';

export const patientsApi = {

        list: (params?: { skip?: number; limit?: number; search?: string; ad?: string; soyad?: string }) => {
            const searchParams = new URLSearchParams();
            if (params?.skip) searchParams.set('skip', String(params.skip));
            if (params?.limit) searchParams.set('limit', String(params.limit));
            if (params?.search) searchParams.set('search', params.search);
            if (params?.ad) searchParams.set('ad', params.ad);
            if (params?.soyad) searchParams.set('soyad', params.soyad);
            return apiFetch<Patient[]>(`/api/v1/patients?${searchParams.toString()}`);
        },
        get: async (id: string) => {
            const data = await apiFetch<Patient>(`/api/v1/patients/${id}`);
            return validateResponse(data, PatientSchema, `patients.get(${id})`) as Patient;
        },
        getById: (id: string) => apiFetch<Patient>(`/api/v1/patients/${id}`),
        getCounts: (id: string) => apiFetch<{
            muayene: number;
            imaging: number;
            operation: number;
            followup: number;
            document: number;
            photo: number;
        }>(`/api/v1/patients/${id}/counts`),
        getTimeline: (id: string) => apiFetch<TimelineItem[]>(`/api/v1/patients/${id}/timeline`),
        create: (data: PatientCreate) =>
            apiFetch<Patient>('/api/v1/patients', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: Partial<Patient>) =>
            apiFetch<Patient>(`/api/v1/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id: string) =>
            apiFetch<Patient>(`/api/v1/patients/${id}`, { method: 'DELETE' }),
        getReferences: () =>
            apiFetch<string[]>('/api/v1/patients/references'),
        advancedSearch: (params?: {
            tani?: string;
            yas_min?: number;
            yas_max?: number;
            muayene_tarihi_baslangic?: string;
            muayene_tarihi_bitis?: string;
            son_islem_tarihi_baslangic?: string;
            son_islem_tarihi_bitis?: string;
            ilk_kayit_tarihi_baslangic?: string;
            ilk_kayit_tarihi_bitis?: string;
            operasyon_tarihi_baslangic?: string;
            operasyon_tarihi_bitis?: string;
            operasyon_adi?: string;
            sikayet?: string;
            oyku?: string;
            bulgu?: string;
            referans?: string;
            skip?: number;
            limit?: number;
        }) => {
            const searchParams = new URLSearchParams();
            if (params?.tani) searchParams.set('tani', params.tani);
            if (params?.yas_min !== undefined) searchParams.set('yas_min', String(params.yas_min));
            if (params?.yas_max !== undefined) searchParams.set('yas_max', String(params.yas_max));
            if (params?.muayene_tarihi_baslangic) searchParams.set('muayene_tarihi_baslangic', params.muayene_tarihi_baslangic);
            if (params?.muayene_tarihi_bitis) searchParams.set('muayene_tarihi_bitis', params.muayene_tarihi_bitis);
            if (params?.son_islem_tarihi_baslangic) searchParams.set('son_islem_tarihi_baslangic', params.son_islem_tarihi_baslangic);
            if (params?.son_islem_tarihi_bitis) searchParams.set('son_islem_tarihi_bitis', params.son_islem_tarihi_bitis);
            if (params?.ilk_kayit_tarihi_baslangic) searchParams.set('ilk_kayit_tarihi_baslangic', params.ilk_kayit_tarihi_baslangic);
            if (params?.ilk_kayit_tarihi_bitis) searchParams.set('ilk_kayit_tarihi_bitis', params.ilk_kayit_tarihi_bitis);
            if (params?.operasyon_tarihi_baslangic) searchParams.set('operasyon_tarihi_baslangic', params.operasyon_tarihi_baslangic);
            if (params?.operasyon_tarihi_bitis) searchParams.set('operasyon_tarihi_bitis', params.operasyon_tarihi_bitis);
            if (params?.operasyon_adi) searchParams.set('operasyon_adi', params.operasyon_adi);
            if (params?.sikayet) searchParams.set('sikayet', params.sikayet);
            if (params?.oyku) searchParams.set('oyku', params.oyku);
            if (params?.bulgu) searchParams.set('bulgu', params.bulgu);
            if (params?.referans) searchParams.set('referans', params.referans);
            if (params?.skip) searchParams.set('skip', String(params.skip));
            if (params?.limit) searchParams.set('limit', String(params.limit));
            return apiFetch<PaginatedResponse<Patient>>(`/api/v1/patients/advanced-search?${searchParams.toString()}`);
        },
        exportAdvancedSearch: (params?: {
            tani?: string;
            yas_min?: number;
            yas_max?: number;
            muayene_tarihi_baslangic?: string;
            muayene_tarihi_bitis?: string;
            son_islem_tarihi_baslangic?: string;
            son_islem_tarihi_bitis?: string;
            ilk_kayit_tarihi_baslangic?: string;
            ilk_kayit_tarihi_bitis?: string;
            operasyon_tarihi_baslangic?: string;
            operasyon_tarihi_bitis?: string;
            operasyon_adi?: string;
            sikayet?: string;
            oyku?: string;
            bulgu?: string;
            referans?: string;
        }) => {
            const searchParams = new URLSearchParams();
            if (params?.tani) searchParams.set('tani', params.tani);
            if (params?.yas_min !== undefined) searchParams.set('yas_min', String(params.yas_min));
            if (params?.yas_max !== undefined) searchParams.set('yas_max', String(params.yas_max));
            if (params?.muayene_tarihi_baslangic) searchParams.set('muayene_tarihi_baslangic', params.muayene_tarihi_baslangic);
            if (params?.muayene_tarihi_bitis) searchParams.set('muayene_tarihi_bitis', params.muayene_tarihi_bitis);
            if (params?.son_islem_tarihi_baslangic) searchParams.set('son_islem_tarihi_baslangic', params.son_islem_tarihi_baslangic);
            if (params?.son_islem_tarihi_bitis) searchParams.set('son_islem_tarihi_bitis', params.son_islem_tarihi_bitis);
            if (params?.ilk_kayit_tarihi_baslangic) searchParams.set('ilk_kayit_tarihi_baslangic', params.ilk_kayit_tarihi_baslangic);
            if (params?.ilk_kayit_tarihi_bitis) searchParams.set('ilk_kayit_tarihi_bitis', params.ilk_kayit_tarihi_bitis);
            if (params?.operasyon_tarihi_baslangic) searchParams.set('operasyon_tarihi_baslangic', params.operasyon_tarihi_baslangic);
            if (params?.operasyon_tarihi_bitis) searchParams.set('operasyon_tarihi_bitis', params.operasyon_tarihi_bitis);
            if (params?.operasyon_adi) searchParams.set('operasyon_adi', params.operasyon_adi);
            if (params?.sikayet) searchParams.set('sikayet', params.sikayet);
            if (params?.oyku) searchParams.set('oyku', params.oyku);
            if (params?.bulgu) searchParams.set('bulgu', params.bulgu);
            if (params?.referans) searchParams.set('referans', params.referans);
            return `/api/v1/patients/advanced-search/export?${searchParams.toString()}`;
        },
        getReport: (id: string) =>
            apiFetch<PatientReportDTO>(`/api/v1/patient-report/${id}`),
    
};
