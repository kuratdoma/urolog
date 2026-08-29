import { create } from 'zustand';

import { AIScribeResponse } from '@/lib/api';

interface AIScribeState {
    latestResult: AIScribeResponse | null;
    setLatestResult: (result: AIScribeResponse | null) => void;
    isProcessing: boolean;
    setIsProcessing: (processing: boolean) => void;
}

export const useAIScribeStore = create<AIScribeState>((set) => ({
    latestResult: null,
    setLatestResult: (result) => set({ latestResult: result }),
    isProcessing: false,
    setIsProcessing: (processing) => set({ isProcessing: processing }),
}));
