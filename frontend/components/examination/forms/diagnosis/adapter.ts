import { DiagnosisData, DiagnosisItem } from "./schema";
import { ExaminationFormData } from "@/hooks/useExaminationPageLogic";


export const diagnosisAdapter = {
    toNew: (formData: ExaminationFormData): DiagnosisData => {
        const diagnoses: DiagnosisItem[] = [];

        // Check how many diagnoses we should show (use _diagnosisCount if set)
        const diagnosisCount = (formData as any)._diagnosisCount as number | undefined;

        for (let i = 1; i <= 5; i++) {
            const name = formData[`tani${i}`] as string;
            const code = formData[`tani${i}_kodu`] as string;

            // The async code->name resolution is now handled by the UI Combobox directly.
            // structural map only.

            // Include this slot if it has content OR if we're within the explicit count
            const hasContent = !!(name || code);
            const withinExplicitCount = diagnosisCount !== undefined && i <= diagnosisCount;

            if (hasContent || withinExplicitCount) {
                diagnoses.push({ name: name || "", code: code || "" });
            }
        }

        // Always have at least one diagnosis slot
        if (diagnoses.length === 0) {
            diagnoses.push({ name: "", code: "" });
        }

        return {
            diagnoses,
            sonuc: formData.sonuc || "",
            tedavi: formData.tedavi || "",
            recete: formData.recete || "",
            oneriler: formData.oneriler || "",
            kontrol_notu: formData.takip_notu || "",
        };
    },
    toLegacy: (data: DiagnosisData): Partial<ExaminationFormData> => {
        const legacy: any = {
            tani1: "", tani1_kodu: "",
            tani2: "", tani2_kodu: "",
            tani3: "", tani3_kodu: "",
            tani4: "", tani4_kodu: "",
            tani5: "", tani5_kodu: "",
            // Track the number of diagnosis slots the user wants to see
            _diagnosisCount: data.diagnoses.length,
            sonuc: data.sonuc,
            tedavi: data.tedavi,
            recete: data.recete,
            oneriler: data.oneriler,
            takip_notu: data.kontrol_notu,
        };

        data.diagnoses.forEach((diag, index) => {
            if (index < 5) {
                legacy[`tani${index + 1}`] = diag.name;
                legacy[`tani${index + 1}_kodu`] = diag.code;
            }
        });

        return legacy;
    }
};
