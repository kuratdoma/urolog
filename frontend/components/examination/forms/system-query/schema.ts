import { z } from "zod";

export const systemQuerySchema = z.object({
    disuri: z.string().optional(),
    pollakiuri_text: z.string().optional(),
    nokturi_text: z.string().optional(),
    ates_sq: z.string().optional(),
    genital_akinti: z.string().optional(),
    kabizlik: z.string().optional(),
    tas_oyku: z.string().optional(),
    hematuri: z.string().optional(),
    catallanma: z.string().optional(),
    projeksiyon_azalma_sq: z.string().optional(),
    kalibre_incelme: z.string().optional(),
    idrar_bas_zorluk_text: z.string().optional(),
    kesik_idrar_yapma_text: z.string().optional(),
    terminal_damlama: z.string().optional(),
    residu_hissi_text: z.string().optional(),
    urgency: z.string().optional(),
    inkontinans: z.string().optional(),
    erektil_islev: z.string().optional(),
    ejakulasyon: z.string().optional(),
});

export type SystemQueryData = z.infer<typeof systemQuerySchema>;
