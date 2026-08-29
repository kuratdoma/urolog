import { IIEFData } from "./schema";

export const iiefAdapter = {
    toNew: (formData: { iief_ef_answers?: string }): IIEFData => {
        let answers = { q1: "0", q2: "0", q3: "0", q4: "0", q5: "0", q6: "0" };
        try {
            if (formData.iief_ef_answers) {
                const parsed = JSON.parse(formData.iief_ef_answers);
                answers = {
                    q1: (parsed.q1 || 0).toString(),
                    q2: (parsed.q2 || 0).toString(),
                    q3: (parsed.q3 || 0).toString(),
                    q4: (parsed.q4 || 0).toString(),
                    q5: (parsed.q5 || 0).toString(),
                    q6: (parsed.q6 || 0).toString(),
                };
            }
        } catch (e) { }
        return answers;
    },
    toLegacy: (data: IIEFData): { iief_ef_answers: string } => ({
        iief_ef_answers: JSON.stringify({
            q1: data.q1.toString(),
            q2: data.q2.toString(),
            q3: data.q3.toString(),
            q4: data.q4.toString(),
            q5: data.q5.toString(),
            q6: data.q6.toString(),
        })
    })
};
