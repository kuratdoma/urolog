"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Mic, Loader2, CheckCircle, AlertCircle, Pause
} from "lucide-react";
import { AIScribeResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AIScribePreviewDialog } from "./AIScribePreviewDialog";
import { AIScribeResultDisplay } from "./AIScribeResultDisplay";
import { AIScribeActionControls } from "./AIScribeActionControls";
import { useAIScribeAudio } from "./useAIScribeAudio";

interface AIScribeWidgetProps {
    onResult: (result: AIScribeResponse) => void;
    patientId?: string;
}

export function AIScribeWidget({ onResult, patientId }: AIScribeWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [popoverSize, setPopoverSize] = useState<{ width: number | string; height: number | string }>({
        width: '25vw',
        height: 'auto'
    });

    const audio = useAIScribeAudio({
        onResult,
        patientId,
        onClosePopover: () => setIsOpen(false),
    });

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;

        const popoverElement = (e.target as HTMLElement).closest('.popover-resizable') as HTMLElement;
        if (!popoverElement) return;

        const startWidth = popoverElement.offsetWidth;
        const startHeight = popoverElement.offsetHeight;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = startX - moveEvent.clientX;
            const deltaY = moveEvent.clientY - startY;

            const newWidth = Math.max(350, startWidth + deltaX);
            const newHeight = Math.max(250, startHeight + deltaY);

            setPopoverSize({
                width: `${newWidth}px`,
                height: `${newHeight}px`
            });
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const getButtonAppearance = () => {
        switch (audio.recordingState) {
            case 'recording':
                return { bg: 'bg-red-500 hover:bg-red-600', icon: <div className="w-2 h-2 rounded-full bg-white animate-pulse" /> };
            case 'paused':
                return { bg: 'bg-orange-500 hover:bg-orange-600', icon: <Pause className="h-4 w-4" /> };
            case 'analyzing':
                return { bg: 'bg-yellow-500 hover:bg-yellow-600', icon: <Loader2 className="h-4 w-4 animate-spin" /> };
            case 'done':
                return { bg: 'bg-green-500 hover:bg-green-600', icon: <CheckCircle className="h-4 w-4" /> };
            default:
                return { bg: 'bg-slate-500 hover:bg-slate-600', icon: <Mic className="h-4 w-4" /> };
        }
    };

    const buttonAppearance = getButtonAppearance();

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    size="sm"
                    className={cn(
                        "h-9 gap-2 font-bold text-xs text-white shadow-lg transition-all",
                        buttonAppearance.bg,
                        (audio.recordingState === 'recording' || audio.recordingState === 'paused') && "animate-pulse"
                    )}
                >
                    {buttonAppearance.icon}
                    <span>C-3PO</span>
                    {(audio.recordingState === 'recording' || audio.recordingState === 'paused') && (
                        <span className="font-mono text-[10px] ml-1">{audio.formatTime(audio.recordingTime)}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="popover-resizable overflow-hidden min-w-[350px] min-h-[250px] w-[60vw] max-w-[90vw] p-4 max-h-[80vh] shadow-2xl rounded-xl border border-slate-200 bg-white flex flex-col"
                style={{ width: popoverSize.width, height: popoverSize.height }}
                align="end"
            >
                {/* Custom Resize Handle - Bottom Left */}
                <div
                    onMouseDown={handleResizeMouseDown}
                    className="absolute left-0 bottom-0 w-5 h-5 cursor-nesw-resize z-50 flex items-end justify-start p-1"
                    title="Yeniden Boyutlandır"
                >
                    <svg width="10" height="10" viewBox="0 0 10 10" className="text-slate-400 fill-current opacity-70 hover:opacity-100 transition-opacity">
                        <line x1="1" y1="9" x2="9" y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="5" y1="9" x2="9" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Mic className="h-4 w-4 text-yellow-500" />
                            <span className="font-bold text-sm">AI Scribe</span>
                        </div>
                        <select
                            value={audio.selectedPersona}
                            onChange={(e) => audio.setSelectedPersona(e.target.value)}
                            className="text-xs border rounded p-1"
                        >
                            <option value="default">Standart Mod</option>
                            <option value="c3po">C-3PO (Dr. Alp Modu)</option>
                        </select>
                    </div>

                    {/* Quick Actions */}
                    <AIScribeActionControls audio={audio} />

                    {/* File name display */}
                    {audio.audioFileName && (
                        <div className="text-xs text-slate-500 truncate bg-slate-50 p-2 rounded">
                            📁 {audio.audioFileName}
                        </div>
                    )}

                    {/* Error display */}
                    {audio.error && (
                        <div className="bg-red-50 text-red-600 text-xs p-2 rounded flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{audio.error}</span>
                        </div>
                    )}

                    {/* Result preview / Full Display */}
                    {audio.result && audio.recordingState === 'done' && (
                        <AIScribeResultDisplay result={audio.result} />
                    )}
                </div>
            </PopoverContent>

            {/* C-3PO Preview Dialog */}
            {audio.result && (
                <AIScribePreviewDialog
                    open={audio.isPreviewOpen}
                    onOpenChange={audio.setIsPreviewOpen}
                    data={audio.result}
                    onApply={() => {
                        audio.applyResult();
                        audio.setIsPreviewOpen(false);
                    }}
                    onCancel={() => audio.setIsPreviewOpen(false)}
                />
            )}
        </Popover>
    );
}
