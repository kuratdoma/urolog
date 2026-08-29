import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UserRole = 'ADMIN' | 'DOCTOR' | 'NURSE' | 'FRONTDESK';

interface User {
    id: number;
    username: string;
    full_name?: string;
    role?: UserRole;
    is_superuser?: boolean;
}

interface PermissionsState {
    role: UserRole;
    modules: Record<string, string[]>;
}

interface AuthState {
    token: string | null;
    user: User | null;
    permissions: PermissionsState | null;
    setAuth: (token: string) => void;
    setPermissions: (perms: PermissionsState) => void;
    logout: () => void;
    isAuthenticated: () => boolean;

    // RBAC helpers
    hasModuleAccess: (module: string) => boolean;
    canPerform: (module: string, action: string) => boolean;
    getUserRole: () => UserRole;

    isSessionExpired: boolean;
    triggerSessionExpired: () => void;
    clearSessionExpired: () => void;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            user: null,
            permissions: null,
            setAuth: (token) => {
                // Decode user from JWT (simple base64 decode)
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    set({
                        token,
                        user: {
                            id: parseInt(payload.sub),
                            username: payload.username || payload.name || 'user',
                            full_name: payload.name,
                            role: payload.role as UserRole || 'DOCTOR',
                            is_superuser: payload.is_superuser === true
                        }
                    });
                } catch {
                    set({ token, user: null });
                }
            },
            setPermissions: (perms) => {
                set({ permissions: perms });
            },
            logout: async () => {
                // SEC: refresh token artık httpOnly cookie'de, backend
                // logout endpoint'i onu cookie'den okuyup temizliyor —
                // client'ın token'ı bilmesine/göndermesine gerek yok.
                try {
                    const { authApi } = await import('@/lib/api/auth');
                    await authApi.logout();
                } catch {
                    // Server-side revocation failed (token expired, network error, etc.)
                    // Local cleanup will still happen below
                }
                set({ token: null, user: null, permissions: null });
            },
            isAuthenticated: () => !!get().token,

            // RBAC: Check if current user can see a module (at least read access)
            hasModuleAccess: (module: string) => {
                const perms = get().permissions;
                if (!perms) return true; // Fallback: if permissions not loaded yet, allow (will be checked server-side)
                return module in perms.modules;
            },

            // RBAC: Check if current user can perform a specific action on a module
            canPerform: (module: string, action: string) => {
                const perms = get().permissions;
                if (!perms) return true;
                const modulePerms = perms.modules[module];
                if (!modulePerms) return false;
                return modulePerms.includes(action);
            },

            // RBAC: Get current user's role with safe fallback
            getUserRole: () => {
                const perms = get().permissions;
                if (perms?.role) return perms.role;
                return get().user?.role || 'FRONTDESK';
            },

            isSessionExpired: false,
            triggerSessionExpired: () => {
                // Clear sensitive state immediately
                set({
                    token: null,
                    user: null,
                    permissions: null,
                    isSessionExpired: true
                });

                // Clear other sensitive persisted stores manually if needed.
                // patient-store now lives in sessionStorage (see stores/patient-store.ts).
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('patient-storage');
                }
            },
            clearSessionExpired: () => set({ isSessionExpired: false }),
            _hasHydrated: false,
            setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),
        }),
        {
            name: 'urolog-auth',
            // SEC: access token localStorage'a yazılmıyor — bellekte kalır,
            // sayfa yenilenince httpOnly refresh cookie'sinden sessizce
            // yenilenir (bkz. app/providers.tsx). Sadece user/permissions
            // (hassas olmayan UI verisi) diske yazılıyor.
            partialize: (state) => ({
                user: state.user,
                permissions: state.permissions,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);

