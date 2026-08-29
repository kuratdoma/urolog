import { apiFetch } from './client';

export interface LipusDetails {
    id: string;
    muayene_id: string;
    takip_donemi: string;
    ed_tedavisi_6ay?: string;
    pde5_yaniti?: string;
    alerji_var?: boolean;
    cerrahi_oyku?: string;
    eslik_eden_hastalik?: string;
    kullanilan_ilaclar?: string;
    iief_s1?: number;
    iief_s2?: number;
    iief_s3?: number;
    iief_s4?: number;
    iief_s5?: number;
    iief_s6?: number;
    iief_total?: number;
    sep2?: string;
    sep3?: string;
    gaq1?: string;
    gaq2?: string;
    ehs_skor?: number;
    memnuniyet_sabah?: number;
    memnuniyet_cinsel?: number;
    memnuniyet_mast?: number;
    vas_skor?: number;
    yan_etki_kizariklik?: boolean;
    yan_etki_morarma?: boolean;
    yan_etki_hematuri?: boolean;
    yan_etki_yanma?: boolean;
    yan_etki_diger?: string;
    created_at?: string;
    updated_at?: string;
}

export const lipusApi = {
    getDashboardData: async (patientId: string) => {
        return apiFetch(`/api/v1/clinical/lipus/patients/${patientId}/dashboard`);
    },
    
    getDetailsByMuayene: async (muayeneId: string) => {
        return apiFetch(`/api/v1/clinical/lipus/muayene/${muayeneId}`);
    },

    createDetails: async (data: Partial<LipusDetails>) => {
        return apiFetch('/api/v1/clinical/lipus', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    updateDetails: async (id: string, data: Partial<LipusDetails>) => {
        return apiFetch(`/api/v1/clinical/lipus/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    deleteDetails: async (id: string) => {
        return apiFetch(`/api/v1/clinical/lipus/${id}`, {
            method: 'DELETE',
        });
    }
};
