import { useState, useMemo, useCallback } from "react";

export interface PEDTAnswers {
    q1: string;
    q2: string;
    q3: string;
    q4: string;
    q5: string;
}

export interface PEDTSeverity {
    label: string;
    color: "purple" | "emerald" | "lime" | "orange" | "red";
}

const PEDT_LABELS: Record<string, Record<string, string>> = {
    q1: { "0": "çok kolay", "1": "biraz zor", "2": "orta derecede zor", "3": "çok zor", "4": "aşırı derecede zor" },
    q2: { "0": "hiçbir zaman", "1": "nadiren (%25)", "2": "bazen (%50)", "3": "sıklıkla (%75)", "4": "her zaman (%100)" },
    q3: { "0": "hiçbir zaman", "1": "nadiren", "2": "bazen", "3": "sıklıkla", "4": "her zaman" },
    q4: { "0": "hiç sıkıntı vermiyor", "1": "biraz", "2": "orta derecede", "3": "çok", "4": "aşırı derecede" },
    q5: { "0": "hiç endişelenmiyor", "1": "biraz", "2": "orta derecede", "3": "çok", "4": "aşırı derecede" },
};

const INITIAL_ANSWERS: PEDTAnswers = { q1: "", q2: "", q3: "", q4: "", q5: "" };

export function usePEDTForm(onExportToStory: (narrative: string) => void) {
    const [isOpen, setIsOpen] = useState(false);
    const [answers, setAnswers] = useState<PEDTAnswers>(INITIAL_ANSWERS);

    const total = useMemo(
        () => Object.values(answers).reduce((acc, curr) => acc + (parseInt(curr) || 0), 0),
        [answers]
    );

    const filled = useMemo(
        () => Object.values(answers).some((v) => v !== ""),
        [answers]
    );

    const severity = useMemo((): PEDTSeverity => {
        if (!filled) return { label: "Değerlendirilmedi", color: "purple" };
        if (total >= 11) return { label: "PE Tanısı Konulabilir", color: "red" };
        if (total >= 9) return { label: "Muhtemel PE", color: "orange" };
        if (total >= 5) return { label: "PE Olası Değil", color: "lime" };
        return { label: "PE Yok", color: "emerald" };
    }, [total, filled]);

    const handleExport = useCallback(() => {
        if (!filled) return false;

        const sentences: string[] = [];
        if (answers.q1) sentences.push(`Boşalmayı geciktirmek: ${PEDT_LABELS.q1[answers.q1]}.`);
        if (answers.q2) sentences.push(`Partner istediğinden önce boşalma sıklığı: ${PEDT_LABELS.q2[answers.q2]}.`);
        if (answers.q3) sentences.push(`Minimal uyarıyla boşalma: ${PEDT_LABELS.q3[answers.q3]}.`);
        if (answers.q4) sentences.push(`Erken boşalmadan duyulan sıkıntı: ${PEDT_LABELS.q4[answers.q4]}.`);
        if (answers.q5) sentences.push(`Partner memnuniyetsizliği endişesi: ${PEDT_LABELS.q5[answers.q5]}.`);
        sentences.push(`PEDT Skoru: ${total}/20 - ${severity.label}.`);

        const narrative = "PEDT ANKETİ: " + sentences.join(" ");
        onExportToStory(narrative);
        setIsOpen(false);
        return true;
    }, [answers, filled, total, severity.label, onExportToStory]);

    const reset = useCallback(() => {
        setAnswers(INITIAL_ANSWERS);
    }, []);

    return {
        isOpen,
        setIsOpen,
        answers,
        setAnswers,
        total,
        filled,
        severity,
        handleExport,
        reset,
    };
}

export type UsePEDTFormReturn = ReturnType<typeof usePEDTForm>;
