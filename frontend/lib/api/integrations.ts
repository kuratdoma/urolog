import { apiFetch } from './client';

export interface UserGoogleStatus {
    user_id: number;
    user_name: string;
    user_email: string;
    connected: boolean;
    is_expired: boolean;
    has_refresh_token: boolean;
}

export const integrationsApi = {

        // Google Calendar
        getGoogleAuthUrl: (targetUserId?: number) => {
            const url = targetUserId
                ? `/api/v1/integrations/google/auth-url?target_user_id=${targetUserId}`
                : `/api/v1/integrations/google/auth-url`;
            return apiFetch<{ url: string; state: string }>(url);
        },
        getGoogleStatus: () => apiFetch<{ connected: boolean; expiry?: string; is_expired?: boolean }>('/api/v1/integrations/google/status'),
        getGoogleConfigStatus: () => apiFetch<{ configured: boolean; has_client_id: boolean; has_client_secret: boolean }>('/api/v1/integrations/google/config-status'),
        getAllUsersGoogleStatus: () => apiFetch<UserGoogleStatus[]>('/api/v1/integrations/google/all-users-status'),
        disconnectGoogle: (targetUserId?: number) => {
            const url = targetUserId
                ? `/api/v1/integrations/google/disconnect?target_user_id=${targetUserId}`
                : `/api/v1/integrations/google/disconnect`;
            return apiFetch<{ status: string }>(url, { method: 'DELETE' });
        },

        // Appointment Sync
        syncToGoogle: (appointmentId: string) =>
            apiFetch<{ message: string; google_event_id: string }>(`/api/v1/appointments/${appointmentId}/sync`, { method: 'POST' }),
        removeFromGoogle: (appointmentId: string) =>
            apiFetch<{ message: string }>(`/api/v1/appointments/${appointmentId}/sync`, { method: 'DELETE' }),

        // iCal Download URL (returns the URL, not the file itself)
        getIcsDownloadUrl: (appointmentId: string) => `/api/v1/appointments/${appointmentId}/ics`,
    
};
