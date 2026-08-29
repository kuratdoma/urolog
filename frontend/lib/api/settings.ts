import { apiFetch } from './client';
import {
    SystemSetting, SystemSettingCreate
} from './types';

export const settingsApi = {

        getAll: () => apiFetch<SystemSetting[]>('/api/v1/settings'),
        get: (key: string) => apiFetch<SystemSetting>(`/api/v1/settings/${key}`),
        update: (data: SystemSettingCreate) => apiFetch<SystemSetting>('/api/v1/settings', { method: 'POST', body: JSON.stringify(data) }),
        batchUpdate: (data: SystemSettingCreate[]) => apiFetch<SystemSetting[]>('/api/v1/settings/batch', { method: 'POST', body: JSON.stringify(data) }),
    
};
