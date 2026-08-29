import { IIEFData } from './schema';

export const calculateTotalScore = (data: IIEFData): number => {
    const fields = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] as const;
    let total = 0;

    for (const field of fields) {
        const val = parseInt(data[field] || '0', 10);
        if (!isNaN(val)) {
            total += val;
        }
    }
    return total;
};

export const getSeverityLabel = (score: number) => {
    if (score <= 10) return "Ağır ED";
    if (score <= 16) return "Orta-Ağır ED";
    if (score <= 21) return "Hafif-Orta ED";
    if (score <= 25) return "Hafif ED";
    return "Normal";
};

export const calculateScores = (data: IIEFData) => {
    const total = calculateTotalScore(data);
    const severity = getSeverityLabel(total);

    return {
        total: total.toString(),
        severity
    };
};
