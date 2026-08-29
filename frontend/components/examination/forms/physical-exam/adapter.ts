import { PhysicalExamData, physicalExamSchema } from "./schema";

export const physicalExamAdapter = {
    toNew: (formData: any): PhysicalExamData => {
        return {
            tansiyon: formData.tansiyon || "",
            ates: formData.ates || "",
            kvah: formData.kvah || "",
            bobrek_sag: formData.bobrek_sag || "",
            bobrek_sol: formData.bobrek_sol || "",
            suprapubik_kitle: formData.suprapubik_kitle || "",
            ego: formData.ego || "",
            bulgu_notu: formData.bulgu_notu || "",
            fizik_muayene: formData.fizik_muayene || "",
            rektal_tuse: formData.rektal_tuse || "",
            prosedur: formData.prosedur || "",
        };
    },

    toLegacy: (data: PhysicalExamData): any => {
        // Return only the fields that this module controls
        return {
            tansiyon: data.tansiyon,
            ates: data.ates,
            kvah: data.kvah,
            bobrek_sag: data.bobrek_sag,
            bobrek_sol: data.bobrek_sol,
            suprapubik_kitle: data.suprapubik_kitle,
            ego: data.ego,
            bulgu_notu: data.bulgu_notu,
            fizik_muayene: data.fizik_muayene,
            rektal_tuse: data.rektal_tuse,
            prosedur: data.prosedur,
        };
    }
};
