import { useState, useCallback, useEffect, useRef } from 'react';
import { IPSSData, IPSSSchema, defaultIPSSData } from './schema';
import { ipssAdapter } from './adapter';
import { FormStatus } from '../../shared/types';
import { trackEvent } from '../../shared/telemetry';
import { calculateScores } from './logic';

type LegacyIPSSInput = {
    residiv_hissi?: string;
    pollakiuri?: string;
    kesik_idrar_yapma?: string;
    urgency?: string;
    projeksiyon_azalma?: string;
    idrar_bas_zorluk?: string;
    nokturi?: string;
    ipss_skor?: string;
};

export interface UseIPSSOptions {
    initialData?: Partial<IPSSData> | LegacyIPSSInput;
    onAutoSave?: (data: LegacyIPSSInput) => Promise<void> | void;
    isLegacyMode?: boolean;
}

export const useIPSSController = ({ initialData, onAutoSave, isLegacyMode = false }: UseIPSSOptions = {}) => {
    // Initialize State
    const [data, setData] = useState<IPSSData>(() => {
        if (!initialData) return defaultIPSSData;

        // Auto-detect if legacy structure
        if ('residiv_hissi' in initialData || 'pollakiuri' in initialData) {
            return ipssAdapter.toNew(initialData as LegacyIPSSInput);
        }
        return { ...defaultIPSSData, ...initialData } as IPSSData;
    });

    const [status, setStatus] = useState<FormStatus>('idle');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Debounce Ref
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Derived State
    const scores = calculateScores(data);

    // Change Handler
    const handleChange = useCallback((newData: IPSSData) => {
        setData(newData);
        setStatus('validating');

        // Validation
        const result = IPSSSchema.safeParse(newData);
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach(issue => {
                fieldErrors[String(issue.path[0])] = issue.message;
            });
            setErrors(fieldErrors);
            setStatus('error');
            return; // Don't auto-save if invalid? Or save anyway? Usually save draft.
        } else {
            setErrors({});
        }

        // Auto-Save Logic (Debounced)
        if (onAutoSave) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            setStatus('saving');
            timeoutRef.current = setTimeout(async () => {
                try {
                    const payload = isLegacyMode ? ipssAdapter.toLegacy(newData) : newData;
                    await onAutoSave(payload as any);
                    setStatus('saved');
                    trackEvent('auto_save_success', { feature: 'IPSS' });
                } catch (err) {
                    console.error("IPSS Auto-save failed", err);
                    setStatus('error');
                    trackEvent('auto_save_failure', { feature: 'IPSS', error: String(err) });
                }
            }, 1000); // 1s debounce
        }
    }, [onAutoSave, isLegacyMode]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return {
        data: { ...data, ipss_total: scores.total }, // Ensure total is always consistent with fields
        setData: handleChange,
        status,
        errors,
        severity: scores.severity,
        metrics: scores
    };
};
