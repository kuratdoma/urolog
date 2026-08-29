import { apiFetch } from './client';
import {
    AylikOzet, BorcluHasta, FinansHizmet, FinansHizmetCreate, FinansIslem, FinansIslemCreate, FinansIslemFilters, FinansKasa, FinansKasaCreate, FinansKategori, FinansKategoriCreate, FinansOzet, FinansTaksit, Firma, KategoriKirilim, YaslandirmaKova, AcikIslem, TopluTahsilatSonuc, HastaEkstre, DuzenliGider, DuzenliGiderCreate, BekleyenUretim, UretimSonuc, FirmaBorcOzet, FirmaCreate, GunlukOzet, HastaCari, KasaHareket
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
        updateCategory: (id: number, data: Partial<FinansKategoriCreate>) =>
            apiFetch<FinansKategori>(`/api/v1/finance/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteCategory: (id: number) =>
            apiFetch<void>(`/api/v1/finance/categories/${id}`, { method: 'DELETE' }),

        // Hizmetler (Yeni)
        getServices: (aktifOnly: boolean = true) =>
            apiFetch<FinansHizmet[]>(`/api/v1/finance/services?aktif_only=${aktifOnly}`),
        createService: (data: FinansHizmetCreate) =>
            apiFetch<FinansHizmet>('/api/v1/finance/services', { method: 'POST', body: JSON.stringify(data) }),
        updateService: (id: number, data: Partial<FinansHizmetCreate>) =>
            apiFetch<FinansHizmet>(`/api/v1/finance/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteService: (id: number) =>
            apiFetch<void>(`/api/v1/finance/services/${id}`, { method: 'DELETE' }),

        // Kasalar (Yeni)
        getAccounts: (aktifOnly: boolean = true) =>
            apiFetch<FinansKasa[]>(`/api/v1/finance/accounts?aktif_only=${aktifOnly}`),
        getAccountBalance: (id: number) =>
            apiFetch<{ kasa_id: number; ad: string; bakiye: number }>(`/api/v1/finance/accounts/${id}/balance`),
        getAccountMovements: (id: number, opts: { skip?: number; limit?: number; start_date?: string; end_date?: string } = {}) => {
            const p = new URLSearchParams();
            p.set('skip', String(opts.skip ?? 0));
            p.set('limit', String(opts.limit ?? 50));
            if (opts.start_date) p.set('start_date', opts.start_date);
            if (opts.end_date) p.set('end_date', opts.end_date);
            return apiFetch<KasaHareket[]>(`/api/v1/finance/accounts/${id}/movements?${p.toString()}`);
        },
        createAccount: (data: FinansKasaCreate) =>
            apiFetch<FinansKasa>('/api/v1/finance/accounts', { method: 'POST', body: JSON.stringify(data) }),
        transferBetweenAccounts: (kaynak_kasa_id: number, hedef_kasa_id: number, tutar: number, aciklama?: string) =>
            apiFetch<{ success: boolean }>('/api/v1/finance/accounts/transfer', {
                method: 'POST',
                body: JSON.stringify({ kaynak_kasa_id, hedef_kasa_id, tutar, aciklama })
            }),
        updateAccount: (id: number, data: Partial<FinansKasaCreate>) =>
            apiFetch<FinansKasa>(`/api/v1/finance/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteAccount: (id: number) =>
            apiFetch<void>(`/api/v1/finance/accounts/${id}`, { method: 'DELETE' }),

        // Firmalar
        getCompanies: () => apiFetch<Firma[]>('/api/v1/finance/companies'),
        getCompanyDebts: () => apiFetch<FirmaBorcOzet[]>('/api/v1/finance/companies/debts'),
        createCompany: (data: FirmaCreate) =>
            apiFetch<Firma>('/api/v1/finance/companies', { method: 'POST', body: JSON.stringify(data) }),
        updateCompany: (id: number, data: Partial<FirmaCreate>) =>
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
        getTransaction: (id: number) =>
            apiFetch<FinansIslem>(`/api/v1/finance/transactions/${id}`),
        createTransaction: (data: FinansIslemCreate) =>
            apiFetch<FinansIslem>('/api/v1/finance/transactions', { method: 'POST', body: JSON.stringify(data) }),
        updateTransaction: (id: number, data: Partial<FinansIslemCreate>) =>
            apiFetch<FinansIslem>(`/api/v1/finance/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        addPayment: (id: number, data: {
            kasa_id?: number;
            odeme_tarihi: string;
            tutar: number;
            odeme_yontemi: string;
            taksit_sayisi?: number;
            notlar?: string;
        }) =>
            apiFetch<FinansIslem>(`/api/v1/finance/transactions/${id}/payments`, {
                method: 'POST',
                body: JSON.stringify(data)
            }),
        deletePayment: (islemId: number, odemeId: number) =>
            apiFetch<FinansIslem>(`/api/v1/finance/transactions/${islemId}/payments/${odemeId}`, {
                method: 'DELETE'
            }),
        collectInstallment: (taksitId: number, tahsilTarihi?: string) => {
            const q = tahsilTarihi ? `?tahsil_tarihi=${tahsilTarihi}` : '';
            return apiFetch<FinansTaksit>(`/api/v1/finance/installments/${taksitId}/collect${q}`, {
                method: 'POST'
            });
        },
        uncollectInstallment: (taksitId: number) =>
            apiFetch<FinansTaksit>(`/api/v1/finance/installments/${taksitId}/uncollect`, {
                method: 'POST'
            }),
        cancelTransaction: (id: number, iptal_nedeni: string) =>
            apiFetch<FinansIslem>(`/api/v1/finance/transactions/${id}/cancel`, {
                method: 'POST',
                body: JSON.stringify({ iptal_nedeni })
            }),
        deleteTransaction: (id: number) =>
            apiFetch<void>(`/api/v1/finance/transactions/${id}`, { method: 'DELETE' }),

        // Hasta Cari
        getPatientTransactions: (hastaId: string) =>
            apiFetch<FinansIslem[]>(`/api/v1/finance/patients/${hastaId}/transactions`),
        getPatientBalance: (hastaId: string) =>
            apiFetch<HastaCari>(`/api/v1/finance/patients/${hastaId}/balance`),
        getPatientStatement: (hastaId: string, startDate?: string, endDate?: string) => {
            const p = new URLSearchParams();
            if (startDate) p.set('start_date', startDate);
            if (endDate) p.set('end_date', endDate);
            const q = p.toString();
            return apiFetch<HastaEkstre>(`/api/v1/finance/patients/${hastaId}/statement${q ? `?${q}` : ''}`);
        },
        getOpenTransactions: (hastaId: string) =>
            apiFetch<AcikIslem[]>(`/api/v1/finance/patients/${hastaId}/open-transactions`),
        collectBulk: (hastaId: string, data: {
            tutar: number;
            kasa_id?: number;
            odeme_yontemi: string;
            odeme_tarihi: string;
        }) =>
            apiFetch<TopluTahsilatSonuc>(`/api/v1/finance/patients/${hastaId}/collect`, {
                method: 'POST',
                body: JSON.stringify(data)
            }),
        getDebtors: (minBorc: number = 0, opts: { skip?: number; limit?: number } = {}) => {
            const p = new URLSearchParams({ min_borc: String(minBorc) });
            p.set('skip', String(opts.skip ?? 0));
            p.set('limit', String(opts.limit ?? 100));
            return apiFetch<BorcluHasta[]>(`/api/v1/finance/patients/debtors?${p.toString()}`);
        },

        // Vadesi Geçmiş
        getOverdueTransactions: () =>
            apiFetch<{ items: FinansIslem[]; total: number }>('/api/v1/finance/overdue'),

        // Düzenli giderler
        getRecurringExpenses: (aktifOnly: boolean = false) =>
            apiFetch<DuzenliGider[]>(`/api/v1/finance/recurring-expenses?aktif_only=${aktifOnly}`),
        createRecurringExpense: (data: DuzenliGiderCreate) =>
            apiFetch<DuzenliGider>('/api/v1/finance/recurring-expenses', { method: 'POST', body: JSON.stringify(data) }),
        updateRecurringExpense: (id: number, data: Partial<DuzenliGiderCreate>) =>
            apiFetch<DuzenliGider>(`/api/v1/finance/recurring-expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteRecurringExpense: (id: number) =>
            apiFetch<{ success: boolean }>(`/api/v1/finance/recurring-expenses/${id}`, { method: 'DELETE' }),
        getPendingRecurring: () =>
            apiFetch<BekleyenUretim[]>('/api/v1/finance/recurring-expenses/pending'),
        generateRecurring: () =>
            apiFetch<UretimSonuc>('/api/v1/finance/recurring-expenses/generate', { method: 'POST' }),

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
        getCategoryBreakdown: (islemTipi: 'gelir' | 'gider' = 'gelir', startDate?: string, endDate?: string) => {
            const p = new URLSearchParams({ islem_tipi: islemTipi });
            if (startDate) p.set('start_date', startDate);
            if (endDate) p.set('end_date', endDate);
            return apiFetch<KategoriKirilim[]>(`/api/v1/finance/reports/category-breakdown?${p.toString()}`);
        },
        getAgingReport: () =>
            apiFetch<YaslandirmaKova[]>('/api/v1/finance/reports/aging'),
        getMonthlySummary: (yil?: number) => {
            const params = new URLSearchParams();
            if (yil) params.set('yil', String(yil));
            return apiFetch<AylikOzet[]>(`/api/v1/finance/summary/monthly?${params.toString()}`);
        },

    
};
