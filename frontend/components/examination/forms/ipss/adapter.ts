import { IPSSData } from "./schema";
import { ExaminationFormData } from "@/hooks/useExaminationPageLogic";

export const ipssAdapter = {
    toNew: (formData: Partial<ExaminationFormData>): IPSSData => ({
        ipss1: formData.residiv_hissi || '0',
        ipss2: formData.pollakiuri || '0',
        ipss3: formData.kesik_idrar_yapma || '0',
        ipss4: formData.urgency || '0',
        ipss5: formData.projeksiyon_azalma || '0',
        ipss6: formData.idrar_bas_zorluk || '0',
        ipss7: formData.nokturi || '0',
        ipss_qol: formData.ipss_qol || '0',
        // ipss_total is derived, but can be passed if we want. It's optional in schema.
    }),
    toLegacy: (data: IPSSData): Partial<ExaminationFormData> => ({
        residiv_hissi: data.ipss1,
        pollakiuri: data.ipss2,
        kesik_idrar_yapma: data.ipss3,
        urgency: data.ipss4,
        projeksiyon_azalma: data.ipss5,
        idrar_bas_zorluk: data.ipss6,
        nokturi: data.ipss7,
        ipss_qol: data.ipss_qol,
    })
};
