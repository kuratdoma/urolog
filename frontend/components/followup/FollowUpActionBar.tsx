import React from 'react';
import { Button } from "@/components/ui/button";
import {
    Save, Pencil, Trash2, Printer
} from "lucide-react";

interface FollowUpActionBarProps {
    isEditing: boolean;
    isViewOnly: boolean;
    editingId: string | null;
    isPending: boolean;
    onSave: () => void;
    onCancelEdit: () => void;
    onStartEdit: () => void;
    onDelete: () => void;
    onPrint: () => void;
}

export function FollowUpActionBar({
    isEditing,
    isViewOnly,
    editingId,
    isPending,
    onSave,
    onCancelEdit,
    onStartEdit,
    onDelete,
    onPrint,
}: FollowUpActionBarProps) {
    return (
        <div className="rounded-xl border border-white bg-white shadow-sm p-2 flex items-center justify-end gap-2">
            <div className="flex items-center gap-2">
                {isEditing ? (
                    <>
                        <Button
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                            onClick={onSave}
                            disabled={isPending}
                        >
                            <Save className="h-3 w-3" />
                            {isPending ? "KAYDEDİLİYOR..." : "KAYDET"}
                        </Button>
                        {editingId && (
                            <Button variant="ghost" onClick={onCancelEdit} className="text-slate-500 h-8 px-3 text-xs font-bold">
                                İPTAL
                            </Button>
                        )}
                    </>
                ) : (
                    !isViewOnly && (
                        <Button
                            className="h-8 bg-amber-500 hover:bg-amber-600 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                            onClick={onStartEdit}
                        >
                            <Pencil className="h-3 w-3" />
                            GÜNCELLE
                        </Button>
                    )
                )}

                {editingId && !isViewOnly && (
                    <Button
                        className="h-8 bg-red-600 hover:bg-red-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-3 w-3" />
                        SİL
                    </Button>
                )}
            </div>

            {editingId && (
                <Button
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                    onClick={onPrint}
                    title="Yazdır"
                >
                    <Printer className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
