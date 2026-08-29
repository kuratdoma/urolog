import React from 'react';
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PEQuestionProps {
    label: string;
    description: string;
    value: any;
    onChange: (val: any) => void;
    options?: { value: string, label: string }[];
    disabled?: boolean;
    compact?: boolean;
    activeColor?: "indigo" | "rose" | "cyan";
    hideValue?: boolean;
}

export const PEQuestion = React.memo(({
    label,
    description,
    value,
    onChange,
    options,
    disabled,
    compact,
    activeColor = "indigo",
    hideValue
}: PEQuestionProps) => {
    const colors = {
        indigo: { bg: "bg-indigo-50/50", border: "border-indigo-100", text: "text-indigo-900", badge: "bg-indigo-100 text-indigo-700 border-indigo-200", activeRing: "ring-indigo-600/20", activeText: "text-indigo-700" },
        rose: { bg: "bg-rose-50/50", border: "border-rose-100", text: "text-rose-900", badge: "bg-rose-100 text-rose-700 border-rose-200", activeRing: "ring-rose-600/20", activeText: "text-rose-700" },
        cyan: { bg: "bg-cyan-50/50", border: "border-cyan-100", text: "text-cyan-900", badge: "bg-cyan-100 text-cyan-700 border-cyan-200", activeRing: "ring-cyan-600/20", activeText: "text-cyan-700" }
    };
    const c = colors[activeColor as keyof typeof colors] || colors.indigo;

    return (
        <div className={cn(
            "space-y-3 p-4 rounded-xl border border-slate-100 transition-all",
            value ? `${c.bg} ${c.border}` : "bg-white hover:border-slate-300"
        )}>
            <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                    <Label className={cn("text-base font-bold", value ? c.text : "text-slate-700")}>
                        {label}
                    </Label>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        {description}
                    </p>
                </div>
                {!hideValue && value && (
                    <div className={cn("px-2.5 py-1 rounded-md text-xs font-bold border", c.badge)}>
                        {value}
                    </div>
                )}
            </div>

            {options && (
                <div className={cn("grid gap-2", compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 md:grid-cols-5")}>
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            disabled={disabled}
                            onClick={() => onChange(opt.value)}
                            className={cn(
                                "relative flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 text-center transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                                value === opt.value
                                    ? `bg-white ${c.activeText} shadow-sm ring-1 ${c.activeRing} border-current`
                                    : "bg-slate-50 border-transparent text-slate-600 hover:bg-white hover:border-slate-200"
                            )}
                        >
                            {!compact && (
                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                                    {opt.value}
                                </span>
                            )}
                            <span className={cn("text-sm font-bold", value === opt.value ? "text-slate-900" : "text-slate-500")}>
                                {opt.label}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});
PEQuestion.displayName = "PEQuestion";
