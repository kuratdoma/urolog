import { useEffect } from "react";
import { useAIScribeStore } from "@/stores/ai-scribe-store";
import { toast } from "sonner";

interface UseExaminationAIScribeProps {
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export function useExaminationAIScribe({ setFormData }: UseExaminationAIScribeProps) {
    const { latestResult, setLatestResult } = useAIScribeStore();

    useEffect(() => {
        if (!latestResult) return;

        setFormData((prev: any) => {
            const newData = { ...prev };

            // 1. Şikayet ve Öykü - Mevcut veriye append et
            if (latestResult.sikayet) {
                newData.sikayet = prev.sikayet ? `${prev.sikayet}\n\n[AI]: ${latestResult.sikayet}` : latestResult.sikayet;
            }
            if (latestResult.oyku) {
                newData.oyku = prev.oyku ? `${prev.oyku}\n\n[AI]: ${latestResult.oyku}` : latestResult.oyku;
            }

            // 2. Sistemlerin Sorgusu - Semptom alanlarını doldur
            const updateIfEmpty = (field: string, value: string | undefined) => {
                if (value && (prev[field] === "Seçiniz..." || prev[field] === "" || prev[field] === "0")) {
                    newData[field] = value;
                }
            };

            const normalizeSymptom = (val: string | undefined): string | undefined => {
                if (!val) return undefined;
                const upper = val.toUpperCase().trim();
                if (upper === "VAR" || upper === "MEVCUT" || upper === "EVET") return "Var";
                if (upper === "YOK" || upper === "HAYIR") return "Yok";
                if (upper === "BAZEN" || upper === "ARA SIRA") return "Bazen";
                if (["SARI", "YEŞİL", "HEMORAJİ", "ŞEFFAF"].includes(upper)) return val;
                if (["URGE", "STRES", "MİKST", "ENÜREZİS NOKTURNA"].includes(upper)) return val;
                return val;
            };

            updateIfEmpty('disuri', normalizeSymptom(latestResult.disuri));
            updateIfEmpty('pollakiuri_text', normalizeSymptom(latestResult.pollakiuri));
            updateIfEmpty('nokturi_text', normalizeSymptom(latestResult.nokturi));
            updateIfEmpty('hematuri', normalizeSymptom(latestResult.hematuri));
            updateIfEmpty('genital_akinti', normalizeSymptom(latestResult.genital_akinti));
            updateIfEmpty('kabizlik', normalizeSymptom(latestResult.kabizlik));
            updateIfEmpty('tas_oyku', normalizeSymptom(latestResult.tas_oyku));
            updateIfEmpty('catallanma', normalizeSymptom(latestResult.catallanma));
            updateIfEmpty('projeksiyon_azalma_sq', normalizeSymptom(latestResult.projeksiyon_azalma));
            updateIfEmpty('kalibre_incelme', normalizeSymptom(latestResult.kalibre_incelme));
            updateIfEmpty('idrar_bas_zorluk_text', normalizeSymptom(latestResult.idrar_bas_zorluk));
            updateIfEmpty('kesik_idrar_yapma_text', normalizeSymptom(latestResult.kesik_idrar_yapma));
            updateIfEmpty('terminal_damlama', normalizeSymptom(latestResult.terminal_damlama));
            updateIfEmpty('residu_hissi_text', normalizeSymptom(latestResult.residiv_hissi));
            updateIfEmpty('inkontinans', normalizeSymptom(latestResult.inkontinans));
            updateIfEmpty('erektil_islev', normalizeSymptom(latestResult.erektil_islev));
            updateIfEmpty('ejakulasyon', latestResult.ejakulasyon);

            // 3. Özgeçmiş
            if (latestResult.ozgecmis) {
                newData.ozgecmis = prev.ozgecmis
                    ? `${prev.ozgecmis}\n${latestResult.ozgecmis}`.trim()
                    : latestResult.ozgecmis;
            }

            // 4. Soygeçmiş
            if (latestResult.soygecmis) {
                newData.soygecmis = prev.soygecmis
                    ? `${prev.soygecmis}\n${latestResult.soygecmis}`.trim()
                    : latestResult.soygecmis;
            }

            // 5. İlaçlar
            if (latestResult.kullandigi_ilaclar) {
                newData.kullandigi_ilaclar = prev.kullandigi_ilaclar
                    ? `${prev.kullandigi_ilaclar}\n${latestResult.kullandigi_ilaclar}`.trim()
                    : latestResult.kullandigi_ilaclar;
            }

            // 6. Alerjiler
            if (latestResult.allerjiler && latestResult.allerjiler.toUpperCase() !== "YOK") {
                newData.allerjiler = prev.allerjiler
                    ? `${prev.allerjiler}\n${latestResult.allerjiler}`.trim()
                    : latestResult.allerjiler;
            }

            // 7. Sigara ve Alkol
            if (latestResult.sigara && !prev.sigara) {
                newData.sigara = latestResult.sigara;
            }
            if (latestResult.alkol && !prev.alkol) {
                newData.alkol = latestResult.alkol;
            }
            if (!latestResult.sigara && !latestResult.alkol && latestResult.aliskanliklar) {
                const alisTxt = latestResult.aliskanliklar;
                const sigaraMatch = alisTxt.match(/[Ss]igara[:\s]*(.*?)(?:;|$)/);
                const alkolMatch = alisTxt.match(/[Aa]lkol[:\s]*(.*?)(?:;|$)/);
                if (sigaraMatch && !prev.sigara) newData.sigara = sigaraMatch[1].trim();
                if (alkolMatch && !prev.alkol) newData.alkol = alkolMatch[1].trim();
            }

            // 8. Tanılar ve ICD kodları
            updateIfEmpty('tani1', latestResult.tani1);
            if (latestResult.tani1_icd && !prev.tani1_kodu) {
                newData.tani1_kodu = latestResult.tani1_icd;
            }
            updateIfEmpty('tani2', latestResult.tani2);
            if (latestResult.tani2_icd && !prev.tani2_kodu) {
                newData.tani2_kodu = latestResult.tani2_icd;
            }
            updateIfEmpty('tani3', latestResult.tani3);
            if (latestResult.tani3_icd && !prev.tani3_kodu) {
                newData.tani3_kodu = latestResult.tani3_icd;
            }

            // 9. Tedavi
            updateIfEmpty('tedavi', latestResult.tedavi);

            // 10. Öneriler
            if (latestResult.oneriler) {
                newData.oneriler = prev.oneriler
                    ? `${prev.oneriler}\n${latestResult.oneriler}`.trim()
                    : latestResult.oneriler;
            }

            // 11. Kan sulandırıcı
            if (latestResult.kan_sulandirici === 1 && prev.kan_sulandirici !== 1) {
                newData.kan_sulandirici = 1;
            }

            return newData;
        });

        toast.success("C3PO verileri dolduruldu.");
        setLatestResult(null);
    }, [latestResult, setFormData, setLatestResult]);
}
