import { useState, useCallback, useEffect, useRef } from 'react';
import { IIEFData, IIEFSchema, defaultIIEFData } from './schema';
import { iiefAdapter } from './adapter';
import { FormStatus } from '../../shared/types';
import { trackEvent } from '../../shared/telemetry';
import { calculateScores } from './logic';

// Define locally if needed or import shared type
type LegacyIIEFInput = { iief_ef_answers?: string };

export interface UseIIEFOptions {
    initialData?: Partial<IIEFData> | LegacyIIEFInput;
    onAutoSave?: (data: LegacyIIEFInput) => Promise<void> | void;
    isLegacyMode?: boolean;
}

export const useIIEFController = ({ initialData, onAutoSave, isLegacyMode = false }: UseIIEFOptions = {}) => {
    // Initialize State
    const [data, setData] = useState<IIEFData>(() => {
        if (!initialData) return defaultIIEFData;

        if ('iief_ef_answers' in initialData) {
            return iiefAdapter.toNew(initialData as LegacyIIEFInput);
        }
        return { ...defaultIIEFData, ...initialData } as IIEFData;
    });

    const [status, setStatus] = useState<FormStatus>('idle');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Debounce Ref
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Derived State
    const scores = calculateScores(data);

    // Change Handler
    const handleChange = useCallback((newData: IIEFData) => {
        setData(newData);
        setStatus('validating');

        // Validation
        const result = IIEFSchema.safeParse(newData);
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach(issue => {
                fieldErrors[String(issue.path[0])] = issue.message;
            });
            setErrors(fieldErrors);
            setStatus('error');
            return;
        } else {
            setErrors({});
        }

        // Auto-Save Logic (Debounced)
        if (onAutoSave) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            setStatus('saving');
            timeoutRef.current = setTimeout(async () => {
                try {
                    const payload = isLegacyMode ? iiefAdapter.toLegacy(newData) : newData;
                    await onAutoSave(payload as any);
                    setStatus('saved');
                    trackEvent('auto_save_success', { feature: 'IIEF' });
                } catch (err) {
                    console.error("IIEF Auto-save failed", err);
                    setStatus('error');
                    trackEvent('auto_save_failure', { feature: 'IIEF', error: String(err) });
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
        data: { ...data, iief_total: scores.total },
        setData: handleChange,
        status,
        errors,
        severity: scores.severity,
        metrics: scores
    };
};
