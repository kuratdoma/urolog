import { apiFetch } from './client';
import { useAuthStore } from '@/stores/auth-store';

export interface ConsentFormItem {
    id: string;
    display_name: string;
    category: string;
    usage_count?: number;
    order_index?: number;
}

export const consentFormsApi = {
    /**
     * Mevcut onam formlarını listeler.
     */
    list: () =>
        apiFetch<ConsentFormItem[]>('/api/v1/consent-forms'),

    /**
     * Hastaya özel kişiselleştirilmiş onam formu PDF'ini indirir ve yeni sekmede açar.
     */
    preview: async (
        formId: string,
        hastaId: string,
        options?: {
            doktorId?: number;
            tarih?: string;
            saat?: string;
        }
    ): Promise<void> => {
        // Open a blank tab synchronously to bypass popup blockers
        const newWindow = window.open('', '_blank');
        if (newWindow) {
            newWindow.document.write('<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">PDF Hazırlanıyor...</div>');
        }

        const params = new URLSearchParams();
        if (options?.doktorId) params.set('doktor_id', String(options.doktorId));
        if (options?.tarih) params.set('tarih', options.tarih);
        if (options?.saat) params.set('saat', options.saat);

        const queryString = params.toString();
        const url = `/api/v1/consent-forms/${formId}/preview/${hastaId}${queryString ? `?${queryString}` : ''}`;

        try {
            const token = useAuthStore.getState().token;
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`PDF oluşturulamadı: ${response.status} - ${error}`);
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            if (newWindow) {
                newWindow.location.href = blobUrl;
            } else {
                window.open(blobUrl, '_blank');
            }
        } catch (error) {
            if (newWindow) newWindow.close();
            throw error;
        }
    },

    /**
     * Yeni onam formu yükler.
     */
    upload: async (file: File, displayName: string, category: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('display_name', displayName);
        formData.append('category', category);

        // Fetch API aracılığıyla FormData gönderimi
        const token = useAuthStore.getState().token;
        const response = await fetch('/api/v1/consent-forms', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Yükleme başarısız: ${response.status} - ${error}`);
        }
        return response.json();
    },

    /**
     * Onam formunu siler.
     */
    delete: async (formId: string) => {
        return apiFetch(`/api/v1/consent-forms/${formId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Onam formunu günceller.
     */
    update: async (formId: string, displayName: string, category: string) => {
        return apiFetch<ConsentFormItem>(`/api/v1/consent-forms/${formId}`, {
            method: 'PUT',
            body: JSON.stringify({ display_name: displayName, category }),
        });
    },

    /**
     * Onam formlarının sıralamasını günceller.
     */
    reorder: async (orders: { id: string; order_index: number }[]) => {
        return apiFetch(`/api/v1/consent-forms/reorder`, {
            method: 'PUT',
            body: JSON.stringify(orders),
        });
    },
};
