import { apiFetch } from './client';
import {
    AuditLog
} from './types';

export const auditApi = {

        list: (params?: { skip?: number; limit?: number; action?: string; user_id?: number; start_date?: string; end_date?: string }) => {
            const searchParams = new URLSearchParams();
            if (params?.skip) searchParams.set('skip', String(params.skip));
            if (params?.limit) searchParams.set('limit', String(params.limit));
            if (params?.action) searchParams.set('action', params.action);
            if (params?.user_id) searchParams.set('user_id', String(params.user_id));
            if (params?.start_date) searchParams.set('start_date', params.start_date);
            if (params?.end_date) searchParams.set('end_date', params.end_date);
            return apiFetch<AuditLog[]>(`/api/v1/audit?${searchParams.toString()}`);
        },
    
};
