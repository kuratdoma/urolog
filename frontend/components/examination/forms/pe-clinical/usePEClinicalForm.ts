import { useState, useMemo, useCallback } from "react";

export interface PEClinicalAnswers {
    ielt: string;
    baslangic: string;
    tutarlilik: string;
    siklik: string;
    ed_var: string;
    ed_korku: string;
    ilac: string;
    iliski: string;
    kaygi: string;
}

const IELT_LABELS: Record<string, string> = {
    "1": "1 dakikadan az",
    "2": "1-2 dakika arası",
    "3": "2-3 dakika arası",
    "4": "3 dakikadan fazla",
};

const INITIAL_ANSWERS: PEClinicalAnswers = {
    ielt: "",
    baslangic: "",
    tutarlilik: "",
    siklik: "",
    ed_var: "",
    ed_korku: "",
    ilac: "",
    iliski: "",
    kaygi: "",
};

export function usePEClinicalForm(onExportToStory: (narrative: string) => void) {
    const [isOpen, setIsOpen] = useState(false);
    const [answers, setAnswers] = useState<PEClinicalAnswers>(INITIAL_ANSWERS);

    const filled = useMemo(
        () => Object.values(answers).some((v) => v !== ""),
        [answers]
    );

    const handleExport = useCallback(() => {
        if (!filled) return false;

        const sentences: string[] = [];

        if (answers.ielt) {
            sentences.push(`Vajinal penetrasyondan sonra boşalma süresi (IELT): ${IELT_LABELS[answers.ielt] || answers.ielt}.`);
        }
        if (answers.baslangic) {
            const labels: Record<string, string> = {
                lifelong: "ilk cinsel deneyimden beri mevcut (yaşam boyu PE)",
                acquired: "sonradan gelişmiş (edinilmiş PE)",
            };
            sentences.push(`Sorun ${labels[answers.baslangic] || answers.baslangic}.`);
        }
        if (answers.tutarlilik) {
            sentences.push(
                `Erken boşalma ${answers.tutarlilik === "general" ? "her partnerle ve her durumda (genel)" : "belirli durumlarda (durumsal)"}.`
            );
        }
        if (answers.siklik) {
            sentences.push(`Problem ${answers.siklik === "always" ? "her ilişkide" : "aralıklı"}.`);
        }
        if (answers.ed_var) {
            sentences.push(`Eşlik eden ${answers.ed_var === "yes" ? "sertleşme sorunu mevcut" : "sertleşme sorunu yok"}.`);
        }
        if (answers.ed_korku) {
            sentences.push(
                `Hasta ${answers.ed_korku === "yes" ? "sertleşmeyi kaybetme korkusuyla acele ediyor" : "sertleşme kaybı korkusu belirtmiyor"}.`
            );
        }
        if (answers.ilac) {
            sentences.push(`${answers.ilac === "yes" ? "İlaç veya madde kullanımı mevcut" : "İlaç veya madde kullanımı yok"}.`);
        }
        if (answers.iliski) {
            sentences.push(`${answers.iliski === "good" ? "Partner ilişkisi iyi" : "İlişkisel sorunlar mevcut"}.`);
        }
        if (answers.kaygi) {
            sentences.push(
                `Hasta ${answers.kaygi === "yes" ? "performans kaygısı yaşıyor" : "performans kaygısı belirtmiyor"}.`
            );
        }

        const narrative = "PE KLİNİK DEĞERLENDİRME: " + sentences.join(" ");
        onExportToStory(narrative);
        setIsOpen(false);
        return true;
    }, [answers, filled, onExportToStory]);

    const reset = useCallback(() => {
        setAnswers(INITIAL_ANSWERS);
    }, []);

    return {
        isOpen,
        setIsOpen,
        answers,
        setAnswers,
        filled,
        handleExport,
        reset,
    };
}

export type UsePEClinicalFormReturn = ReturnType<typeof usePEClinicalForm>;
