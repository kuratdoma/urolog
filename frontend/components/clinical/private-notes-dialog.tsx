"use client";

import React, { useState, useEffect, useCallback } from "react";
import { StickyNote, Loader2, Save, Trash2, FileText } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { clinicalApi } from "@/lib/api/clinical";
import { PrivateNote } from "@/lib/api/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PrivateNotesDialogProps {
    patientId: string;
    protocolNo: string;
    autoShow?: boolean;
}

export function PrivateNotesDialog({ patientId, protocolNo, autoShow = false }: PrivateNotesDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notes, setNotes] = useState<PrivateNote[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    const fetchNotes = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await clinicalApi.getPrivateNotes(patientId);
            setNotes(data);

            // Auto-show logic
            if (autoShow && data.length > 0) {
                const today = new Date().toISOString().split('T')[0];
                const storageKey = `private_notes_shown_${patientId}_${today}`;
                const shownCount = parseInt(localStorage.getItem(storageKey) || "0");

                if (shownCount < 2) {
                    setIsOpen(true);
                    localStorage.setItem(storageKey, (shownCount + 1).toString());
                }
            }
        } catch (error) {
            console.error("Failed to fetch private notes:", error);
        } finally {
            setIsLoading(false);
        }
    }, [patientId, autoShow]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const handleAddNote = async () => {
        if (!newNote.trim()) {
            setIsAdding(false);
            return;
        }
        setIsSaving(true);
        try {
            const note = await clinicalApi.createPrivateNote({
                hasta_id: patientId,
                icerik: newNote.trim()
            });
            setNotes(prev => [...prev, note]);
            setNewNote("");
            setIsAdding(false);
            toast.success("Not eklendi");
        } catch (error) {
            toast.error("Not eklenemedi");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteNote = async (id: string) => {
        try {
            await clinicalApi.deletePrivateNote(id);
            setNotes(prev => prev.filter(n => n.id !== id));
            toast.success("Not silindi");
        } catch (error) {
            toast.error("Not silinemedi");
        }
    };

    const hasNotes = notes.length > 0;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    className={cn(
                        "px-2 py-0.5 rounded text-xs font-mono font-bold transition-all hover:ring-2 hover:ring-offset-1 active:scale-95",
                        hasNotes 
                            ? "bg-yellow-100 text-yellow-800 border border-yellow-200 hover:ring-yellow-300" 
                            : "bg-slate-100 text-slate-600 border border-slate-200 hover:ring-slate-300"
                    )}
                    title={hasNotes ? "Özel notlar mevcut" : "Özel not ekle"}
                >
                    {protocolNo}
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader className="border-b pb-4 mb-4">
                    <DialogTitle className="flex items-center gap-2 text-slate-800">
                        <FileText className="w-5 h-5 text-yellow-600" />
                        <span>Notlar</span>
                        <span className="text-xs font-mono text-slate-400 font-normal ml-auto">({protocolNo})</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="max-h-[400px] overflow-y-auto space-y-4 pr-1">
                    {isLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="text-xs font-medium uppercase tracking-widest">Veriler Yükleniyor...</span>
                        </div>
                    ) : notes.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-300 gap-3 border-2 border-dashed border-slate-100 rounded-xl">
                            <StickyNote className="w-10 h-10 opacity-20" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Henüz özel not bulunmuyor</span>
                        </div>
                    ) : (
                        notes.map((note) => (
                            <div key={note.id} className="group relative bg-slate-50 border border-slate-100 rounded-xl p-4 transition-all hover:border-yellow-200 hover:bg-yellow-50/20 shadow-sm hover:shadow">
                                <p className="text-xs text-slate-700 leading-relaxed break-words whitespace-pre-wrap pr-8 italic">
                                    "{note.icerik}"
                                </p>
                                <button 
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1.5"
                                    title="Notu Sil"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <div className="mt-3 flex items-center justify-between">
                                    <div className="text-[10px] text-slate-400 font-mono">
                                        {note.created_at ? new Date(note.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                    </div>
                                    <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-6 pt-6 border-t flex flex-col gap-4">
                    {isAdding ? (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                            <Textarea
                                placeholder="Örn: Çocuklarının adı, özel alışkanlıkları..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                className="min-h-[120px] text-sm bg-white border-slate-200 focus:ring-yellow-500 focus:border-yellow-500 resize-none shadow-sm rounded-xl p-4 leading-relaxed"
                                rows={4}
                                autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsAdding(false)}
                                    className="rounded-xl px-4 text-xs font-bold uppercase"
                                >
                                    Vazgeç
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={isSaving || !newNote.trim()}
                                    onClick={handleAddNote}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-xs px-6 rounded-xl gap-2 uppercase shadow-lg shadow-yellow-100 transition-all active:scale-95"
                                >
                                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Notu Kaydet
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <Button 
                                onClick={() => setIsAdding(true)}
                                variant="outline"
                                className="w-full h-12 rounded-xl border-dashed border-2 border-slate-200 text-slate-400 hover:text-yellow-600 hover:border-yellow-500 hover:bg-yellow-50 transition-all font-bold gap-2 text-xs uppercase"
                            >
                                <StickyNote className="w-4 h-4" />
                                Not Ekle
                            </Button>
                        </div>
                    )}
                </div>
                <div className="mt-2 text-[10px] text-slate-400 text-center italic">
                    Bu bilgiler sadece doktora özeldir ve hasta dosyası açılırken hatırlatıcı olarak gösterilir.
                </div>
            </DialogContent>
        </Dialog>
    );
}
