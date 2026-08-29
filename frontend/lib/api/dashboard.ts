import { apiFetch } from './client';
import { DashboardData } from '@/types/dashboard';

export const dashboardApi = {

        get: () => apiFetch<DashboardData>('/api/v1/dashboard'),
    
};
