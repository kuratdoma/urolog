import { apiFetch } from './client';
import {
    LabTrendRequest, LabTrendResponse
} from './types';

export const labAnalysisApi = {

        getTrends: (data: LabTrendRequest) =>
            apiFetch<LabTrendResponse[]>('/api/v1/lab-analysis/trends', { method: 'POST', body: JSON.stringify(data) }),
    
};
