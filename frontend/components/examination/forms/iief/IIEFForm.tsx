import React, { useMemo } from 'react';
import { IIEFData } from './schema';
import { IIEF_LABELS, IIEF_OPTIONS } from './constants';
import { cn } from '@/lib/utils';
import { Ops } from '../../shared/types';
import { Label } from '@/components/ui/label';

// Re-implemented IIEFQuestionRow to ensure module independence
const IIEFQuestionRow = React.memo(({
    label,
    description,
    value,
    onChange,
    disabled,
    options,
    compact
}: {
    label: string,
    description: string,
    value: string,
    onChange: (v: string) => void,
    disabled?: boolean,
    options: readonly { value: string, label: string }[],
    compact?: boolean
}) => (
    <div className={cn(
        compact ? "py-1.5 border-b border-slate-50 last:border-0 px-1 hover:bg-slate-50/40" : "py-3 border-b border-slate-100 last:border-0 px-2 hover:bg-slate-50/50",
        "transition-colors rounded-lg -mx-1",
        disabled && "opacity-60 pointer-events-none"
    )}>
        <div className={cn("flex flex-col mb-2.5", compact ? "gap-0.5" : "gap-1.5")}>
            <Label className={cn("font-bold text-slate-800 uppercase tracking-tight", compact ? "text-[11px]" : "text-sm")}>{label}</Label>
            <span className={cn("text-slate-500 font-medium leading-tight", compact ? "text-[10px]" : "text-[13px]")}>{description}</span>
        </div>
        <div className={cn(
            "grid gap-1.5",
            "grid-cols-3 md:grid-cols-6"
        )}>
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(opt.value)}
                    className={cn(
                        "flex flex-col items-center justify-center rounded-lg font-bold transition-all border shadow-sm",
                        compact ? "p-1.5 text-[10px] min-h-[44px]" : "p-3 text-sm min-h-[58px]", // Ensured 44px min-height for touch
                        value === opt.value
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-100"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm"
                    )}
                >
                    <span className={cn("font-black mb-0.5", compact ? "text-xs" : "text-lg")}>{opt.value}</span>
                    <span className={cn("font-bold text-center leading-tight truncate w-full", compact ? "text-[10px]" : "text-xs")}>{opt.label}</span>
                </button>
            ))}
        </div>
    </div>
));
IIEFQuestionRow.displayName = "IIEFQuestionRow";

export interface IIEFFormProps extends Ops<IIEFData> {
    compact?: boolean;
}

export const IIEFForm = React.memo(({
    value,
    onChange,
    readOnly,
    isLoading,
    compact = false
}: IIEFFormProps) => {

    const handleChange = (field: keyof IIEFData) => (val: string) => {
        onChange({
            ...value,
            [field]: val
        });
    };

    const questions = useMemo(() => [
        { id: 'q1', ...IIEF_LABELS.questions.q1, options: IIEF_OPTIONS.q1 },
        { id: 'q2', ...IIEF_LABELS.questions.q2, options: IIEF_OPTIONS.q2 },
        { id: 'q3', ...IIEF_LABELS.questions.q3, options: IIEF_OPTIONS.q3 },
        { id: 'q4', ...IIEF_LABELS.questions.q4, options: IIEF_OPTIONS.q4 },
        { id: 'q5', ...IIEF_LABELS.questions.q5, options: IIEF_OPTIONS.q5 },
        { id: 'q6', ...IIEF_LABELS.questions.q6, options: IIEF_OPTIONS.q6 },
    ] as const, []);

    return (
        <div className={cn("space-y-4", isLoading && "opacity-50 pointer-events-none animate-pulse")}>
            <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm", compact ? "p-3" : "p-4")}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        {IIEF_LABELS.title}
                    </h3>
                    {value.iief_total && (
                        <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md border border-indigo-100">
                            Toplam: {value.iief_total}
                        </span>
                    )}
                </div>

                <div className="space-y-1">
                    {questions.map((q) => (
                        <IIEFQuestionRow
                            key={q.id}
                            label={q.label}
                            description={q.description}
                            value={value[q.id as keyof IIEFData] || ''}
                            onChange={handleChange(q.id as keyof IIEFData)}
                            disabled={readOnly}
                            options={q.options}
                            compact={compact}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
});
IIEFForm.displayName = "IIEFForm";
