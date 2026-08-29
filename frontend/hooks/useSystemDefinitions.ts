import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api, ReceteSablonu, Doktor, Definition, RandevuTuru } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export const useSystemDefinitions = (initialDoctor: string = "", onDoctorFound?: (docName: string) => void) => {
    const [doctors, setDoctors] = useState<string[]>([]);
    const [doctorDetails, setDoctorDetails] = useState<Doktor[]>([]);
    const [prescriptionTemplates, setPrescriptionTemplates] = useState<any[]>([]);
    const [drugList, setDrugList] = useState<any[]>([]);
    const [institutions, setInstitutions] = useState<string[]>([]);
    const [occupations, setOccupations] = useState<string[]>([]);
    const [insurances, setInsurances] = useState<string[]>([]);
    const [followUpSubjects, setFollowUpSubjects] = useState<string[]>([]);
    const [appointmentTypes, setAppointmentTypes] = useState<RandevuTuru[]>([]);

    useEffect(() => {
        const fetchDefinitions = async () => {
            try {
                // parallel fetch from sharded APIs with Promise.allSettled for hot-reload resilience
                const [
                    docsRes,
                    templatesRes,
                    drugsRes,
                    instsRes,
                    occsRes,
                    insursRes,
                    followupsRes,
                    apptTypesRes
                ] = await Promise.allSettled([
                    api.definitions.doktorlar.list(),
                    api.definitions.receteSablonlari.list(),
                    api.system.getIlaclar(),
                    api.definitions.kurumlar.list(),
                    api.definitions.meslekler.list(),
                    api.definitions.sigortalar.list(),
                    api.definitions.takipKonulari.list(),
                    api.definitions.randevuTurleri.list()
                ]);

                const docs = docsRes.status === 'fulfilled' ? docsRes.value : [];
                const templates = templatesRes.status === 'fulfilled' ? templatesRes.value : [];
                const drugs = drugsRes.status === 'fulfilled' ? drugsRes.value : [];
                const insts = instsRes.status === 'fulfilled' ? instsRes.value : [];
                const occs = occsRes.status === 'fulfilled' ? occsRes.value : [];
                const insurs = insursRes.status === 'fulfilled' ? insursRes.value : [];
                const followups = followupsRes.status === 'fulfilled' ? followupsRes.value : [];
                const apptTypes = apptTypesRes.status === 'fulfilled' ? apptTypesRes.value : [];

                // Doctors mapping
                if (Array.isArray(docs)) {
                    setDoctorDetails(docs);
                    const docNames = docs.map(d => d.ad_soyad);
                    setDoctors(docNames);

                    // Default to first doctor (satisfies single doctor auto-assign and first doctor default for multiple)
                    if (initialDoctor === "" && docs.length > 0 && onDoctorFound) {
                        const docToSet = docs[0].ad_soyad;
                        if (docToSet) {
                            onDoctorFound(docToSet);
                        }
                    }
                }

                // Prescription Templates mapping
                if (Array.isArray(templates)) {
                    const parsedTemplates = templates.map(t => {
                        try {
                            const drugsData = t.icerik ? JSON.parse(t.icerik) : [];
                            return {
                                id: t.id,
                                templateName: t.ad,
                                drugs: drugsData
                            };
                        } catch {
                            return { id: t.id, templateName: t.ad, drugs: [] };
                        }
                    });
                    setPrescriptionTemplates(parsedTemplates);
                }

                // Drug List mapping
                if (Array.isArray(drugs)) {
                    setDrugList(drugs);
                }

                // Simple definition arrays (Kurum, Meslek, Sigorta, Takip)
                if (Array.isArray(insts)) setInstitutions(insts.map(i => i.ad));
                if (Array.isArray(occs)) setOccupations(occs.map(o => o.ad));
                if (Array.isArray(insurs)) setInsurances(insurs.map(i => i.ad));
                if (Array.isArray(followups)) setFollowUpSubjects(followups.map(f => f.ad));
                if (Array.isArray(apptTypes)) setAppointmentTypes(apptTypes);

            } catch (e) {
                console.error("Failed to fetch definitions", e);
                // Fallback: drugs_seed.json for drugs if API fails
                try {
                    const response = await fetch('/drugs_seed.json');
                    if (response.ok) {
                        const seedData = await response.json();
                        setDrugList(seedData);
                    }
                } catch (fbError) {
                    console.error("Fallback failed", fbError);
                }
            }
        };

        // Guard to prevent duplicate fetches
        let fetched = false;

        // Wait for auth store hydration before fetching
        const unsubscribe = useAuthStore.subscribe((state) => {
            if (state._hasHydrated && state.token && !fetched) {
                fetched = true;
                fetchDefinitions();
                unsubscribe();
            }
        });

        // Check if already hydrated
        const currentState = useAuthStore.getState();
        if (currentState._hasHydrated && currentState.token && !fetched) {
            fetched = true;
            fetchDefinitions();
        }

        return () => unsubscribe();
    }, []);

    const savePrescriptionTemplate = async (name: string, drugs: any[]) => {
        try {
            const icerik = JSON.stringify(drugs);
            const newTemplate = await api.definitions.receteSablonlari.create({
                ad: name,
                icerik: icerik,
                aktif: true
            });

            // Update local state
            setPrescriptionTemplates(prev => [...prev, {
                id: newTemplate.id,
                templateName: newTemplate.ad,
                drugs: drugs
            }]);

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
