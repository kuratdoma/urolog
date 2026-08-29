import React from "react";
import { LabHemogram } from "@/lib/api/types";
import { LabInput } from "../LabInput";

interface HemogramSectionProps {
    values: Partial<LabHemogram>;
    onChange: (values: Partial<LabHemogram>) => void;
}

export const HemogramSection = React.memo(({ values, onChange }: HemogramSectionProps) => {
    return (
        <div className="bg-white rounded-xl border-t-4 border-t-blue-500 shadow-sm p-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-6">Hemogram Parametreleri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <LabInput label="WBC" unit="10^3/uL" value={values.wbc} onFieldChange={(v: string) => onChange({ ...values, wbc: v })} />
                <LabInput label="HGB" unit="g/dL" value={values.hb} onFieldChange={(v: string) => onChange({ ...values, hb: v })} />
                <LabInput label="HCT" unit="%" value={values.hct} onFieldChange={(v: string) => onChange({ ...values, hct: v })} />
                <LabInput label="PLT" unit="10^3/uL" value={values.plt} onFieldChange={(v: string) => onChange({ ...values, plt: v })} />
                <LabInput label="NEU" unit="%" value={values.neu} onFieldChange={(v: string) => onChange({ ...values, neu: v })} />
                <LabInput label="LYM" unit="%" value={values.lym} onFieldChange={(v: string) => onChange({ ...values, lym: v })} />
            </div>
        </div>
    );
});

HemogramSection.displayName = 'HemogramSection';
