"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const SystemQueryCombobox = React.memo(({
    label,
    value,
    onChange,
    options,
    placeholder,
    className,
    inputClassName
}: {
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: string[],
    placeholder?: string,
    className?: string,
    inputClassName?: string
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Filter options based on input
    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes((value || "").toLowerCase())
    );

    return (
        <div className={cn("flex items-center justify-between gap-2 relative", className)}>
            {label && <Label className="text-[10px] font-bold text-slate-500 uppercase leading-tight shrink-0">{label}</Label>}
            <div className={cn("relative w-[140px]", className?.includes('flex-col') && "w-full")}>
                <Input
                    value={value === "Seçiniz..." ? "" : value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => {
                        setIsFocused(true);
                        setShowSuggestions(true);
                    }}
                    onBlur={() => {
                        setTimeout(() => {
                            setIsFocused(false);
                            setShowSuggestions(false);
                        }, 200);
                    }}
                    className={cn("h-10 text-sm bg-slate-50 border-slate-200 text-slate-700 px-3 w-full", inputClassName)}
                    placeholder={placeholder || ""}
                />

                {(isFocused || showSuggestions) && filteredOptions.length > 0 && (
                    <div className="absolute top-full left-0 w-full z-50 bg-white border border-slate-200 rounded-md shadow-lg mt-1 max-h-[150px] overflow-y-auto">
                        {filteredOptions.map(option => (
                            <div
                                key={option}
                                className="px-2 py-1.5 text-[10px] text-slate-700 hover:bg-slate-100 cursor-pointer"
                                onClick={() => {
                                    onChange(option);
                                    setShowSuggestions(false);
                                }}
                            >
                                {option}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});
SystemQueryCombobox.displayName = "SystemQueryCombobox";
