import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ClinicalCardProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    icon?: LucideIcon;
    iconClassName?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}

export const ClinicalCard: React.FC<ClinicalCardProps> = ({
    title,
    icon: Icon,
    iconClassName,
    action,
    children,
    className,
    ...props
}) => {
    return (
        <div className={cn("rounded-xl border border-white bg-white p-1 shadow-sm flex flex-col transition-all hover:shadow-md", className)} {...props}>
            <div className="px-3 py-2 border-b border-slate-50 flex items-center justify-between min-h-[40px]">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className={cn("h-4 w-4", iconClassName || "text-slate-500")} />}
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">{title}</h3>
                </div>
                {action && <div className="flex items-center gap-2">{action}</div>}
            </div>
            <div className="p-2 flex-1 relative">
                {children}
            </div>
        </div>
    );
};
