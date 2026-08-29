import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ICDTani } from "@/lib/api";
import { searchStaticICD } from "@/lib/icd-codes";

export interface DiagnosisICDComboboxProps {
    label: string;
    value: string;
    code: string;
    onValueChange: (v: string) => void;
    onCodeChange: (v: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const DiagnosisICDCombobox = React.memo(({
    label,
    value,
    code,
    onValueChange,
    onCodeChange,
    placeholder,
    disabled
}: DiagnosisICDComboboxProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [icdResults, setIcdResults] = useState<ICDTani[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Performance optimization: Local state for input to avoid parent re-renders on every keystroke
    const [localValue, setLocalValue] = useState(value);

    // Sync input when prop value changes from outside (e.g. past exams)
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    useEffect(() => {
        if (!localValue || localValue.length < 2 || !isFocused) {
            setIcdResults([]);
            return;
        }

        let isActive = true;
        setIsLoading(true);

        searchStaticICD(localValue).then(results => {
            if (!isActive) return;
            
            // Sonuçları ICDTani formatına dönüştür
            const mappedResults: ICDTani[] = results.map((item, index) => ({
                id: index,
                kodu: item.kodu,
                adi: item.adi,
                ust_kodu: "",
                aktif: "1",
                seviye: "1"
            }));

            setIcdResults(mappedResults);
            setShowSuggestions(true);
            setIsLoading(false);
        });

        return () => {
            isActive = false;
        };
    }, [localValue, isFocused]);

    const handleSyncToParent = (val: string) => {
        onValueChange(val);
    };

    return (
        <div className="flex flex-col gap-1.5 relative">
            <div className="flex items-center justify-between gap-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase leading-tight">{label}</Label>
                {code && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{code}</span>}
            </div>
            <div className="relative">
                <Input
                    value={localValue}
                    disabled={disabled}
                    onChange={(e) => {
                        const newValue = e.target.value;
                        setLocalValue(newValue);

                        // Only clear code if typing manually
                        if (code) onCodeChange("");
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        // Sync to parent when leaving the field
                        handleSyncToParent(localValue);
                        setTimeout(() => {
                            setIsFocused(false);
                            setShowSuggestions(false);
                        }, 200);
                    }}
                    className={cn(
                        "h-9 text-xs bg-slate-50 border-slate-200 text-slate-700 px-3 w-full focus:bg-white transition-colors font-mono",
                        disabled && "opacity-70"
                    )}
                    placeholder={placeholder || "Tanı ara veya gir..."}
                />

                {(isFocused || showSuggestions) && (icdResults.length > 0 || isLoading) && (
                    <div className="absolute top-full left-0 w-full z-50 bg-white border border-slate-200 rounded-md shadow-xl mt-1 max-h-[250px] overflow-y-auto">
                        {isLoading ? (
                            <div className="p-3 text-center text-xs text-slate-400">Aranıyor...</div>
                        ) : (
                            icdResults.map(item => (
                                <div
                                    key={item.kodu}
                                    className="px-3 py-2 text-xs hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                    onClick={() => {
                                        const pickedName = item.adi || "";
                                        setLocalValue(pickedName);
                                        onValueChange(pickedName);
                                        onCodeChange(item.kodu);
                                        setShowSuggestions(false);
                                    }}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-slate-700">{item.adi}</span>
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">{item.kodu}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});
DiagnosisICDCombobox.displayName = "DiagnosisICDCombobox";
