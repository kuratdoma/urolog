import { apiFetch } from './client';
import {
    BiyopsiSablonu, Definition, Doktor, RandevuTuru, ReceteSablonu, SablonTanim
} from './types';

/** GET /definitions/bootstrap yanıt tipi */
export interface BootstrapResponse {
    doktorlar: Doktor[];
    kurumlar: Definition[];
    meslekler: Definition[];
    sigortalar: Definition[];
    takip_konulari: Definition[];
    randevu_turleri: RandevuTuru[];
    recete_sablonlari: ReceteSablonu[];
}

export const definitionsApi = {

        kurumlar: {
            list: () => apiFetch<Definition[]>('/api/v1/definitions/kurumlar'),
            create: (data: Partial<Definition>) => apiFetch<Definition>('/api/v1/definitions/kurumlar', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: Partial<Definition>) => apiFetch<Definition>(`/api/v1/definitions/kurumlar/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => apiFetch<void>(`/api/v1/definitions/kurumlar/${id}`, { method: 'DELETE' }),
        },
        meslekler: {
            list: () => apiFetch<Definition[]>('/api/v1/definitions/meslekler'),
            create: (data: Partial<Definition>) => apiFetch<Definition>('/api/v1/definitions/meslekler', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: Partial<Definition>) => apiFetch<Definition>(`/api/v1/definitions/meslekler/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => apiFetch<void>(`/api/v1/definitions/meslekler/${id}`, { method: 'DELETE' }),
        },
        sigortalar: {
            list: () => apiFetch<Definition[]>('/api/v1/definitions/sigortalar'),
            create: (data: Partial<Definition>) => apiFetch<Definition>('/api/v1/definitions/sigortalar', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: Partial<Definition>) => apiFetch<Definition>(`/api/v1/definitions/sigortalar/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => apiFetch<void>(`/api/v1/definitions/sigortalar/${id}`, { method: 'DELETE' }),
        },
        anesteziTipleri: {
            list: () => apiFetch<Definition[]>('/api/v1/definitions/anestezi-tipleri'),
            create: (data: Partial<Definition>) => apiFetch<Definition>('/api/v1/definitions/anestezi-tipleri', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: Partial<Definition>) => apiFetch<Definition>(`/api/v1/definitions/anestezi-tipleri/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => apiFetch<void>(`/api/v1/definitions/anestezi-tipleri/${id}`, { method: 'DELETE' }),
        },
        hastaneler: {
            list: () => apiFetch<Definition[]>('/api/v1/definitions/hastaneler'),
            create: (data: Partial<Definition>) => apiFetch<Definition>('/api/v1/definitions/hastaneler', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: Partial<Definition>) => apiFetch<Definition>(`/api/v1/definitions/hastaneler/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => apiFetch<void>(`/api/v1/definitions/hastaneler/${id}`, { method: 'DELETE' }),
        },
        cerrahlar: {
            list: () => apiFetch<Definition[]>('/api/v1/definitions/cerrahlar'),
            create: (data: Partial<Definition>) => apiFetch<Definition>('/api/v1/definitions/cerrahlar', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: Partial<Definition>) => apiFetch<Definition>(`/api/v1/definitions/cerrahlar/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => apiFetch<void>(`/api/v1/definitions/cerrahlar/${id}`, { method: 'DELETE' }),
        },
        anesteziPersonelleri: {
            list: () => apiFetch<Definition[]>('/api/v1/definitions/anestezi-personelleri'),
            create: (data: Partial<Definition>) => apiFetch<Definition>('/api/v1/definitions/anestezi-personelleri', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: Partial<Definition>) => apiFetch<Definition>(`/api/v1/definitions/anestezi-personelleri/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => apiFetch<void>(`/api/v1/definitions/anestezi-personelleri/${id}`, { method: 'DELETE' }),
        },
        hemsireler: {
            list: () => apiFetch<Definition[]>('/api/v1/definitions/hemsireler'),
            create: (data: Partial<Definition>) => apiFetch<Definition>('/api/v1/definitions/hemsireler', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: Partial<Definition>) => apiFetch<Definition>(`/api/v1/definitions/hemsireler/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => apiFetch<void>(`/api/v1/definitions/hemsireler/${id}`, { method: 'DELETE' }),
        },
        asistanlar: {
            list: () => apiFetch<Definition[]>('/api/v1/definitions/asistanlar'),
            create: (data: Partial<Definition>) => apiFetch<Definition>('/api/v1/definitions/asistanlar', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: Partial<Definition>) => apiFetch<Definition>(`/api/v1/definitions/asistanlar/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => apiFetch<void>(`/api/v1/definitions/asistanlar/${id}`, { method: 'DELETE' }),
        },
        randevuTurleri: {
            list: () => apiFetch<RandevuTuru[]>('/api/v1/definitions/randevu-turleri'),
            create: (data: Partial<RandevuTuru>) => apiFetch<RandevuTuru>('/api/v1/definitions/randevu-turleri', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: Partial<RandevuTuru>) => apiFetch<RandevuTuru>(`/api/v1/definitions/randevu-turleri/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => apiFetch<void>(`/api/v1/definitions/randevu-turleri/${id}`, { method: 'DELETE' }),
        },
        biyopsiSablonlari: {
            list: () => apiFetch<BiyopsiSablonu[]>('/api/v1/definitions/biyopsi-sablonlari'),
            create: (data: Partial<BiyopsiSablonu>) => apiFetch<BiyopsiSablonu>('/api/v1/definitions/biyopsi-sablonlari', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: Partial<BiyopsiSablonu>) => apiFetch<BiyopsiSablonu>(`/api/v1/definitions/biyopsi-sablonlari/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => apiFetch<void>(`/api/v1/definitions/biyopsi-sablonlari/${id}`, { method: 'DELETE' }),
        },
        doktorlar: {
            list: () => apiFetch<Doktor[]>('/api/v1/definitions/doktorlar'),
            create: (data: Partial<Doktor>) => apiFetch<Doktor>('/api/v1/definitions/doktorlar', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: Partial<Doktor>) => apiFetch<Doktor>(`/api/v1/definitions/doktorlar/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => apiFetch<void>(`/api/v1/definitions/doktorlar/${id}`, { method: 'DELETE' }),
        },
        tetkikTanimlari: {
            list: (grup?: string) => apiFetch<Definition[]>(`/api/v1/definitions/tetkik-tanimlari${grup ? `?grup=${grup}` : ''}`),
            create: (data: Partial<Definition>) => apiFetch<Definition>('/api/v1/definitions/tetkik-tanimlari', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: Partial<Definition>) => apiFetch<Definition>(`/api/v1/definitions/tetkik-tanimlari/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => apiFetch<void>(`/api/v1/definitions/tetkik-tanimlari/${id}`, { method: 'DELETE' }),
        },
        takipKonulari: {
            list: () => apiFetch<Definition[]>('/api/v1/definitions/takip-konulari'),
            create: (data: Partial<Definition>) => apiFetch<Definition>('/api/v1/definitions/takip-konulari', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: Partial<Definition>) => apiFetch<Definition>(`/api/v1/definitions/takip-konulari/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => apiFetch<void>(`/api/v1/definitions/takip-konulari/${id}`, { method: 'DELETE' }),
        },
        receteSablonlari: {
            list: () => apiFetch<ReceteSablonu[]>('/api/v1/definitions/recete-sablonlari'),
            create: (data: Partial<ReceteSablonu>) => apiFetch<ReceteSablonu>('/api/v1/definitions/recete-sablonlari', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: Partial<ReceteSablonu>) => apiFetch<ReceteSablonu>(`/api/v1/definitions/recete-sablonlari/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => apiFetch<void>(`/api/v1/definitions/recete-sablonlari/${id}`, { method: 'DELETE' }),
        },
        sablonlar: {
            list: (grup?: string) => apiFetch<SablonTanim[]>(`/api/v1/definitions/sablonlar${grup ? `?grup=${grup}` : ''}`),
            create: (data: Partial<SablonTanim>) => apiFetch<SablonTanim>('/api/v1/definitions/sablonlar', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: Partial<SablonTanim>) => apiFetch<SablonTanim>(`/api/v1/definitions/sablonlar/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id: string) => apiFetch<void>(`/api/v1/definitions/sablonlar/${id}`, { method: 'DELETE' }),
        },
        // PERF: 7 tanım listesini tek HTTP isteğiyle döndürür.
        // Tekil list() metodları settings/yönetim sayfaları için korundu.
        bootstrap: () => apiFetch<BootstrapResponse>('/api/v1/definitions/bootstrap'),
    
};
