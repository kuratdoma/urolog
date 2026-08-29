import { useAuthStore } from '@/stores/auth-store';
import { apiFetch } from './client';
import { validateResponse, MuayeneSchema } from '../schemas';
import {
    ConsultationReport, ConsultationReportCreate, FollowUp, FollowUpCreate, Imaging, ImagingCreate, LabUroflowmetri, LabUroflowmetriCreate, MedicalReport, MedicalReportCreate, Muayene, MuayeneCreate, Operation, OperationCreate, PhoneCall, PhoneCallCreate, Photo, PhotoCreate, PrivateNote, PrivateNoteCreate, RestReport, RestReportCreate, StatusReport, StatusReportCreate, TrusBiyopsi, TrusBiyopsiCreate
} from './types';

const API_BASE_URL = '';

export const clinicalApi = {

        getMuayeneler: (patientId: string) =>
            apiFetch<Muayene[]>(`/api/v1/clinical/patients/${patientId}/muayeneler`),
        getAllMuayenelerReport: (params?: { start_date?: string; end_date?: string; search?: string }) => {
            const searchParams = new URLSearchParams();
            if (params?.start_date) searchParams.set('start_date', params.start_date);
            if (params?.end_date) searchParams.set('end_date', params.end_date);
            if (params?.search) searchParams.set('search', params.search);
            return apiFetch<Muayene[]>(`/api/v1/clinical/muayeneler/report?${searchParams.toString()}`);
        },
        getMuayene: async (id: string) => {
            const data = await apiFetch<Muayene>(`/api/v1/clinical/muayeneler/${id}`);
            return validateResponse(data, MuayeneSchema, `clinical.getMuayene(${id})`) as Muayene;
        },
        createMuayene: (data: MuayeneCreate) =>
            apiFetch<Muayene>('/api/v1/clinical/muayeneler', { method: 'POST', body: JSON.stringify(data) }),
        updateMuayene: (id: string, data: Partial<MuayeneCreate>) =>
            apiFetch<Muayene>(`/api/v1/clinical/muayeneler/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteMuayene: (id: string) =>
            apiFetch<void>(`/api/v1/clinical/muayeneler/${id}`, { method: 'DELETE' }),
        getOperations: (patientId: string) =>
            apiFetch<Operation[]>(`/api/v1/clinical/patients/${patientId}/operasyonlar`),
        getAllOperationsReport: (params?: { start_date?: string; end_date?: string; search?: string }) => {
            const searchParams = new URLSearchParams();
            if (params?.start_date) searchParams.set('start_date', params.start_date);
            if (params?.end_date) searchParams.set('end_date', params.end_date);
            if (params?.search) searchParams.set('search', params.search);
            return apiFetch<Operation[]>(`/api/v1/clinical/operasyonlar/report?${searchParams.toString()}`);
        },
        getOperation: (id: string) =>
            apiFetch<Operation>(`/api/v1/clinical/operasyonlar/${id}`),
        createOperation: (data: OperationCreate) =>
            apiFetch<Operation>('/api/v1/clinical/operasyonlar', { method: 'POST', body: JSON.stringify(data) }),
        updateOperation: (id: string, data: Partial<OperationCreate>) =>
            apiFetch<Operation>(`/api/v1/clinical/operasyonlar/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteOperation: (id: string) =>
            apiFetch<void>(`/api/v1/clinical/operasyonlar/${id}`, { method: 'DELETE' }),
        getFollowUps: (patientId: string) =>
            apiFetch<FollowUp[]>(`/api/v1/clinical/patients/${patientId}/takip`),
        getFollowUp: (id: string) =>
            apiFetch<FollowUp>(`/api/v1/clinical/takip/${id}`),
        createFollowUp: (data: FollowUpCreate) =>
            apiFetch<FollowUp>('/api/v1/clinical/takip', { method: 'POST', body: JSON.stringify(data) }),
        updateFollowUp: (id: string, data: Partial<FollowUpCreate>) =>
            apiFetch<FollowUp>(`/api/v1/clinical/takip/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteFollowUp: (id: string) =>
            apiFetch<void>(`/api/v1/clinical/takip/${id}`, { method: 'DELETE' }),

        // Imaginig (TetkikSonuc)
        getImagings: (patientId: string) =>
            apiFetch<Imaging[]>(`/api/v1/clinical/patients/${patientId}/imagings`),
        getImaging: (id: string) =>
            apiFetch<Imaging>(`/api/v1/clinical/imagings/${id}`),
        createImaging: (data: ImagingCreate) =>
            apiFetch<Imaging>('/api/v1/clinical/imagings', { method: 'POST', body: JSON.stringify(data) }),
        updateImaging: (id: string, data: Partial<ImagingCreate>) =>
            apiFetch<Imaging>(`/api/v1/clinical/imagings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteImaging: (id: string) =>
            apiFetch<void>(`/api/v1/clinical/imagings/${id}`, { method: 'DELETE' }),

        // Labs
        // Labs
        upload_document: async (patientId: string, file: File, _type: 'radiology' | 'pathology' | 'other' = 'radiology', date?: string) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('patient_id', patientId);
            formData.append('type', _type);
            if (date) formData.append('date', date);

            const token = useAuthStore.getState().token;
            const response = await fetch(`${API_BASE_URL}/api/v1/clinical/documents`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `API Error: ${response.status}`);
            }
            return response.json();
        },
        getLabs: (patientId: string, _type: string) =>
            apiFetch<Record<string, unknown>[]>(`/api/v1/clinical/patients/${patientId}/labs`), // Fetches all labs
        getLab: (id: string) =>
            apiFetch<Record<string, unknown>>(`/api/v1/clinical/labs/${id}`),
        createLab: (_type: string, data: Record<string, unknown>) =>
            apiFetch<Record<string, unknown>>(`/api/v1/lab/${_type}`, { method: 'POST', body: JSON.stringify(data) }),
        parseLabText: (text: string) =>
            apiFetch<Record<string, unknown>>('/api/v1/lab/parse', { method: 'POST', body: JSON.stringify({ text }) }),
        parseLabPdf: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const token = useAuthStore.getState().token;
            const response = await fetch(`${API_BASE_URL}/api/v1/lab/parse-pdf`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `API Error: ${response.status}`);
            }
            return response.json();
        },
        analyzeLab: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const token = useAuthStore.getState().token;
            const response = await fetch(`${API_BASE_URL}/api/v1/lab/analyze`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `API Error: ${response.status}`);
            }
            return response.json();
        },
        createGenelLabBatch: (data: Record<string, unknown>[]) =>
            apiFetch<Record<string, unknown>[]>('/api/v1/lab/genel/batch', { method: 'POST', body: JSON.stringify(data) }),
        deleteGenelLabBatch: (ids: number[]) =>
            apiFetch<boolean>('/api/v1/lab/genel/batch', { method: 'DELETE', body: JSON.stringify(ids) }),

        // Uroflowmetri
        getUroflowmetri: (patientId: string) =>
            apiFetch<LabUroflowmetri[]>(`/api/v1/lab/patients/${patientId}/uroflowmetri`),
        createUroflowmetri: (data: LabUroflowmetriCreate) =>
            apiFetch<LabUroflowmetri>('/api/v1/lab/uroflowmetri', { method: 'POST', body: JSON.stringify(data) }),
        deleteUroflowmetri: (id: string) =>
            apiFetch<void>(`/api/v1/lab/uroflowmetri/${id}`, { method: 'DELETE' }),

        // Photos
        getPhotos: (patientId: string) =>
            apiFetch<Photo[]>(`/api/v1/clinical/patients/${patientId}/photos`),
        createPhoto: (data: PhotoCreate) =>
            apiFetch<Photo>('/api/v1/clinical/photos', { method: 'POST', body: JSON.stringify(data) }),
        updatePhoto: (id: string, data: Partial<PhotoCreate>) =>
            apiFetch<Photo>(`/api/v1/clinical/photos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deletePhoto: (id: string) =>
            apiFetch<void>(`/api/v1/clinical/photos/${id}`, { method: 'DELETE' }),

        // Phone Calls
        getPhoneCalls: (patientId: string) =>
            apiFetch<PhoneCall[]>(`/api/v1/clinical/patients/${patientId}/phone-calls`),
        createPhoneCall: (data: PhoneCallCreate) =>
            apiFetch<PhoneCall>('/api/v1/clinical/phone-calls', { method: 'POST', body: JSON.stringify(data) }),
        updatePhoneCall: (id: string, data: Partial<PhoneCallCreate>) =>
            apiFetch<PhoneCall>(`/api/v1/clinical/phone-calls/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deletePhoneCall: (id: string) =>
            apiFetch<void>(`/api/v1/clinical/phone-calls/${id}`, { method: 'DELETE' }),

        // Private Notes (Kişisel Notlar)
        getPrivateNotes: (patientId: string) =>
            apiFetch<PrivateNote[]>(`/api/v1/clinical/patients/${patientId}/private-notes`),
        createPrivateNote: (data: PrivateNoteCreate) =>
            apiFetch<PrivateNote>('/api/v1/clinical/private-notes', { method: 'POST', body: JSON.stringify(data) }),
        updatePrivateNote: (id: string, data: Partial<PrivateNoteCreate>) =>
            apiFetch<PrivateNote>(`/api/v1/clinical/private-notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deletePrivateNote: (id: string) =>
            apiFetch<void>(`/api/v1/clinical/private-notes/${id}`, { method: 'DELETE' }),

        // Rest Reports
        getRestReports: (patientId: string) =>
            apiFetch<RestReport[]>(`/api/v1/clinical/patients/${patientId}/rest-reports`),
        getRestReport: (id: string) =>
            apiFetch<RestReport>(`/api/v1/clinical/rest-reports/${id}`),
        createRestReport: (data: RestReportCreate) =>
            apiFetch<RestReport>('/api/v1/clinical/rest-reports', { method: 'POST', body: JSON.stringify(data) }),
        updateRestReport: (id: string, data: Partial<RestReportCreate>) =>
            apiFetch<RestReport>(`/api/v1/clinical/rest-reports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteRestReport: (id: string) =>
            apiFetch<void>(`/api/v1/clinical/rest-reports/${id}`, { method: 'DELETE' }),

        // Consultation Reports (Konsültasyon)
        getConsultationReports: (patientId: string) =>
            apiFetch<ConsultationReport[]>(`/api/v1/clinical/patients/${patientId}/consultation-reports`),
        getConsultationReport: (id: string) =>
            apiFetch<ConsultationReport>(`/api/v1/clinical/consultation-reports/${id}`),
        createConsultationReport: (data: ConsultationReportCreate) =>
            apiFetch<ConsultationReport>('/api/v1/clinical/consultation-reports', { method: 'POST', body: JSON.stringify(data) }),
        updateConsultationReport: (id: string, data: Partial<ConsultationReportCreate>) =>
            apiFetch<ConsultationReport>(`/api/v1/clinical/consultation-reports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteConsultationReport: (id: string) =>
            apiFetch<void>(`/api/v1/clinical/consultation-reports/${id}`, { method: 'DELETE' }),

        // Status Reports (Durum Bildirir)
        getStatusReports: (patientId: string) =>
            apiFetch<StatusReport[]>(`/api/v1/clinical/patients/${patientId}/status-reports`),
        getStatusReport: (id: string) =>
            apiFetch<StatusReport>(`/api/v1/clinical/status-reports/${id}`),
        createStatusReport: (data: StatusReportCreate) =>
            apiFetch<StatusReport>('/api/v1/clinical/status-reports', { method: 'POST', body: JSON.stringify(data) }),
        updateStatusReport: (id: string, data: Partial<StatusReportCreate>) =>
            apiFetch<StatusReport>(`/api/v1/clinical/status-reports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteStatusReport: (id: string) =>
            apiFetch<void>(`/api/v1/clinical/status-reports/${id}`, { method: 'DELETE' }),

        // Medical Intervention Reports (Tıbbi Müdahale)
        getMedicalReports: (patientId: string) =>
            apiFetch<MedicalReport[]>(`/api/v1/clinical/patients/${patientId}/medical-reports`),
        getMedicalReport: (id: string) =>
            apiFetch<MedicalReport>(`/api/v1/clinical/medical-reports/${id}`),
        createMedicalReport: (data: MedicalReportCreate) =>
            apiFetch<MedicalReport>('/api/v1/clinical/medical-reports', { method: 'POST', body: JSON.stringify(data) }),
        updateMedicalReport: (id: string, data: Partial<MedicalReportCreate>) =>
            apiFetch<MedicalReport>(`/api/v1/clinical/medical-reports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteMedicalReport: (id: string) =>
            apiFetch<void>(`/api/v1/clinical/medical-reports/${id}`, { method: 'DELETE' }),

        // Trus Biopsy
        getTrusBiopsies: (patientId: string) =>
            apiFetch<TrusBiyopsi[]>(`/api/v1/clinical/patients/${patientId}/trus-biopsies`),
        getTrusBiopsy: (id: string) =>
            apiFetch<TrusBiyopsi>(`/api/v1/clinical/trus-biopsies/${id}`),
        createTrusBiopsy: (data: TrusBiyopsiCreate) =>
            apiFetch<TrusBiyopsi>('/api/v1/clinical/trus-biopsies', { method: 'POST', body: JSON.stringify(data) }),
        updateTrusBiopsy: (id: string, data: Partial<TrusBiyopsiCreate>) =>
            apiFetch<TrusBiyopsi>(`/api/v1/clinical/trus-biopsies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteTrusBiopsy: (id: string) =>
            apiFetch<void>(`/api/v1/clinical/trus-biopsies/${id}`, { method: 'DELETE' }),
    
};
