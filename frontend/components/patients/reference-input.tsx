'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ReferenceInputProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    className?: string;
}

export function ReferenceInput({ value, onChange, disabled, className }: ReferenceInputProps) {
    const [inputValue, setInputValue] = React.useState(value || '');
    const [showSuggestions, setShowSuggestions] = React.useState(false);

    const { data: references = [] } = useQuery({
        queryKey: ['patient-references'],
        queryFn: api.patients.getReferences,
        staleTime: 60000,
    });

    React.useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    const normalizeTurkishUpper = (text: string) => {
        if (!text) return "";
        const map: { [key: string]: string } = {
            "i": "İ", "ı": "I", "ğ": "Ğ", "ü": "Ü", "ş": "Ş", "ö": "Ö", "ç": "Ç",
        };
        return text.split('').map(char => {
            if (map[char]) return map[char];
            if (char >= 'a' && char <= 'z') return char.toUpperCase();
            return char.toUpperCase();
        }).join('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = normalizeTurkishUpper(e.target.value);
        setInputValue(val);
        onChange(val);
        setShowSuggestions(val.length > 0);
    };

    const filteredReferences = references
        .filter((ref) => ref.toUpperCase().includes(inputValue.toUpperCase()))
        .filter((ref) => ref.toUpperCase() !== inputValue.toUpperCase()) // Hide if exact match
        .slice(0, 5);

    const handleSelect = (selectedValue: string) => {
        const upperVal = normalizeTurkishUpper(selectedValue);
        setInputValue(upperVal);
        onChange(upperVal);
        setShowSuggestions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Tab' && showSuggestions && filteredReferences.length > 0) {
            handleSelect(filteredReferences[0]);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    return (
        <div className="relative w-full">
            <Input
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onFocus={() => inputValue.length > 0 && setShowSuggestions(true)}
                disabled={disabled}
                className={cn("h-8 text-xs w-full uppercase font-medium", className)}
                placeholder="REFERANS GİRİNİZ..."
                autoComplete="off"
            />
            {showSuggestions && filteredReferences.length > 0 && (
                <div className="absolute z-[100] w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredReferences.map((ref) => (
                        <div
                            key={ref}
                            className="px-3 py-2 text-xs hover:bg-slate-100 cursor-pointer uppercase border-b last:border-0"
                            onClick={() => handleSelect(ref)}
                        >
                            {ref}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
