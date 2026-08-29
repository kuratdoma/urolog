import React, { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { searchStaticICD, lookupICDName } from "@/lib/icd-codes";
import { ICDTani } from "@/lib/api";

interface DiagnosisICDComboboxProps {
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

    // Local states for both inputs
    const [localValue, setLocalValue] = useState(value);
    const [localCode, setLocalCode] = useState(code);
    const [codeFocused, setCodeFocused] = useState(false);

    // Sync inputs when prop values change from outside (e.g. past exams)
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    useEffect(() => {
        setLocalCode(code);
    }, [code]);

    // Search when name input changes
    useEffect(() => {
        if (!localValue || localValue.length < 2 || !isFocused) {
            setIcdResults([]);
            return;
        }

        let isActive = true;
        setIsLoading(true);

        searchStaticICD(localValue).then(results => {
            if (!isActive) return;
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

        return () => { isActive = false; };
    }, [localValue, isFocused]);

    // Auto-fill name when exact ICD code is entered
    const handleCodeChange = useCallback((newCode: string) => {
        const upperCode = newCode.toUpperCase();
        setLocalCode(upperCode);

        // Code exactly 3 chars minimum (e.g. A00)
        if (upperCode.length >= 3) {
            lookupICDName(upperCode).then(name => {
                if (name !== upperCode) {
                    setLocalValue(name);
                    onValueChange(name);
                }
            });
        }
        onCodeChange(upperCode);

    }, [onValueChange, onCodeChange]);

    const handleSyncToParent = (val: string) => {
        onValueChange(val);
    };

    return (
        <div className="flex flex-col gap-1.5 relative">
            <div className="flex items-center justify-between gap-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase leading-tight">{label}</Label>
            </div>
            <div className="flex gap-2">
                {/* ICD Code Input */}
                <div className="w-24 shrink-0">
                    <Input
                        value={localCode}
                        disabled={disabled}
                        onChange={(e) => handleCodeChange(e.target.value)}
                        onFocus={() => setCodeFocused(true)}
                        onBlur={() => {
                            setCodeFocused(false);
                            onCodeChange(localCode);
                        }}
                        className={cn(
                            "h-9 text-xs font-bold text-blue-700 bg-blue-50 border-blue-200 px-2 text-center uppercase",
                            disabled && "opacity-70",
                            codeFocused && "bg-white border-blue-400"
                        )}
                        placeholder="ICD"
                    />
                </div>
                {/* Diagnosis Name Input */}
                <div className="relative flex-1">
                    <Input
                        value={localValue}
                        disabled={disabled}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            setLocalValue(newValue);
                            // Clear code when typing manually in name field
                            if (localCode) {
                                setLocalCode("");
                                onCodeChange("");
                            }
                        }}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => {
                            handleSyncToParent(localValue);
                            setTimeout(() => {
                                setIsFocused(false);
                                setShowSuggestions(false);
                            }, 200);
                        }}
                        className={cn(
                            "h-9 text-xs bg-slate-50 border-slate-200 text-slate-700 px-3 w-full focus:bg-white transition-colors",
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
                                        onMouseDown={(e) => {
                                            e.preventDefault(); // Blur olayını ve focus kaybını engelle
                                            setLocalValue(item.adi || "");
                                            setLocalCode(item.kodu);
                                            onValueChange(item.adi || "");
                                            onCodeChange(item.kodu);
                                            setShowSuggestions(false);
                                            setIsFocused(false);
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
        </div>
    );
});
DiagnosisICDCombobox.displayName = "DiagnosisICDCombobox";
