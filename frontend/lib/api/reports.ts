import { apiFetch } from './client';
import {
    CohortRow, DiagnosisStats, ExtendedReportStats, HeatmapData, ReferenceCategory, ReferencePatient, ServiceDistribution
} from './types';

export const reportsApi = {

        getStats: (params?: { start_date?: string; end_date?: string }) => {
            const searchParams = new URLSearchParams();
            if (params?.start_date) searchParams.set('start_date', params.start_date);
            if (params?.end_date) searchParams.set('end_date', params.end_date);
            return apiFetch<ExtendedReportStats>(`/api/v1/reports/stats?${searchParams.toString()}`);
        },
        getCohort: (monthsBack?: number) => {
            const searchParams = new URLSearchParams();
            if (monthsBack) searchParams.set('months_back', String(monthsBack));
            return apiFetch<CohortRow[]>(`/api/v1/reports/cohort?${searchParams.toString()}`);
        },
        getDiagnosisStats: (params: { icd_code?: string; diagnosis_text?: string; start_date?: string; end_date?: string }) => {
            const searchParams = new URLSearchParams();
            if (params.icd_code) searchParams.set('icd_code', params.icd_code);
            if (params.diagnosis_text) searchParams.set('diagnosis_text', params.diagnosis_text);
            if (params.start_date) searchParams.set('start_date', params.start_date);
            if (params.end_date) searchParams.set('end_date', params.end_date);
            return apiFetch<DiagnosisStats>(`/api/v1/reports/diagnosis?${searchParams.toString()}`);
        },
        getHeatmap: (params?: { start_date?: string; end_date?: string }) => {
            const searchParams = new URLSearchParams();
            if (params?.start_date) searchParams.set('start_date', params.start_date);
            if (params?.end_date) searchParams.set('end_date', params.end_date);
            return apiFetch<HeatmapData[]>(`/api/v1/reports/heatmap?${searchParams.toString()}`);
        },
        getReferenceCategories: (params?: { start_date?: string; end_date?: string }) => {
            const searchParams = new URLSearchParams();
            if (params?.start_date) searchParams.set('start_date', params.start_date);
            if (params?.end_date) searchParams.set('end_date', params.end_date);
            return apiFetch<ReferenceCategory[]>(`/api/v1/reports/reference-categories?${searchParams.toString()}`);
        },
        getServiceDistribution: (params?: { start_date?: string; end_date?: string }) => {
            const searchParams = new URLSearchParams();
            if (params?.start_date) searchParams.set('start_date', params.start_date);
            if (params?.end_date) searchParams.set('end_date', params.end_date);
            return apiFetch<ServiceDistribution[]>(`/api/v1/reports/service-distribution?${searchParams.toString()}`);
        },
        getReferencePatients: (params: { referans: string; start_date?: string; end_date?: string }) => {
            const searchParams = new URLSearchParams();
            searchParams.set('referans', params.referans);
            if (params.start_date) searchParams.set('start_date', params.start_date);
            if (params.end_date) searchParams.set('end_date', params.end_date);
            return apiFetch<ReferencePatient[]>(`/api/v1/reports/reference-patients?${searchParams.toString()}`);
        },
        getDrilldownPatients: (params: { type: 'weekly' | 'monthly' | 'reference'; value: string; start_date?: string; end_date?: string }) => {
            const searchParams = new URLSearchParams();
            searchParams.set('type', params.type);
            searchParams.set('value', params.value);
            if (params.start_date) searchParams.set('start_date', params.start_date);
            if (params.end_date) searchParams.set('end_date', params.end_date);
            return apiFetch<ReferencePatient[]>(`/api/v1/reports/drilldown-patients?${searchParams.toString()}`);
        },
    
};
