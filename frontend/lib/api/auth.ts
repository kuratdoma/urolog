import { apiFetch } from './client';
import {
    SystemUser, SystemUserCreate
} from './types';

const API_BASE_URL = '';

/**
 * FastAPI hata gövdesinden okunabilir bir mesaj çıkarır.
 *
 * `detail` bir string olabilir; 422 doğrulama hatalarında [{ msg, loc }] dizisi,
 * bazı handler'larda da düz bir nesne döner. Bunları doğrudan `new Error()`e
 * vermek kullanıcıya "[object Object]" gösterir — bu yüzden yalnızca string'i
 * geçiriyor, diziyi birleştiriyor, geri kalanında genel mesaja düşüyoruz.
 */
function extractErrorDetail(text: string, status: number): string {
    try {
        const detail = JSON.parse(text)?.detail;
        if (typeof detail === 'string' && detail.trim()) return detail;
        if (Array.isArray(detail)) {
            const messages = detail
                .map((item) => (typeof item === 'string' ? item : item?.msg))
                .filter((msg): msg is string => typeof msg === 'string' && !!msg.trim());
            if (messages.length) return messages.join(', ');
        }
    } catch {
        // JSON değilse aşağıdaki düz metin / genel mesaja düşülür.
    }
    return text.trim() || `Giriş başarısız (HTTP ${status}).`;
}

export const authApi = {

        login: async (username: string, password: string) => {
            const formData = new URLSearchParams();
            formData.append('username', username.trim());
            formData.append('password', password);

            // SEC: refresh token artık response body'de dönmüyor, backend
            // httpOnly cookie olarak set ediyor — credentials: 'include'
            // ile tarayıcının bu cookie'yi saklaması sağlanıyor.
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData,
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(extractErrorDetail(await response.text(), response.status));
            }
            return response.json() as Promise<{ access_token: string; token_type: string }>;
        },
        me: () => apiFetch<SystemUser>('/api/v1/auth/me'),
        verifyPassword: (password: string) =>
            apiFetch<{ valid: boolean; is_superuser: boolean }>('/api/v1/auth/verify-password', {
                method: 'POST',
                body: JSON.stringify({ password })
            }),
        getUsers: () => apiFetch<SystemUser[]>('/api/v1/auth/users'),
        forgotUsername: async (email: string) => {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-username`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Error: ${response.status} - ${text}`);
            }
            return response.json() as Promise<{ message: string }>;
        },
        forgotPassword: async (email: string) => {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({ detail: 'Bir hata oluştu' }));
                throw new Error(data.detail || 'Bir hata oluştu');
            }
            return response.json() as Promise<{ message: string }>;
        },
        resetPassword: async (token: string, newPassword: string) => {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, new_password: newPassword }),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({ detail: 'Bir hata oluştu' }));
                throw new Error(data.detail || 'Bir hata oluştu');
            }
            return response.json() as Promise<{ message: string }>;
        },
        createUser: (data: SystemUserCreate) =>
            apiFetch<SystemUser>('/api/v1/auth/users', { method: 'POST', body: JSON.stringify(data) }),
        updateUser: (id: string, data: Partial<SystemUserCreate>) =>
            apiFetch<SystemUser>(`/api/v1/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteUser: (id: string) =>
            apiFetch<void>(`/api/v1/auth/users/${id}`, { method: 'DELETE' }),
        getMyPermissions: () =>
            apiFetch<{ role: string; modules: Record<string, string[]> }>('/api/v1/auth/me/permissions'),
        emergencyDropDatabase: (password: string, confirmationPhrase: string) =>
            apiFetch<{ status: string }>('/api/v1/emergency/drop-database', {
                method: 'POST',
                body: JSON.stringify({ password, confirmation_phrase: confirmationPhrase })
            }),
        refresh: async () => {
            // PERF/SEC-CRIT: refreshAccessToken() eşzamanlı çağrıları tek ağ
            // isteğine indirger — backend refresh token rotasyonu tek
            // kullanımlık olduğu için paralel iki çağrı ikincisini "replay"
            // sayıp tüm oturumu iptal edebilir (bkz. client.ts açıklaması).
            const { refreshAccessToken } = await import('./client');
            const data = await refreshAccessToken();
            if (!data) {
                throw new Error('Refresh Error: refresh token geçersiz veya süresi dolmuş.');
            }
            return data;
        },
        logout: () =>
            apiFetch<{ message: string }>('/api/v1/auth/logout', {
                method: 'POST',
            }),
    
};
