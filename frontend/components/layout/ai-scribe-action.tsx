'use client';

import { usePathname, useParams } from 'next/navigation';
import { useSettingsStore } from '@/stores/settings-store';
import { useAIScribeStore } from '@/stores/ai-scribe-store';
import { AIScribeWidget } from '@/components/ai-scribe/ai-scribe-widget';

export function AIScribeAction() {
    const pathname = usePathname();
    const params = useParams();
    const patientId = params?.id as string;
    const { aiScribeEnabled } = useSettingsStore();
    const { setLatestResult } = useAIScribeStore();

    const canShowScribe = pathname?.includes('/examination') ||
        pathname?.includes('/followup') ||
        pathname?.includes('/operation') ||
        pathname?.includes('/medical-report');

    if (!aiScribeEnabled) return null;

    // Always render to keep state, but we could hide it visually if needed.
    // However, the user wants it to stay across pages.
    return (
        <AIScribeWidget
            onResult={(result) => {
                setLatestResult(result);
            }}
            patientId={patientId}
        />
    );
}
