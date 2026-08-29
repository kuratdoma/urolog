import React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SystemQueryButtonGroupProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: string[];
    disabled?: boolean;
}

/**
 * Compact inline button group for binary/ternary clinical fields.
 * Clicking the active button deselects it (clears to empty).
 */
export const SystemQueryButtonGroup = React.memo(({
    label,
    value,
    onChange,
    options,
    disabled = false,
}: SystemQueryButtonGroupProps) => {
    const handleClick = (opt: string) => {
        if (disabled) return;
        onChange(value === opt ? "" : opt);
    };

    return (
        <div className={cn(
            "flex items-center justify-between gap-2",
            disabled && "opacity-60 pointer-events-none"
        )}>
            <Label className="text-[10px] font-bold text-slate-500 uppercase flex-1 leading-tight whitespace-nowrap">
                {label}
            </Label>
            <div className="flex rounded-md overflow-hidden border border-slate-200 w-[180px] shrink-0">
                {options.map((opt) => {
                    const isActive = value === opt;
                    const isPositive = opt === "Var" || opt === "Pıhtılı";
                    const isNegative = opt === "Yok";

                    return (
                        <button
                            key={opt}
                            type="button"
                            disabled={disabled}
                            onClick={() => handleClick(opt)}
                            className={cn(
                                "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all duration-150 cursor-pointer text-center",
                                "border-r border-slate-200 last:border-r-0",
                                "focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400",
                                isActive && isNegative && "bg-emerald-500 text-white shadow-inner",
                                isActive && isPositive && "bg-red-500 text-white shadow-inner",
                                isActive && !isNegative && !isPositive && "bg-amber-500 text-white shadow-inner",
                                !isActive && "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                            )}
                        >
                            {opt}
                        </button>
                    );
                })}
            </div>
        </div>
    );
});
SystemQueryButtonGroup.displayName = "SystemQueryButtonGroup";
