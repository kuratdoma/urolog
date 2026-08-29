/**
 * Telemetry Utility for Examination Forms
 * 
 * Centralizes analytics event tracking.
 * In a real environment, this would plug into Pendo, Mixpanel, or custom backend logging.
 */

type ExaminationEventType =
    | 'form_viewed'
    | 'form_started'
    | 'form_completed'
    | 'validation_error'
    | 'auto_save_success'
    | 'auto_save_failure'
    | 'offline_queue_add'
    | 'offline_queue_flush';

interface TelemetryPayload {
    feature: string; // e.g., 'IPSS', 'IIEF'
    patientId?: string;
    durationMs?: number;
    error?: string;
    [key: string]: any;
}

export const trackEvent = (event: ExaminationEventType, payload: TelemetryPayload) => {
    // In production, this would be: analytics.track(event, payload);
    // For now, we use a structured debug log if in dev mode

    if (process.env.NODE_ENV === 'development') {
        console.groupCollapsed(`📊 Telemetry: [${payload.feature}] ${event}`);
        console.log(payload);
        console.groupEnd();
    }
};
