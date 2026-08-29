import { IPSSData } from './schema';

export const calculateTotalScore = (data: IPSSData): number => {
    const fields = ['ipss1', 'ipss2', 'ipss3', 'ipss4', 'ipss5', 'ipss6', 'ipss7'] as const;
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
    if (score <= 7) return "Hafif";
    if (score <= 19) return "Orta";
    return "Şiddetli";
};

export const calculateScores = (data: IPSSData) => {
    const total = calculateTotalScore(data);
    const severity = getSeverityLabel(total);

    return {
        total: total.toString(),
        severity,
        qol: data.ipss_qol
    };
};
