import { z } from "zod";

export const physicalExamSchema = z.object({
    // Vitals
    tansiyon: z.string().optional(),
    ates: z.string().optional(),

    // Exam Findings (Quick Selects)
    kvah: z.string().optional(),
    bobrek_sag: z.string().optional(),
    bobrek_sol: z.string().optional(),
    suprapubik_kitle: z.string().optional(),
    ego: z.string().optional(),

    // Notes
    bulgu_notu: z.string().optional(), // Summary note for above findings
    fizik_muayene: z.string().optional(), // Main systemic exam text
    rektal_tuse: z.string().optional(), // DRE findings
    prosedur: z.string().optional(), // Procedure findings
});

export type PhysicalExamData = z.infer<typeof physicalExamSchema>;
