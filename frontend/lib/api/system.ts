import { apiFetch } from './client';
import {
    ICDTani, ICDTaniCreate, IlacResponse
} from './types';

export const systemApi = {

        search_icd: (query?: string, skip: number = 0, limit: number = 100) => {
            const params = new URLSearchParams();
            if (query) params.set('q', query);
            params.set('skip', String(skip));
            params.set('limit', String(limit));
            return apiFetch<ICDTani[]>(`/api/v1/system/icd?${params.toString()}`);
        },
        create_icd: (data: ICDTaniCreate) => apiFetch<ICDTani>('/api/v1/system/icd', { method: 'POST', body: JSON.stringify(data) }),
        delete_batch_icd: (ids: number[]) => apiFetch<{ success: boolean }>('/api/v1/system/icd/delete-batch', { method: 'POST', body: JSON.stringify(ids) }),



        // Drugs
        get_drugs: (query?: string, skip: number = 0, limit: number = 50) => {
            const params = new URLSearchParams();
            if (query) params.set('q', query);
            params.set('skip', String(skip));
            params.set('limit', String(limit));
            return apiFetch<IlacResponse[]>(`/api/v1/system/drugs?${params.toString()}`);
        },
        getIlaclar: (query?: string, skip: number = 0, limit: number = 50) => {
            const params = new URLSearchParams();
            if (query) params.set('q', query);
            params.set('skip', String(skip));
            params.set('limit', String(limit));
            return apiFetch<IlacResponse[]>(`/api/v1/system/drugs?${params.toString()}`);
        },
        upload_drugs: (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return apiFetch<{ status: string; imported_count: number }>('/api/v1/system/drugs/upload', {
                method: 'POST',
                body: formData,
            });
        },
        get_backups: () => apiFetch<any[]>('/api/v1/system/backups/'),
        import_local_drugs: (filename: string) => apiFetch<{ status: string; imported_count: number }>('/api/v1/system/drugs/import-local', {
            method: 'POST',
            body: JSON.stringify({ filename })
        })
    
};
