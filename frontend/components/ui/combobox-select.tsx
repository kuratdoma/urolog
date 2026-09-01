'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverAnchor
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface ComboboxSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function ComboboxSelect({
    value,
    onChange,
    options = [],
    placeholder = 'Seçiniz veya yazınız...',
    disabled = false,
    className,
}: ComboboxSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Sync search term when value changes externally
    React.useEffect(() => {
        setSearchTerm(value || '');
    }, [value]);

    const filteredOptions = React.useMemo(() => {
        if (!options || options.length === 0) return [];
        const term = searchTerm.trim().toLocaleLowerCase('tr-TR');
        if (!term || term === (value || '').trim().toLocaleLowerCase('tr-TR')) {
            return options;
        }
        return options.filter((opt) =>
            opt.toLocaleLowerCase('tr-TR').includes(term)
        );
    }, [options, searchTerm, value]);

    const handleSelect = (opt: string) => {
        onChange(opt);
        setSearchTerm(opt);
        setOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchTerm('');
        inputRef.current?.focus();
    };

    if (disabled) {
        return (
            <Input
                value={value || ''}
                disabled
                placeholder={placeholder}
                className={cn('h-8 text-xs border-slate-200 bg-white font-medium', className)}
            />
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverAnchor asChild>
                <div className="relative flex items-center">
                    <Input
                        ref={inputRef}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            onChange(e.target.value);
                            if (!open) setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        placeholder={placeholder}
                        className={cn(
                            'h-8 text-xs border-slate-200 bg-white pr-14 focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-800',
                            className
                        )}
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        {searchTerm && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-400 hover:text-slate-600 rounded-full"
                                onClick={handleClear}
                                tabIndex={-1}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-slate-400 hover:text-slate-600 rounded-full"
                            onClick={() => setOpen(!open)}
                            tabIndex={-1}
                        >
                            <ChevronsUpDown className="h-3.5 w-3.5 text-slate-500" />
                        </Button>
                    </div>
                </div>
            </PopoverAnchor>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] min-w-[280px] p-1 shadow-xl bg-white border border-slate-200 rounded-xl z-[150]"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                    {filteredOptions.length === 0 ? (
                        <div className="py-3 px-3 text-center text-xs text-slate-400">
                            Tanımlarda eşleşen sonuç bulunamadı
                        </div>
                    ) : (
                        <div className="py-1">
                            {filteredOptions.map((opt) => {
                                const isSelected = (value || '').trim() === opt.trim();
                                return (
                                    <div
                                        key={opt}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSelect(opt);
                                        }}
                                        className={cn(
                                            'flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors select-none font-medium',
                                            isSelected
                                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                        )}
                                    >
                                        <span className="truncate">{opt}</span>
                                        {isSelected && (
                                            <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 ml-2" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
