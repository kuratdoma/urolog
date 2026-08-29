import { z } from "zod";

export const diagnosisItemSchema = z.object({
    name: z.string(),
    code: z.string().optional(),
});

export const diagnosisSchema = z.object({
    diagnoses: z.array(diagnosisItemSchema).max(5),

    // Treatment & Results
    sonuc: z.string().optional(),
    tedavi: z.string().optional(),
    recete: z.string().optional(),
    oneriler: z.string().optional(),
    kontrol_notu: z.string().optional(), // aka 'takip_notu' in legacy? Need to check
});

export type DiagnosisItem = z.infer<typeof diagnosisItemSchema>;
export type DiagnosisData = z.infer<typeof diagnosisSchema>;
