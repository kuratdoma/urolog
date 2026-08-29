import { MedicalHistoryData } from "./schema";

export const medicalHistoryAdapter = {
    toNew: (formData: any): MedicalHistoryData => ({
        ozgecmis: formData.ozgecmis || "",
        soygecmis: formData.soygecmis || "",
        kullandigi_ilaclar: formData.kullandigi_ilaclar || "",
        allerjiler: formData.allerjiler || "",
        kan_sulandirici: formData.kan_sulandirici === 1 || formData.kan_sulandirici === true,
        sigara: formData.sigara || "",
        alkol: formData.alkol || "",
    }),
    toLegacy: (data: MedicalHistoryData): any => ({
        ozgecmis: data.ozgecmis,
        soygecmis: data.soygecmis,
        kullandigi_ilaclar: data.kullandigi_ilaclar,
        allerjiler: data.allerjiler,
        kan_sulandirici: data.kan_sulandirici ? 1 : 0,
        sigara: data.sigara,
        alkol: data.alkol,
    })
};
