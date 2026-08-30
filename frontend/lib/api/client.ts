import { useAuthStore } from '@/stores/auth-store';

const API_BASE_URL = '';  // Always use proxy (no direct backend connection)

export interface FetchOptions extends RequestInit {
    token?: string;
    _isRetry?: boolean;  // Internal flag to prevent infinite retry loops
}

/**
 * SEC-CRIT: Backend refresh token rotasyonu tek-kullanımlıktır — aynı refresh
 * cookie'siyle eşzamanlı iki /auth/refresh isteği gidip ikincisi "kullanılmış
 * token tekrar geldi" (replay) tespiti yaparsa kullanıcının TÜM oturumu iptal
 * edilir (bkz. backend auth.py refresh_token). Sayfa yenilendiğinde onlarca
 * sorgu paralel 401 alıp her biri kendi refresh çağrısını yaparsa bu senaryo
 * tetiklenir. Bu modül-seviyesi promise, eşzamanlı tüm çağrıları TEK gerçek
 * ağ isteğine indirger; herkes aynı sonucu bekler.
 */
let inFlightRefresh: Promise<{ access_token: string; token_type: string } | null> | null = null;

export async function refreshAccessToken(): Promise<{ access_token: string; token_type: string } | null> {
    if (inFlightRefresh) return inFlightRefresh;

    inFlightRefresh = (async () => {
        // SEC: refresh token artık httpOnly cookie'de (backend tarafından
        // yönetiliyor) — burada okunmuyor/gönderilmiyor, tarayıcı otomatik
        // ekliyor (credentials: 'include').
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                // Refresh failed — token expired or revoked
                return null;
            }

            const data = await response.json() as {
                access_token: string;
                token_type: string;
            };

            useAuthStore.getState().setAuth(data.access_token);
            return data;
        } catch {
            return null;
        }
    })();

    try {
        return await inFlightRefresh;
    } finally {
        inFlightRefresh = null;
    }
}

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns true if successful, false otherwise.
 */
async function tryRefreshToken(): Promise<boolean> {
    const data = await refreshAccessToken();
    return data !== null;
}

/**
 * FastAPI hata gövdesinden okunabilir mesajı çıkarır.
 * Metin detail'i doğrudan, doğrulama hatası dizisini birleştirerek döner;
 * gövde JSON değilse veya detail yoksa null.
 */
function extractErrorDetail(body: string): string | null {
    if (!body) return null;
    try {
        const detail = JSON.parse(body)?.detail;
        if (typeof detail === 'string' && detail.trim()) {
            return detail;
        }
        if (Array.isArray(detail)) {
            const msg = detail
                .map((d: { msg?: string }) => d?.msg)
                .filter(Boolean)
                .join(', ');
            return msg || null;
        }
    } catch {
        // Gövde JSON değil — çağıran genel mesaja düşer
    }
    return null;
}

export async function apiFetch<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const { token, _isRetry, ...fetchOptions } = options;

    const headers: HeadersInit = {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
    };

    const storedToken = useAuthStore.getState().token;
    const effectiveToken = token || storedToken;

    if (effectiveToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${effectiveToken}`;
    } else {
        console.warn('apiFetch: No token available for', endpoint);
        console.warn('Auth Store state:', JSON.stringify({
            hasToken: !!useAuthStore.getState().token,
            hasUser: !!useAuthStore.getState().user,
            hydrated: useAuthStore.getState()._hasHydrated
        }));
    }

    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
        redirect: 'manual',
        credentials: 'include',
    });

    // FastAPI returns 307 for trailing-slash redirects.
    if (response.status === 307 || response.status === 308) {
        const redirectUrl = response.headers.get('Location');
        if (redirectUrl) {
            response = await fetch(redirectUrl, {
                ...fetchOptions,
                headers,
                credentials: 'include',
            });
        }
    }

    if (!response.ok) {
        if (response.status === 401) {
            const isSecureEndpoint = endpoint.includes('/audit') || endpoint.includes('/verify-password');

            // SEC-CRIT-01: Try to refresh the token before giving up
            if (!_isRetry && !isSecureEndpoint) {
                const refreshed = await tryRefreshToken();
                if (refreshed) {
                    // Retry the original request with the new token
                    return apiFetch<T>(endpoint, { ...options, _isRetry: true });
                }
            }

            const tokenExists = !!useAuthStore.getState().token;
            const tokenPreview = useAuthStore.getState().token?.substring(0, 30) + '...';
            console.error('=== 401 UNAUTHORIZED DEBUG ===');
            console.error('Endpoint:', endpoint);
            console.error('Token exists:', tokenExists);
            console.error('Token preview:', tokenPreview);
            console.error('Request URL:', `${API_BASE_URL}${endpoint}`);
            console.error('Response status:', response.status);
            const errorText = await response.clone().text();
            console.error('Response body:', errorText);
            console.error('===============================');

            if (!isSecureEndpoint) {
                useAuthStore.getState().triggerSessionExpired();
            }
        }
        const error = await response.text();

        // FastAPI hataları {"detail": "..."} biçiminde gelir. Ham JSON'u kullanıcıya
        // göstermemek için okunabilir mesajı çıkar; çıkaramazsak genel mesaja düş.
        const detailMessage = extractErrorDetail(error);
        throw new Error(detailMessage ?? `API Error: ${response.status} - ${error}`);
    }

    return response.json();
}
