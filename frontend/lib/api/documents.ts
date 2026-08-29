import { apiFetch } from './client';

export const documentsApi = {

        list: (patientId: string) =>
            apiFetch<Record<string, unknown>[]>(`/api/v1/documents/patients/${patientId}/documents`),
        create: (data: Record<string, unknown>) =>
            apiFetch<Record<string, unknown>>('/api/v1/documents/documents', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: number, data: Record<string, unknown>) =>
            apiFetch<Record<string, unknown>>(`/api/v1/documents/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id: number) =>
            apiFetch<void>(`/api/v1/documents/documents/${id}`, { method: 'DELETE' }),
        upload: (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return apiFetch<{ status: string; url: string; filename: string }>('/api/v1/documents/upload', {
                method: 'POST',
                body: formData,
            });
        },
    
};
