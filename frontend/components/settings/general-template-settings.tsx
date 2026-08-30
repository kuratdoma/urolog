"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, SablonTanim } from "@/lib/api";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface GeneralTemplateSettingsProps {
    grup: string;
    title: string;
    description?: string;
}

export function GeneralTemplateSettings({ grup, title, description }: GeneralTemplateSettingsProps) {
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");
    // Local state for template content editing (no auto-save)
    const [editingIcerik, setEditingIcerik] = useState<string>("");

    // Fetch Templates
    const { data: templates = [], isLoading } = useQuery({
        queryKey: ['definitions', 'sablonlar', grup],
        queryFn: () => api.definitions.sablonlar.list(grup),
    });

    // Auto-select first template
    useEffect(() => {
        if (templates.length > 0 && !selectedId) {
            setSelectedId(templates[0].id);
        }
    }, [templates, selectedId]);

    // Sync local content state when selected template changes
    useEffect(() => {
        const tmpl = templates.find(t => t.id === selectedId);
        if (tmpl) {
            setEditingIcerik(tmpl.icerik || "");
        }
    }, [selectedId, templates]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (kod: string) => api.definitions.sablonlar.create({ grup, kod, icerik: "", aktif: true }),
        onSuccess: (newItem) => {
            queryClient.invalidateQueries({ queryKey: ['definitions', 'sablonlar', grup] });
            setSelectedId(newItem.id);
            toast.success("Yeni şablon oluşturuldu");
        }
    });

    const updateMutation = useMutation({
        mutationFn: (params: { id: string, data: Partial<SablonTanim> }) =>
            api.definitions.sablonlar.update(params.id, params.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['definitions', 'sablonlar', grup] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.definitions.sablonlar.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['definitions', 'sablonlar', grup] });
            setSelectedId(null);
            toast.success("Şablon silindi");
        }
    });

    const handleSave = () => {
        if (!selectedTemplate) return;
        updateMutation.mutate(
            { id: selectedTemplate.id, data: { ...selectedTemplate, icerik: editingIcerik } },
            {
                onSuccess: () => {
                    toast.success("Değişiklikler kaydedildi");
                }
            }
        );
    };

    const handleDelete = (id: string) => {
        if (confirm("Bu şablonu silmek istediğinize emin misiniz?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleAdd = () => {
        setNewTemplateName("");
        setIsAddDialogOpen(true);
    };

    const confirmAdd = () => {
        if (newTemplateName.trim()) {
            createMutation.mutate(newTemplateName.trim());
            setIsAddDialogOpen(false);
        }
    };

    const selectedTemplate = templates.find(t => t.id === selectedId);

    // Check if local content differs from saved content
    const hasUnsavedChanges = selectedTemplate ? editingIcerik !== (selectedTemplate.icerik || "") : false;

    if (isLoading) return <div className="p-8 text-center text-slate-400">Yükleniyor...</div>;

    return (
        <div className="grid grid-cols-12 gap-6 h-[600px]">
            {/* Sidebar: Template List */}
            <div className="col-span-4 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</h3>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600" onClick={handleAdd}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {templates.map(tmp => (
                            <button
                                key={tmp.id}
                                onClick={() => setSelectedId(tmp.id)}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-3",
                                    selectedId === tmp.id ? "bg-white shadow-sm ring-1 ring-slate-200 text-slate-900" : "text-slate-500 hover:bg-slate-100/50"
                                )}
                            >
                                <FileText className={cn("w-4 h-4", selectedId === tmp.id ? "text-blue-500" : "text-slate-400")} />
                                <span className="truncate">{tmp.kod || "İsimsiz Şablon"}</span>
                            </button>
                        ))}
                        {templates.length === 0 && (
                            <div className="p-4 text-center text-xs text-slate-400 italic">
                                Henüz şablon eklenmemiş.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Editor Area */}
            <div className="col-span-8 h-full">
                {selectedTemplate ? (
                    <Card className="h-full border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-6 space-y-6 flex flex-col h-full">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[10px] uppercase text-slate-400 font-bold">Şablon Kodu / Adı</Label>
                                    <Input
                                        value={selectedTemplate.kod || ''}
                                        onChange={(e) => updateMutation.mutate({ id: selectedTemplate.id, data: { ...selectedTemplate, kod: e.target.value } })}
                                        className="font-bold border-none shadow-none text-lg px-0 h-8 focus-visible:ring-0"
                                        placeholder="Şablon Adı"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={() => handleDelete(selectedTemplate.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        size="sm"
                                        disabled={!hasUnsavedChanges}
                                        className={cn(
                                            "h-8 gap-2 font-bold px-4 transition-all",
                                            hasUnsavedChanges
                                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                        )}
                                    >
                                        <Check className="w-4 h-4" /> KAYDET
                                    </Button>
                                </div>
                            </div>

                            {/* Editor */}
                            <div className="flex-1 flex flex-col space-y-2">
                                <Label className="text-[10px] uppercase text-slate-400 font-bold">Şablon İçeriği</Label>
                                <Textarea
                                    value={editingIcerik}
                                    onChange={(e) => setEditingIcerik(e.target.value)}
                                    className="flex-1 border-slate-200 bg-slate-50 focus:bg-white resize-none font-mono text-sm leading-relaxed"
                                    placeholder="Buraya şablon içeriğini yazın..."
                                />
                                {description && (
                                    <p className="text-[10px] text-slate-400 italic">
                                        {description}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm bg-slate-50/50 rounded-xl border border-dashed border-slate-200 gap-4">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                            <FileText className="w-8 h-8 text-slate-300" />
                        </div>
                        <p>Şablon seçin veya yeni oluşturun.</p>
                        <Button variant="outline" size="sm" onClick={handleAdd}>Yeni Şablon Ekle</Button>
                    </div>
                )}
            </div>

            {/* Add Template Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Yeni Şablon Oluştur</DialogTitle>
                        <DialogDescription>
                            Lütfen oluşturmak istediğiniz şablon için bir başlık belirleyin.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Şablon Adı / Kodu</Label>
                        <Input
                            autoFocus
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            placeholder="Örn: Standart Prosedür"
                            className="mt-2"
                            onKeyDown={(e) => e.key === 'Enter' && confirmAdd()}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>İptal</Button>
                        <Button onClick={confirmAdd}>Oluştur</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


