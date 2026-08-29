import { z } from "zod";

export const medicalHistorySchema = z.object({
    ozgecmis: z.string(),
    soygecmis: z.string(),
    kullandigi_ilaclar: z.string(),
    allerjiler: z.string().optional(),
    kan_sulandirici: z.boolean(),
    sigara: z.string().optional(),
    alkol: z.string().optional(),
});

export type MedicalHistoryData = z.infer<typeof medicalHistorySchema>;
