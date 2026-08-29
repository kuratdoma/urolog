import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ExaminationModules {
    edModule: boolean;  // ED Form (Erektil Disfonksiyon)
    peModule: boolean;  // Physical Examination Form
    arapPEModule: boolean; // Arap PE (Ejaculation Dysfunction)
    microEnergyModule: boolean; // Mikro-enerji (Lipus) Module
}

interface SettingsState {
    logoUrl: string | null;
    logoWidth: number; // Percentage or px width, let's use percentage relative to container or px. Let's say PX for width.
    clinicName: string;
    darkMode: boolean;
    compactMode: boolean;
    autoCapitalize: boolean; // System-wide auto-capitalize for text inputs
    examinationModules: ExaminationModules;
    showFinanceModule: boolean;
    showStockModule: boolean;

    // AI Scribe
    aiScribeEnabled: boolean;
    aiHpvBriefingEnabled: boolean;
    aiScribeMode: 'gemini' | 'local' | 'hybrid_google_local' | 'hybrid_google_gemini';
    aiScribeRecordingsPath: string;

    setLogoUrl: (url: string | null) => void;
    setLogoWidth: (width: number) => void;
    setClinicName: (name: string) => void;
    setDarkMode: (dark: boolean) => void;
    setCompactMode: (compact: boolean) => void;
    setAutoCapitalize: (autoCapitalize: boolean) => void;
    setExaminationModule: (module: keyof ExaminationModules, enabled: boolean) => void;
    setShowFinanceModule: (show: boolean) => void;
    setShowStockModule: (show: boolean) => void;
    setAiScribeEnabled: (enabled: boolean) => void;
    setAiHpvBriefingEnabled: (enabled: boolean) => void;
    setAiScribeMode: (mode: 'gemini' | 'local' | 'hybrid_google_local' | 'hybrid_google_gemini') => void;
    setAiScribeRecordingsPath: (path: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            logoUrl: null,
            logoWidth: 100,
            clinicName: 'UroLog EMR',
            darkMode: false,
            compactMode: false,
            autoCapitalize: false, // Default to disabled
            examinationModules: {
                edModule: true,
                peModule: true,
                arapPEModule: false,
                microEnergyModule: true,
            },
            showFinanceModule: true,
            showStockModule: true,
            aiScribeEnabled: false,
            aiHpvBriefingEnabled: true,
            aiScribeMode: 'gemini',
            aiScribeRecordingsPath: 'static/recordings',

            setLogoUrl: (url) => set({ logoUrl: url }),
            setLogoWidth: (width) => set({ logoWidth: width }),
            setClinicName: (name) => set({ clinicName: name }),
            setDarkMode: (dark) => set({ darkMode: dark }),
            setCompactMode: (compact) => set({ compactMode: compact }),
            setAutoCapitalize: (autoCapitalize) => set({ autoCapitalize }),
            setExaminationModule: (module, enabled) => set((state) => ({
                examinationModules: { ...state.examinationModules, [module]: enabled }
            })),
            setShowFinanceModule: (show) => set({ showFinanceModule: show }),
            setShowStockModule: (show) => set({ showStockModule: show }),
            setAiScribeEnabled: (enabled) => set({ aiScribeEnabled: enabled }),
            setAiHpvBriefingEnabled: (enabled) => set({ aiHpvBriefingEnabled: enabled }),
            setAiScribeMode: (mode) => set({ aiScribeMode: mode }),
            setAiScribeRecordingsPath: (path) => set({ aiScribeRecordingsPath: path }),
        }),
        {
            name: 'settings-storage',
            version: 1,
            migrate: (persistedState: any, version: number) => {
                // Determine if state needs migration. 
                // For now, we'll simply return the persisted state or a default if version is mismatched.
                // In a real migration scenario, we would transform the state here.
                return persistedState as SettingsState;
            },
        }
    )
);

