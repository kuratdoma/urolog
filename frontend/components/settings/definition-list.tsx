"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2, Search, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api, Definition } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface DefinitionListProps {
    title: string;
    category: string;
    customGrup?: string;
}

export function DefinitionList({ title, category, customGrup }: DefinitionListProps) {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [newValue, setNewValue] = useState("");

    // Editing states
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAd, setEditAd] = useState("");
    const [editSira, setEditSira] = useState<number | "">(0);

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['definitions', category, customGrup],
        queryFn: () => (api.definitions[category as keyof typeof api.definitions] as any).list(customGrup)
    });

    const createMutation = useMutation({
        mutationFn: (data: Partial<Definition>) => (api.definitions[category as keyof typeof api.definitions] as any).create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['definitions', category] });
            setNewValue("");
            toast.success(`${title} eklendi`);
        },
        onError: () => toast.error(`${title} eklenirken hata oluştu`)
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<Definition> }) =>
            (api.definitions[category as keyof typeof api.definitions] as any).update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['definitions', category] });
            setEditingId(null);
            toast.success(`${title} güncellendi`);
        },
        onError: () => toast.error(`${title} güncellenirken hata oluştu`)
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => (api.definitions[category as keyof typeof api.definitions] as any).delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['definitions', category] });
            toast.success(`${title} silindi`);
        }
    });

    const handleAdd = () => {
        if (!newValue.trim()) return;
        const submitData: Partial<Definition> = { ad: newValue.trim(), aktif: true };
        if (customGrup) {
            submitData.grup = customGrup;
        }
        if (category === 'tetkikTanimlari') {
            const maxSira = items.reduce((max: number, item: Definition) => Math.max(max, (item as any).sira || 0), 0);
            submitData.sira = maxSira + 1;
        }
        createMutation.mutate(submitData);
    };

    const handleSaveEdit = (id: string) => {
        if (!editAd.trim()) return;
        const submitData: Partial<Definition> = { ad: editAd.trim() };
        if (customGrup) submitData.grup = customGrup;
        if (category === 'tetkikTanimlari') {
            submitData.sira = typeof editSira === 'number' ? editSira : 0;
        }
        updateMutation.mutate({ id, data: submitData });
    };

    const startEditing = (item: Definition) => {
        setEditingId(item.id);
        setEditAd(item.ad);
        setEditSira(item.sira || 0);
    };

    const sortedItems = [...items].sort((a, b) => {
        if (category === 'tetkikTanimlari') {
            const siraA = a.sira || 0;
            const siraB = b.sira || 0;
            if (siraA !== siraB) return siraA - siraB;
        }
        return a.ad.localeCompare(b.ad);
    });

    const filteredItems = sortedItems.filter(item =>
        item.ad.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="p-8 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Yükleniyor...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder={`${title} ara...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-slate-50 border-slate-200"
                    />
                </div>
            </div>

            <div className="flex gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100 ring-4 ring-blue-50/20">
                <Input
                    placeholder={`Yeni ${title} ekle...`}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    className="bg-white border-blue-200 focus:ring-blue-500 flex-1"
                />
                <Button onClick={handleAdd} disabled={createMutation.isPending || !newValue.trim()}>
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Ekle
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredItems.map((item) => (
                    <div
                        key={item.id}
                        className="group flex flex-col justify-center p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-sm transition-all"
                    >
                        {editingId === item.id ? (
                            <div className="flex items-center gap-2 w-full">
                                {category === 'tetkik_tanimlari' && (
                                    <Input
                                        type="number"
                                        value={editSira}
                                        onChange={(e) => setEditSira(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="w-16 h-8 text-sm"
                                        placeholder="Sıra"
                                    />
                                )}
                                <Input
                                    value={editAd}
                                    onChange={(e) => setEditAd(e.target.value)}
                                    className="flex-1 h-8 text-sm"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(item.id)}
                                />
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => handleSaveEdit(item.id)}
                                        disabled={updateMutation.isPending || !editAd.trim()}
                                    >
                                        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                        onClick={() => setEditingId(null)}
                                        disabled={updateMutation.isPending}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                    {category === 'tetkik_tanimlari' && (
                                        <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                            {item.sira || 0}
                                        </span>
                                    )}
                                    <span className="text-sm font-medium text-slate-700">{item.ad}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                        onClick={() => startEditing(item)}
                                        disabled={deleteMutation.isPending}
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-red-500"
                                        onClick={() => deleteMutation.mutate(item.id)}
                                        disabled={deleteMutation.isPending}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {filteredItems.length === 0 && (
                    <div className="col-span-full py-8 text-center text-slate-400 italic text-sm border-2 border-dashed border-slate-100 rounded-xl">
                        Kayıt bulunamadı.
                    </div>
                )}
            </div>
        </div>
    );
}
