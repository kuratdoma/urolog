import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface LabInputProps {
    label: string;
    value: any;
    onFieldChange: (val: string) => void;
    unit?: string;
    placeholder?: string;
    type?: string;
    className?: string;
    [key: string]: any;
}

export const LabInput = ({ 
    label, 
    value, 
    onFieldChange, 
    unit, 
    placeholder, 
    type = "text",
    className,
    ...props 
}: LabInputProps) => (
    <div className="flex items-center gap-2">
        <Label className="w-24 text-xs font-bold text-slate-600 truncate">{label}</Label>
        <div className="relative flex-1">
            <Input
                type={type}
                value={value || ''}
                onChange={e => onFieldChange(e.target.value)}
                className={`h-8 text-xs pr-8 bg-slate-50 border-slate-200 focus:bg-white transition-colors ${className}`}
                placeholder={placeholder}
                {...props}
            />
            {unit && (
                <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-medium">
                    {unit}
                </span>
            )}
        </div>
    </div>
);
