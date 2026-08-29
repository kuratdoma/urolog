import React, { useMemo } from 'react';
import { IPSSData } from './schema';
import { IPSS_LABELS, IPSS_ANSWER_SCALES } from './constants';
import { cn } from '@/lib/utils';
import { Ops } from '../../shared/types';
import { Label } from '@/components/ui/label';

/* 
 * Re-creating the sub-component locally to keep this file self-contained 
 * or we could put it in shared if used by others. 
 * For now, IPSSQuestion is specific to this layout.
 */
/*
 * Header row for the scale labels
 */
const ScaleHeader = React.memo(({ options }: { options: readonly { value: string, label: string }[] }) => (
    <div className="flex items-center gap-4 mb-8 px-2 -mx-2 h-20">
        <div className="flex-1 hidden md:block" />
        <div className="hidden md:flex items-end p-1 rounded-lg shrink-0 gap-0.5 h-full">
            {options.map((opt) => (
                <div key={opt.value} className="w-8 flex flex-col items-center justify-end relative">
                    <span className="absolute bottom-7 left-1/2 -rotate-45 w-[100px] text-[10px] font-bold text-slate-500 text-left origin-bottom-left whitespace-nowrap">
                        {opt.label}
                    </span>
                    <span className="text-xs font-black text-slate-800 z-10 bg-slate-100 rounded px-1.5 py-0.5 shadow-sm border border-slate-200/50">{opt.value}</span>
                </div>
            ))}
        </div>
    </div>
));
ScaleHeader.displayName = "ScaleHeader";

const IPSSQuestionRow = React.memo(({
    label,
    description,
    value,
    onChange,
    disabled,
    options
}: {
    label: string,
    description: string,
    value: string,
    onChange: (v: string) => void,
    disabled?: boolean,
    options: readonly { value: string, label: string }[]
}) => (
    <div className={cn(
        "flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors px-2 rounded-lg -mx-2 group",
        disabled && "opacity-60 pointer-events-none"
    )}>
        <div className="flex flex-col gap-1 flex-1 min-w-0 pr-4">
            <Label className="text-xs font-bold text-slate-700 uppercase">{label}</Label>
            <span className="text-[11px] text-slate-500 font-medium leading-tight">{description}</span>
        </div>
        <div className="flex items-center bg-slate-100 group-hover:bg-white p-1 rounded-lg shrink-0 gap-0.5 transition-colors shadow-inner">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(opt.value)}
                    className={cn(
                        "w-10 h-10 md:w-8 md:h-8 rounded-md text-xs font-bold transition-all relative group/btn",
                        value === opt.value
                            ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5 scale-105 z-10"
                            : "text-slate-400 hover:bg-white/50 hover:text-slate-600"
                    )}
                    aria-label={`${label} - ${opt.label} (${opt.value})`}
                    aria-pressed={value === opt.value}
                    title={opt.label}
                >
                    {opt.value}
                    {/* Mobile Only Tooltip/Label */}
                    <span className="md:hidden absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover/btn:opacity-100 whitespace-nowrap pointer-events-none z-20">
                        {opt.label}
                    </span>
                </button>
            ))}
        </div>
    </div>
));
IPSSQuestionRow.displayName = "IPSSQuestionRow";

export const IPSSForm = React.memo(({
    value,
    onChange,
    readOnly,
    isLoading
}: Ops<IPSSData>) => {

    const handleChange = (field: keyof IPSSData) => (val: string) => {
        onChange({
            ...value,
            [field]: val
        });
    };

    const standardQuestions = useMemo(() => [
        { id: 'ipss1', ...IPSS_LABELS.questions.ipss1 },
        { id: 'ipss2', ...IPSS_LABELS.questions.ipss2 },
        { id: 'ipss3', ...IPSS_LABELS.questions.ipss3 },
        { id: 'ipss4', ...IPSS_LABELS.questions.ipss4 },
        { id: 'ipss5', ...IPSS_LABELS.questions.ipss5 },
        { id: 'ipss6', ...IPSS_LABELS.questions.ipss6 },
    ] as const, []);

    const nocturiaQuestion = useMemo(() => ({ id: 'ipss7', ...IPSS_LABELS.questions.ipss7 }), []);

    return (
        <div className={cn("space-y-4", isLoading && "opacity-50 pointer-events-none animate-pulse")}>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        {IPSS_LABELS.title}
                    </h3>
                    {value.ipss_total && (
                        <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">
                            Toplam: {value.ipss_total}
                        </span>
                    )}
                </div>

                <div className="space-y-1">
                    <div className="space-y-1">
                        {/* Standard Questions 1-6 */}
                        <ScaleHeader options={IPSS_ANSWER_SCALES.frequency} />
                        {standardQuestions.map((q) => (
                            <IPSSQuestionRow
                                key={q.id}
                                label={q.label}
                                description={q.description}
                                value={value[q.id as keyof IPSSData] || ''}
                                onChange={handleChange(q.id as keyof IPSSData)}
                                disabled={readOnly}
                                options={IPSS_ANSWER_SCALES.frequency}
                            />
                        ))}

                        {/* Nocturia Question 7 */}
                        <div className="mt-6 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase">Gece İdrarı (Noktüri)</h4>
                                <div className="flex gap-1 md:hidden">
                                    {/* Spacer for alignment on mobile */}
                                </div>
                                <div className="hidden md:flex items-center bg-slate-50 p-1 rounded-lg shrink-0 gap-0.5 opacity-60">
                                    {/* Just to show header alignment for Q7 */}
                                    {IPSS_ANSWER_SCALES.nocturia.map((opt) => (
                                        <div key={opt.value} className="w-8 flex flex-col items-center justify-center text-center">
                                            <span className="text-[9px] font-bold text-slate-500 leading-tight uppercase h-4 flex items-center">{opt.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <IPSSQuestionRow
                                label={nocturiaQuestion.label}
                                description={nocturiaQuestion.description}
                                value={value.ipss7 || ''}
                                onChange={handleChange('ipss7')}
                                disabled={readOnly}
                                options={IPSS_ANSWER_SCALES.nocturia}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs font-bold text-slate-700 uppercase">{IPSS_LABELS.qualityOfLife.label}</Label>
                            <span className="text-[11px] text-slate-500 font-medium">{IPSS_LABELS.qualityOfLife.description}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                            {IPSS_ANSWER_SCALES.qol.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    disabled={readOnly}
                                    onClick={() => handleChange('ipss_qol')(opt.value)}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-2 rounded-lg border transition-all h-20 gap-1",
                                        value.ipss_qol === opt.value
                                            ? "bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-200"
                                            : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-200 hover:shadow-sm"
                                    )}
                                >
                                    <span className="text-lg font-black">{opt.value}</span>
                                    <span className="text-[10px] uppercase font-bold text-center leading-tight">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
IPSSForm.displayName = "IPSSForm";
