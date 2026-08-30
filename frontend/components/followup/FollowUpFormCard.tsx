import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { AlertCircle, Star, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface FollowUpFormCardProps {
    editingId: string | null;
    isEditing: boolean;
    date: Date | undefined;
    setDate: (d: Date | undefined) => void;
    type: string;
    setType: (t: string) => void;
    followupSubjects: string[];
    tagsArray: string[];
    tagInput: string;
    setTagInput: (val: string) => void;
    handleTagKeyDown: (e: React.KeyboardEvent) => void;
    handleRemoveTag: (tag: string) => void;
    status: string;
    setStatus: (s: string) => void;
    note: string;
    setNote: (n: string) => void;
}

export function FollowUpFormCard({
    editingId,
    isEditing,
    date,
    setDate,
    type,
    setType,
    followupSubjects,
    tagsArray,
    tagInput,
    setTagInput,
    handleTagKeyDown,
    handleRemoveTag,
    status,
    setStatus,
    note,
    setNote,
}: FollowUpFormCardProps) {
    return (
        <Card className={cn(
            "flex-1 border-slate-200 shadow-sm transition-all duration-300",
            editingId ? "ring-2 ring-amber-100 border-amber-200" : ""
        )}>
            <CardContent className="p-6 h-full flex flex-col gap-4">
                {/* Inputs Row */}
                <div className="flex flex-wrap items-center gap-4">
                    {/* Date */}
                    <DatePicker
                        date={date ? format(date, 'yyyy-MM-dd') : ''}
                        setDate={val => setDate(val ? parseISO(val) : undefined)}
                        disabled={!isEditing}
                        className="w-[170px] bg-white border-slate-200 h-9 text-xs"
                    />

                    {/* Type */}
                    <div className="flex items-center">
                        <Select value={type} onValueChange={setType} disabled={!isEditing}>
                            <SelectTrigger className="w-[180px] h-9 bg-white border-slate-200 text-xs font-bold uppercase">
                                <SelectValue placeholder="KONU" />
                            </SelectTrigger>
                            <SelectContent>
                                {followupSubjects.map(subject => (
                                    <SelectItem key={subject} value={subject} className="text-xs uppercase">{subject}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* TAGs */}
                    <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-white border border-slate-200 rounded-md px-2 h-9 overflow-hidden focus-within:ring-1 focus-within:ring-blue-500">
                        <span className="text-[10px] font-bold text-slate-400 shrink-0">TAGs:</span>
                        <div className="flex flex-wrap gap-1 items-center overflow-x-auto no-scrollbar flex-1 max-h-7">
                            {tagsArray.map(tag => (
                                <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-[9px] px-1.5 py-0 h-5 bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1 shrink-0 font-bold uppercase"
                                >
                                    {tag}
                                    {isEditing && (
                                        <X
                                            className="h-2.5 w-2.5 cursor-pointer hover:text-blue-900"
                                            onClick={() => handleRemoveTag(tag)}
                                        />
                                    )}
                                </Badge>
                            ))}
                            <input
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                placeholder={tagsArray.length === 0 ? "Örn: ACİL, LAB..." : ""}
                                disabled={!isEditing}
                                className="outline-none bg-transparent text-xs uppercase flex-1 min-w-[60px]"
                            />
                        </div>
                    </div>

                    {/* Status Icons Selection */}
                    <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 shadow-sm">
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={!isEditing}
                            title="Dikkat"
                            className={cn(
                                "h-9 w-9 transition-all rounded-md",
                                status === "Acil"
                                    ? "bg-red-500 text-white hover:bg-red-600 shadow-sm"
                                    : "text-slate-300 hover:text-red-400 hover:bg-red-50"
                            )}
                            onClick={() => setStatus(status === "Acil" ? "Normal" : "Acil")}
                        >
                            <AlertCircle className={cn("h-5 w-5", status === "Acil" ? "stroke-[3.5px]" : "stroke-2")} />
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={!isEditing}
                            title="Önemli"
                            className={cn(
                                "h-9 w-9 transition-all rounded-md",
                                status === "Önemli"
                                    ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
                                    : "text-slate-300 hover:text-amber-400 hover:bg-amber-50"
                            )}
                            onClick={() => setStatus(status === "Önemli" ? "Normal" : "Önemli")}
                        >
                            <Star className={cn("h-5 w-5", status === "Önemli" ? "fill-white" : "")} />
                        </Button>
                    </div>
                </div>

                {/* Text Area */}
                <Textarea
                    className="flex-1 resize-none border-0 focus-visible:ring-0 p-4 text-sm md:text-base font-mono text-slate-700 placeholder:text-slate-300 bg-slate-50/30 rounded-lg disabled:cursor-auto disabled:opacity-80"
                    placeholder="Hastanın durumu, şikayetleri ve yapılan işlemler hakkında detaylı notlarınızı buraya yazın..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={!isEditing}
                />
            </CardContent>
        </Card>
    );
}
