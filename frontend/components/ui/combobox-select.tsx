'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList
} from '@/components/ui/command';
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
    options,
    placeholder = 'Seçiniz veya yazınız...',
    disabled = false,
    className,
}: ComboboxSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(value || '');

    React.useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    const filtered = options.filter((opt) =>
        opt.toLowerCase().includes(inputValue.toLowerCase())
    );

    if (disabled) {
        return (
            <Input
                value={value || ''}
                disabled
                placeholder={placeholder}
                className={cn('h-9 text-xs border-slate-200 bg-white', className)}
            />
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverAnchor asChild>
                <div className="relative">
                    <Input
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            onChange(e.target.value);
                            if (!open) setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        placeholder={placeholder}
                        className={cn('h-9 text-xs border-slate-200 bg-white pr-8', className)}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-9 w-8 text-slate-400 hover:text-slate-600"
                        onClick={() => setOpen(!open)}
                        tabIndex={-1}
                    >
                        <ChevronsUpDown className="h-3 w-3" />
                    </Button>
                </div>
            </PopoverAnchor>
            <PopoverContent className="min-w-[240px] md:min-w-[300px] p-0 shadow-lg" align="start">
                <Command shouldFilter={false}>
                    <CommandList>
                        {filtered.length === 0 ? (
                            <CommandEmpty className="py-3 text-center text-xs text-slate-400">
                                Sonuç bulunamadı
                            </CommandEmpty>
                        ) : (
                            <CommandGroup>
                                {filtered.map((opt) => (
                                    <CommandItem
                                        key={opt}
                                        value={opt}
                                        onSelect={() => {
                                            onChange(opt);
                                            setInputValue(opt);
                                            setOpen(false);
                                        }}
                                        className="text-xs cursor-pointer"
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-3 w-3',
                                                value === opt ? 'opacity-100' : 'opacity-0'
                                            )}
                                        />
                                        {opt}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
