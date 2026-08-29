import { apiFetch } from './client';
import {
    Appointment, AppointmentCreate
} from './types';

export const appointmentsApi = {

        list: (params?: { start?: string; end?: string; include_deleted?: boolean }) => {
            const searchParams = new URLSearchParams();
            if (params?.start) searchParams.set('start', params.start);
            if (params?.end) searchParams.set('end', params.end);
            if (params?.include_deleted) searchParams.set('include_deleted', 'true');
            return apiFetch<Appointment[]>(`/api/v1/appointments?${searchParams.toString()}`);
        },
        getForPatient: (patientId: string) =>
            apiFetch<Appointment[]>(`/api/v1/appointments/patient/${patientId}`),
        create: (data: AppointmentCreate) =>
            apiFetch<Appointment>('/api/v1/appointments', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: Partial<AppointmentCreate>) =>
            apiFetch<Appointment>(`/api/v1/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id: string, reason?: string) =>
            apiFetch<void>(`/api/v1/appointments/${id}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`, { method: 'DELETE' }),
    
};
