import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, Doktor, RandevuTuru } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

// PERF: Tanım listeleri (doktor, ilaç, kurum, meslek, sigorta, takip konusu,
// randevu türü) nadiren değişir. Önceki implementasyon 7 ayrı useQuery ile
// 7 paralel HTTP isteği yapıyordu (her form mount'unda). Artık tek
// /definitions/bootstrap isteği tüm listeleri döndürüyor:
//   - RTT × 7 → × 1 (ilk açılış veya cache miss'te)
//   - staleTime 60dk ile aynı oturumda tekrar istek atılmıyor
//   - React Query dedup: aynı anda birden çok form açılsa tek istek
const DEFINITIONS_STALE_TIME = 60 * 60 * 1000; // 60 dk

export const useSystemDefinitions = (initialDoctor: string = "", onDoctorFound?: (docName: string) => void) => {
    const queryClient = useQueryClient();
    const token = useAuthStore((s) => s.token);
    const hasHydrated = useAuthStore((s) => s._hasHydrated);
    const enabled = hasHydrated && !!token;

    // Tek istek — 7 tanım listesini toplu çeker.
    const bootstrapQuery = useQuery({
        queryKey: ["definitions", "bootstrap"],
        queryFn: () => api.definitions.bootstrap(),
        staleTime: DEFINITIONS_STALE_TIME,
        enabled,
    });

    // İlaçlar paginated/autocomplete olduğu için bootstrap dışında kalıyor.
    const drugsQuery = useQuery({
        queryKey: ["definitions", "drugs"],
        queryFn: async () => {
            try {
                return await api.system.getIlaclar();
            } catch (e) {
                // Fallback: backend/redis erişilemezse yerel tohum veriyle devam et.
                const response = await fetch('/drugs_seed.json');
                if (response.ok) return await response.json();
                throw e;
            }
        },
        staleTime: DEFINITIONS_STALE_TIME,
        enabled,
    });

    const bootstrap = bootstrapQuery.data;

    const doctorDetails: Doktor[] = Array.isArray(bootstrap?.doktorlar) ? bootstrap.doktorlar : [];
    const doctors = doctorDetails.map(d => d.ad_soyad);

    useEffect(() => {
        if (initialDoctor === "" && doctorDetails.length > 0 && onDoctorFound) {
            const docToSet = doctorDetails[0].ad_soyad;
            if (docToSet) {
                onDoctorFound(docToSet);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [doctorDetails]);

    const prescriptionTemplates = useMemo(() => {
        const templates = bootstrap?.recete_sablonlari;
        if (!Array.isArray(templates)) return [];
        return templates.map(t => {
            try {
                const drugsData = t.icerik ? JSON.parse(t.icerik) : [];
                return { id: t.id, templateName: t.ad, drugs: drugsData };
            } catch {
                return { id: t.id, templateName: t.ad, drugs: [] };
            }
        });
    }, [bootstrap?.recete_sablonlari]);

    const drugList = Array.isArray(drugsQuery.data) ? drugsQuery.data : [];
    const institutions = Array.isArray(bootstrap?.kurumlar) ? bootstrap.kurumlar.map(i => i.ad) : [];
    const occupations = Array.isArray(bootstrap?.meslekler) ? bootstrap.meslekler.map(o => o.ad) : [];
    const insurances = Array.isArray(bootstrap?.sigortalar) ? bootstrap.sigortalar.map(i => i.ad) : [];
    const followUpSubjects = Array.isArray(bootstrap?.takip_konulari) ? bootstrap.takip_konulari.map(f => f.ad) : [];
    const appointmentTypes: RandevuTuru[] = Array.isArray(bootstrap?.randevu_turleri) ? bootstrap.randevu_turleri : [];

    const savePrescriptionTemplate = async (name: string, drugs: any[]) => {
        try {
            const icerik = JSON.stringify(drugs);
            const newTemplate = await api.definitions.receteSablonlari.create({
                ad: name,
                icerik: icerik,
                aktif: true
            });

            // Bootstrap cache'i de yenilenmeli — backend write endpoint'i
            // BOOTSTRAP namespace'ini de invalidate ediyor, bu istemci tarafında
            // query'yi yeniden fetch ettirir.
            queryClient.invalidateQueries({ queryKey: ["definitions", "bootstrap"] });

            toast.success("Şablon başarıyla kaydedildi.");
            return newTemplate;
        } catch (e) {
            console.error(e);
            toast.error("Şablon kaydedilirken hata oluştu.");
            throw e;
        }
    };

    return {
        doctors,
        doctorDetails,
        prescriptionTemplates,
        drugList,
        institutions,
        occupations,
        insurances,
        followUpSubjects,
        appointmentTypes,
        savePrescriptionTemplate
    };
};
