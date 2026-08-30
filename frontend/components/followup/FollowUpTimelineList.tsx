import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Calendar as Plus,
    AlertCircle,
    Star,
    MoreVertical,
    Pencil,
    Trash2
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface FollowUpTimelineListProps {
    timelineItems: any[];
    isLoadingFollowUps: boolean;
    isErrorFollowUps: boolean;
    editingId: string | null;
    isViewOnly: boolean;
    resetForm: () => void;
    handleEdit: (item: any) => void;
    handleDeleteClick: (item: any) => void;
}

export function FollowUpTimelineList({
    timelineItems,
    isLoadingFollowUps,
    isErrorFollowUps,
    editingId,
    isViewOnly,
    resetForm,
    handleEdit,
    handleDeleteClick,
}: FollowUpTimelineListProps) {
    return (
        <div className="w-full lg:w-[240px] space-y-4 shrink-0 p-6 lg:pl-0">
            <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                size="lg"
                onClick={resetForm}
            >
                <Plus className="mr-2 h-4 w-4" />
                Yeni Not
            </Button>

            <div className="rounded-xl border border-white bg-white shadow-sm flex flex-col h-[calc(100vh-100px)] sticky top-6 overflow-hidden">
                <div className="p-3 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                    <span>GEÇMİŞ KAYITLAR</span>
                    <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {timelineItems.length}
                    </span>
                </div>

                <ScrollArea className="flex-1 bg-white min-h-0">
                    <div className="divide-y divide-slate-100">
                        {isLoadingFollowUps ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                Yükleniyor...
                            </div>
                        ) : isErrorFollowUps ? (
                            <div className="p-8 text-center text-red-400 text-sm">
                                Takip notları yüklenirken bir hata oluştu.
                            </div>
                        ) : timelineItems.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                Kayıt bulunamadı.
                            </div>
                        ) : (
                            timelineItems.map((item, index) => (
                                <div
                                    key={`${item.id}-${index}`}
                                    id={`followup-item-${item.id}`}
                                    className={cn(
                                        "group p-3 hover:bg-slate-50 transition-colors relative cursor-pointer border-l-4",
                                        editingId === item.originalId && ((item.sourceType === 'followup' && !isViewOnly) || ((item.sourceType === 'operation' || item.sourceType === 'medical_report') && isViewOnly)) ? "bg-amber-50/50 border-amber-500" :
                                            "border-transparent"
                                    )}
                                    onClick={() => handleEdit(item)}
                                >
                                    <div className="flex items-start justify-between mb-1.5">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-xs font-bold text-slate-700">
                                                    {item.displayDate ? format(parseISO(item.displayDate), 'dd.MM.yyyy') : '-'}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <span className={cn(
                                                        "text-[10px] font-bold uppercase border-l-2 pl-2",
                                                        item.sourceType === 'operation' ? "text-purple-600 border-purple-200" :
                                                            item.sourceType === 'medical_report' ? "text-indigo-600 border-indigo-200" :
                                                                "text-blue-600 border-blue-200"
                                                    )}>
                                                        {item.displayType}
                                                    </span>
                                                    {item.displayTags.map((tag: any) => (
                                                        <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium border border-slate-200 uppercase whitespace-nowrap">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {item.durum === 'Acil' ? (
                                                    <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 stroke-[3px]" />
                                                ) : item.durum === 'Önemli' ? (
                                                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {item.canEdit && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={(e) => { e.stopPropagation(); }}
                                                        >
                                                            <MoreVertical className="h-3 w-3 text-slate-400" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-32">
                                                        <DropdownMenuItem
                                                            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                                                            className="text-xs"
                                                        >
                                                            <Pencil className="mr-2 h-3 w-3" /> Düzenle
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(item); }}
                                                            className="text-xs text-red-600 focus:text-red-600"
                                                        >
                                                            <Trash2 className="mr-2 h-3 w-3" /> Sil
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-600 line-clamp-2 leading-snug break-words">
                                        {item.displayText || "Not girilmemiş."}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
