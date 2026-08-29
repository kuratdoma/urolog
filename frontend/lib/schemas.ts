import { z } from "zod";

// Core Patient Validation Schema
export const PatientSchema = z.object({
    id: z.string(),
    ad: z.string(),
    soyad: z.string(),
    tc_kimlik: z.string().optional().nullable(),
}).passthrough();

export type PatientValidated = z.infer<typeof PatientSchema>;

// Core Muayene Validation Schema
export const MuayeneSchema = z.object({
    id: z.string(),
    hasta_id: z.string(),
    tarih_saat: z.string().optional().nullable(),
    doktor_id: z.union([z.number(), z.string()]).optional().nullable(),
}).passthrough();

export type MuayeneValidated = z.infer<typeof MuayeneSchema>;

// API Response Validation Helper
export function validateResponse<T extends z.ZodTypeAny>(data: unknown, schema: T, endpointName: string): z.infer<T> {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error(`[Zod Validation Error] for endpoint ${endpointName}:`, (error as any).errors);
        }
        return data as z.infer<T>; 
    }
}
