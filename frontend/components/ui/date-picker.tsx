"use client";

import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SmartCalendar } from "@/components/ui/SmartCalendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date?: string | Date;
  setDate: (date: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
}

export function DatePicker({ date, setDate, className, placeholder = "Tarih seçin", disabled, compact }: DatePickerProps) {
  const selectedDate = React.useMemo(() => {
    if (!date) return undefined;
    if (date instanceof Date) return date;
    const parsed = parseISO(date);
    return isValid(parsed) ? parsed : undefined;
  }, [date]);

  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-bold border-slate-200 h-10 shadow-sm transition-all focus:ring-cyan-500 hover:bg-slate-50",
            !date && "text-muted-foreground font-normal",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-cyan-600" />
          {selectedDate ? format(selectedDate, compact ? "d MMM yyyy" : "PPP", { locale: tr }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-none shadow-2xl" align="start">
        <SmartCalendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => {
            if (d) {
              const formatted = format(d, "yyyy-MM-dd");
              setDate(formatted);
              setOpen(false);
            }
          }}
          disabled={disabled}
          initialFocus
          locale={tr}
          className="rounded-xl border border-slate-200 bg-white"
        />
      </PopoverContent>
    </Popover>
  );
}
