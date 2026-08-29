import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface QuickSelectInputProps {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const QuickSelectInput = React.memo(({
    value,
    onChange,
    options,
    placeholder,
    className,
    disabled
}: QuickSelectInputProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    return (
        <div className={cn("relative w-full", disabled && "opacity-70 pointer-events-none")}>
            <Input
                value={value}
                disabled={disabled}
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
                className={cn("h-8 text-xs bg-white font-mono", className)}
                placeholder={placeholder || ""}
            />

            {(isFocused || showSuggestions) && options.length > 0 && (
                <div className="absolute top-full left-0 w-full z-50 bg-white border border-slate-200 rounded-md shadow-xl mt-1 overflow-hidden">
                    {options.map(option => (
                        <div
                            key={option}
                            className="px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 font-medium font-mono"
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
    );
});
QuickSelectInput.displayName = "QuickSelectInput";
