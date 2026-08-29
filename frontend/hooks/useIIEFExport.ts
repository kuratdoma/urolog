import { useMemo, useCallback } from "react";

export interface IIEFAnswers {
    q1?: string;
    q2?: string;
    q3?: string;
    q4?: string;
    q5?: string;
    q6?: string;
    [key: string]: string | undefined;
}

export interface IIEFSeverity {
    label: string;
    color: "purple" | "emerald" | "lime" | "yellow" | "orange" | "red";
}

const IIEF_LABELS: Record<string, Record<string, string>> = {
    q1: {
        "0": "yoktu",
        "1": "hiç olmadı",
        "2": "birkaç kez oldu",
        "3": "bazen oldu",
        "4": "çoğunlukla oldu",
        "5": "her zaman oldu",
    },
    q2: {
        "0": "yoktu",
        "1": "hiç",
        "2": "birkaç kez",
        "3": "bazen",
        "4": "çoğunlukla",
        "5": "hemen hemen her zaman",
    },
    q3: {
        "0": "girişimde bulunmadı",
        "1": "mümkün olmadı",
        "2": "birkaç kez mümkün oldu",
        "3": "bazen mümkün oldu",
        "4": "çoğunlukla mümkün oldu",
        "5": "her zaman mümkün oldu",
    },
    q4: {
        "0": "girişimde bulunmadı",
        "1": "hiç devam ettiremedi",
        "2": "birkaç kez devam ettirebildi",
        "3": "bazen devam ettirebildi",
        "4": "çoğunlukla devam ettirebildi",
        "5": "her zaman devam ettirebildi",
    },
    q5: {
        "0": "girişimde bulunmadı",
        "1": "aşırı",
        "2": "çok",
        "3": "orta derecede",
        "4": "biraz",
        "5": "hiç",
    },
    q6: {
        "1": "çok az",
        "2": "az",
        "3": "orta",
        "4": "tama yakın",
        "5": "tam",
    },
};

export function useIIEFExport(
    iiefAnswers: IIEFAnswers,
    iiefTotal: number,
    onExportToStory: (narrative: string) => void,
    onClose: () => void
) {
    const filled = useMemo(
        () => Object.values(iiefAnswers).some((v) => v !== ""),
        [iiefAnswers]
    );

    const severity = useMemo((): IIEFSeverity => {
        if (!filled) return { label: "Değerlendirilmedi", color: "purple" };
        if (iiefTotal >= 26) return { label: "ED Yok", color: "emerald" };
        if (iiefTotal >= 22) return { label: "Hafif ED", color: "lime" };
        if (iiefTotal >= 17) return { label: "Hafif-Orta ED", color: "yellow" };
        if (iiefTotal >= 11) return { label: "Orta ED", color: "orange" };
        return { label: "Şiddetli ED", color: "red" };
    }, [iiefTotal, filled]);

    const handleExport = useCallback(() => {
        if (!filled) return false;

        const getLabel = (q: keyof typeof IIEF_LABELS, value: string) => IIEF_LABELS[q]?.[value] || value;

        const sentences: string[] = [];

        if (iiefAnswers.q1) {
            sentences.push(`Cinsel faaliyetler sırasında peniste sertleşme ${getLabel("q1", iiefAnswers.q1)}.`);
        }

        if (iiefAnswers.q2) {
            const val = getLabel("q2", iiefAnswers.q2);
            if (iiefAnswers.q2 === "0") {
                sentences.push("Cinsel uyarılmayla, cinsel ilişkiyi sağlayacak düzeyde sertleşme olmadı.");
            } else {
                sentences.push(`Cinsel uyarılmayla oluşan sertleşme cinsel ilişkiyi ${val} sağlayacak düzeyde idi.`);
            }
        }

        if (iiefAnswers.q3) {
            sentences.push(`Penetrasyon ${getLabel("q3", iiefAnswers.q3)}.`);
        }

        if (iiefAnswers.q4) {
            sentences.push(`Sertliği ${getLabel("q4", iiefAnswers.q4)}.`);
        }

        if (iiefAnswers.q5) {
            const val = getLabel("q5", iiefAnswers.q5);
            if (val === "hiç") {
                sentences.push("Sertleşmeyi sürdürmede hiç zorlanmadı.");
            } else if (val === "girişimde bulunmadı") {
                sentences.push("Sertleşmeyi sürdürmek için girişimde bulunmadı.");
            } else {
                sentences.push(`Sertleşmeyi sürdürmede ${val} zorlandı.`);
            }
        }

        if (iiefAnswers.q6) {
            sentences.push(`Öz güveni ${getLabel("q6", iiefAnswers.q6)} idi.`);
        }

        sentences.push(`IIEF-EF Skoru: ${iiefTotal}/30 - ${severity.label}.`);

        const narrative = "Son 4 hafta içerisinde, " + sentences.join(" ");
        onExportToStory(narrative);
        onClose();
        return true;
    }, [iiefAnswers, filled, iiefTotal, severity.label, onExportToStory, onClose]);

    return {
        filled,
        severity,
        handleExport,
    };
}

export type UseIIEFExportReturn = ReturnType<typeof useIIEFExport>;
