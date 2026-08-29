import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface PatientSummary {
    id: string;
    ad: string;
    soyad: string;
    tc_kimlik?: string | null;
    dogum_tarihi?: string | null;
    protokol_no?: string | null;
    cinsiyet?: string | null;
}

interface PatientState {
    activePatient: PatientSummary | null;
    setActivePatient: (patient: PatientSummary | null) => void;
}

export const usePatientStore = create<PatientState>()(
    persist(
        (set) => ({
            activePatient: null,
            setActivePatient: (patient) => set({ activePatient: patient }),
        }),
        {
            name: 'patient-storage',
            // SEC: hasta PHI'si (TC kimlik, ad-soyad, doğum tarihi) burada
            // tutuluyor. localStorage yerine sessionStorage kullanılıyor —
            // sekme/tarayıcı kapanınca otomatik temizlenir, paylaşımlı
            // bilgisayarlarda kalıcı PHI birikmesini engeller.
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);
