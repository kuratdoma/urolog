import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface SystemQueryComboboxProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder?: string;
    disabled?: boolean;
    openUpwards?: boolean;
}

export const SystemQueryCombobox = React.memo(({
    label,
    value,
    onChange,
    options,
    placeholder,
    disabled,
    openUpwards
}: SystemQueryComboboxProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Filter options based on input - show all when empty or default value
    const searchValue = (!value || value === "Seçiniz..." || value === "") ? "" : value;
    const filteredOptions = searchValue === ""
        ? options
        : options.filter(opt => opt.toLowerCase().includes(searchValue.toLowerCase()));

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Tab' && filteredOptions.length > 0 && showSuggestions) {
            // Accept first matching option
            onChange(filteredOptions[0]);
            setShowSuggestions(false);
            // Don't prevent default - let Tab move to next input naturally
        } else if (e.key === 'Enter' && filteredOptions.length > 0) {
            e.preventDefault();
            onChange(filteredOptions[0]);
            setShowSuggestions(false);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        } else if (e.key === 'ArrowDown' && !showSuggestions) {
            setShowSuggestions(true);
        }
    };

    // Click handler for dropdown icon/input container
    const handleContainerClick = () => {
        if (!disabled) {
            setShowSuggestions(true);
            setIsFocused(true);
            inputRef.current?.focus();
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        inputRef.current?.focus();
    };

    const hasValue = value && value !== "" && value !== "Seçiniz...";

    return (
        <div className={cn("flex items-center justify-between gap-2 relative", disabled && "opacity-70 pointer-events-none")}>
            <Label className="text-[10px] font-bold text-slate-500 uppercase flex-1 leading-tight">{label}</Label>
            <div className="relative w-[180px]" onClick={handleContainerClick}>
                <Input
                    ref={inputRef}
                    value={value === "Seçiniz..." ? "" : value}
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
                    onKeyDown={handleKeyDown}
                    className="h-8 text-[10px] bg-slate-50 border-slate-200 text-slate-700 px-2 pr-6 w-full font-normal cursor-pointer"
                    placeholder={placeholder || "Seçiniz..."}
                />

                {/* Icons: Clear or Dropdown Arrow */}
                {hasValue ? (
                    <div
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer p-0.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-colors"
                        onClick={handleClear}
                        title="Temizle"
                    >
                        <X className="w-3.5 h-3.5" />
                    </div>
                ) : (
                    <div
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer p-1 hover:bg-slate-100 rounded"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleContainerClick();
                        }}
                    >
                        <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                )}

                {(isFocused || showSuggestions) && filteredOptions.length > 0 && (
                    <div className={cn(
                        "absolute left-0 w-full z-50 bg-white border border-slate-200 rounded-md shadow-lg",
                        openUpwards ? "bottom-full mb-1" : "top-full mt-1"
                    )}>
                        {filteredOptions.map((option, idx) => (
                            <div
                                key={option}
                                className={cn(
                                    "px-2 py-1 text-[10px] text-slate-700 hover:bg-blue-100 cursor-pointer font-normal",
                                    idx === 0 && value && "bg-blue-50 font-bold" // Highlight first match
                                )}
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
