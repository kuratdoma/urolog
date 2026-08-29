'use client';

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { BIRTHPLACES } from '@/lib/birthplaces';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface BirthplaceSelectProps {
    field: {
        value: string | undefined;
        onChange: (value: string) => void;
    };
    disabled?: boolean;
    className?: string;
}

export function BirthplaceSelect({ field, disabled, className }: BirthplaceSelectProps) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between font-normal",
                        !field.value && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled}
                >
                    <span className="truncate">
                        {field.value || "Doğum yeri seçiniz..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Şehir veya ilçe ara..." />
                    <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-y-auto">
                        {BIRTHPLACES.map((place) => (
                            <CommandItem
                                key={place}
                                value={place}
                                onSelect={() => {
                                    field.onChange(place);
                                    setOpen(false);
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === place ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {place}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
