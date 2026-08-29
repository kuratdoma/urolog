"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ScoreCardConfig {
    label: string;
    total: number;
    maxScore: number;
    filled: boolean;
    severity: {
        color: string;
    };
    onClick: () => void;
}

interface QuestionnaireScoreCardProps extends ScoreCardConfig {
    className?: string;
}

const COLOR_CLASSES: Record<string, string> = {
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    lime: "bg-lime-50 border-lime-200 text-lime-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    red: "bg-red-50 border-red-200 text-red-700",
};

export function QuestionnaireScoreCard({
    label,
    total,
    maxScore,
    filled,
    severity,
    onClick,
    className,
}: QuestionnaireScoreCardProps) {
    const colorClass = COLOR_CLASSES[severity.color] || COLOR_CLASSES.purple;

    return (
        <div
            onClick={onClick}
            className={cn(
                "cursor-pointer flex flex-col items-center px-3 py-1.5 rounded-lg border transition-all hover:shadow-md text-xs min-w-[80px]",
                colorClass,
                className
            )}
        >
            <div className="flex items-center gap-1.5">
                <span className="font-bold">{label}</span>
                {filled && (
                    <>
                        <div className="h-4 w-px bg-current opacity-30" />
                        <span className="font-bold">
                            {total}/{maxScore}
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}
