import { apiFetch } from './client';
import {
    AylikOzet, BorcluHasta, FinansHizmet, FinansHizmetCreate, FinansIslem, FinansIslemCreate, FinansIslemFilters, FinansKasa, FinansKasaCreate, FinansKategori, FinansKategoriCreate, FinansOzet, Firma, FirmaBorcOzet, FirmaCreate, GunlukOzet, HastaCari, KasaHareket
} from './types';

export const financeApi = {

        // Kategoriler
        getCategories: (tip?: string) => {
            const params = new URLSearchParams();
            if (tip) params.set('tip', tip);
            return apiFetch<FinansKategori[]>(`/api/v1/finance/categories?${params.toString()}`);
        },
        createCategory: (data: FinansKategoriCreate) =>
            apiFetch<FinansKategori>('/api/v1/finance/categories', { method: 'POST', body: JSON.stringify(data) }),
        updateCategory: (id: string, data: Partial<FinansKategoriCreate>) =>
            apiFetch<FinansKategori>(`/api/v1/finance/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteCategory: (id: string) =>
            apiFetch<void>(`/api/v1/finance/categories/${id}`, { method: 'DELETE' }),

        // Hizmetler (Yeni)
        getServices: (aktifOnly: boolean = true) =>
            apiFetch<FinansHizmet[]>(`/api/v1/finance/services?aktif_only=${aktifOnly}`),
        createService: (data: FinansHizmetCreate) =>
            apiFetch<FinansHizmet>('/api/v1/finance/services', { method: 'POST', body: JSON.stringify(data) }),
        updateService: (id: string, data: Partial<FinansHizmetCreate>) =>
            apiFetch<FinansHizmet>(`/api/v1/finance/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteService: (id: string) =>
            apiFetch<void>(`/api/v1/finance/services/${id}`, { method: 'DELETE' }),

        // Kasalar (Yeni)
        getAccounts: (aktifOnly: boolean = true) =>
            apiFetch<FinansKasa[]>(`/api/v1/finance/accounts?aktif_only=${aktifOnly}`),
        getAccountBalance: (id: string) =>
            apiFetch<{ kasa_id: string; ad: string; bakiye: number }>(`/api/v1/finance/accounts/${id}/balance`),
        getAccountMovements: (id: string, limit: number = 50) =>
            apiFetch<KasaHareket[]>(`/api/v1/finance/accounts/${id}/movements?limit=${limit}`),
        createAccount: (data: FinansKasaCreate) =>
            apiFetch<FinansKasa>('/api/v1/finance/accounts', { method: 'POST', body: JSON.stringify(data) }),
        transferBetweenAccounts: (kaynak_kasa_id: string, hedef_kasa_id: string, tutar: number, aciklama?: string) =>
            apiFetch<{ success: boolean }>('/api/v1/finance/accounts/transfer', {
                method: 'POST',
                body: JSON.stringify({ kaynak_kasa_id, hedef_kasa_id, tutar, aciklama })
            }),
        updateAccount: (id: string, data: Partial<FinansKasaCreate>) =>
            apiFetch<FinansKasa>(`/api/v1/finance/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteAccount: (id: string) =>
            apiFetch<void>(`/api/v1/finance/accounts/${id}`, { method: 'DELETE' }),

        // Firmalar
        getCompanies: () => apiFetch<Firma[]>('/api/v1/finance/companies'),
        getCompanyDebts: () => apiFetch<FirmaBorcOzet[]>('/api/v1/finance/companies/debts'),
        createCompany: (data: FirmaCreate) =>
            apiFetch<Firma>('/api/v1/finance/companies', { method: 'POST', body: JSON.stringify(data) }),
        updateCompany: (id: string, data: Partial<FirmaCreate>) =>
            apiFetch<Firma>(`/api/v1/finance/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

        // İşlemler
        getTransactions: (params?: FinansIslemFilters & { skip?: number; limit?: number }) => {
            const searchParams = new URLSearchParams();
            if (params?.start_date) searchParams.set('start_date', params.start_date);
            if (params?.end_date) searchParams.set('end_date', params.end_date);
            if (params?.islem_tipi) searchParams.set('islem_tipi', params.islem_tipi);
            if (params?.durum) searchParams.set('durum', params.durum);
            if (params?.kategori_id) searchParams.set('kategori_id', String(params.kategori_id));
            if (params?.hasta_id) searchParams.set('hasta_id', params.hasta_id);
            if (params?.firma_id) searchParams.set('firma_id', String(params.firma_id));
            if (params?.referans) searchParams.set('referans', params.referans);
            if (params?.vade_gecmis !== undefined) searchParams.set('vade_gecmis', String(params.vade_gecmis));
            if (params?.skip) searchParams.set('skip', String(params.skip));
            if (params?.limit) searchParams.set('limit', String(params.limit));
            return apiFetch<{ items: FinansIslem[]; total: number }>(`/api/v1/finance/transactions?${searchParams.toString()}`);
        },
        getTransaction: (id: string) =>
            apiFetch<FinansIslem>(`/api/v1/finance/transactions/${id}`),
        createTransaction: (data: FinansIslemCreate) =>
            apiFetch<FinansIslem>('/api/v1/finance/transactions', { method: 'POST', body: JSON.stringify(data) }),
        updateTransaction: (id: string, data: Partial<FinansIslemCreate>) =>
            apiFetch<FinansIslem>(`/api/v1/finance/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        cancelTransaction: (id: string, iptal_nedeni: string) =>
            apiFetch<FinansIslem>(`/api/v1/finance/transactions/${id}/cancel`, {
                method: 'POST',
                body: JSON.stringify({ iptal_nedeni })
            }),
        deleteTransaction: (id: string) =>
            apiFetch<void>(`/api/v1/finance/transactions/${id}`, { method: 'DELETE' }),

        // Hasta Cari
        getPatientTransactions: (hastaId: string) =>
            apiFetch<FinansIslem[]>(`/api/v1/finance/patients/${hastaId}/transactions`),
        getPatientBalance: (hastaId: string) =>
            apiFetch<HastaCari>(`/api/v1/finance/patients/${hastaId}/balance`),
        getDebtors: (minBorc: number = 0) =>
            apiFetch<BorcluHasta[]>(`/api/v1/finance/patients/debtors?min_borc=${minBorc}`),

        // Vadesi Geçmiş
        getOverdueTransactions: () =>
            apiFetch<{ items: FinansIslem[]; total: number }>('/api/v1/finance/overdue'),

        getSummary: (startDate?: string, endDate?: string) => {
            const params = new URLSearchParams();
            if (startDate) params.set('start_date', startDate);
            if (endDate) params.set('end_date', endDate);
            return apiFetch<FinansOzet>(`/api/v1/finance/summary?${params.toString()}`);
        },
        getDailySummary: (tarih?: string) => {
            const params = new URLSearchParams();
            if (tarih) params.set('tarih', tarih);
            return apiFetch<GunlukOzet>(`/api/v1/finance/summary/daily?${params.toString()}`);
        },
        getMonthlySummary: (yil?: number) => {
            const params = new URLSearchParams();
            if (yil) params.set('yil', String(yil));
            return apiFetch<AylikOzet[]>(`/api/v1/finance/summary/monthly?${params.toString()}`);
        },

    
};
