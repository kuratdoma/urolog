import { useAuthStore } from '@/stores/auth-store';
import { apiFetch } from './client';
import {
    AIScribeResponse, AIScribeStatus, AIScribeTemplate
} from './types';

export const aiScribeApi = {

        getStatus: () => apiFetch<AIScribeStatus>('/api/v1/ai-scribe/status'),
        getTemplates: () => apiFetch<AIScribeTemplate[]>('/api/v1/ai-scribe/templates'),
        analyze: async (audioBlob: Blob, mode: string = 'gemini', template?: string, includeTranscript: boolean = false, patientId?: string, persona: string = 'default') => {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('mode', mode);
            if (template) formData.append('template', template);
            formData.append('include_transcript', String(includeTranscript));
            if (patientId) formData.append('patient_id', patientId);
            formData.append('persona', persona);

            const token = useAuthStore.getState().token;
            const response = await fetch('/api/v1/ai-scribe/analyze', {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `API Error: ${response.status}`);
            }
            return response.json() as Promise<AIScribeResponse>;
        }
    
};
