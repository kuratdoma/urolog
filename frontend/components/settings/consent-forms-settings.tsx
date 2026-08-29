import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ConsentFormItem } from '@/lib/api/consentForms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Upload, FileText, Loader2, Pencil, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export function ConsentFormsSettings() {
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [uploadCategories, setUploadCategories] = useState<string[]>(['']);
    
    // Edit States
    const [editingForm, setEditingForm] = useState<ConsentFormItem | null>(null);
    const [editDisplayName, setEditDisplayName] = useState('');
    const [editCategories, setEditCategories] = useState<string[]>(['']);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Track focused input index for autocomplete suggestions
    const [focusedInput, setFocusedInput] = useState<{ type: 'upload' | 'edit', index: number } | null>(null);

    const { data: forms, isLoading } = useQuery({
        queryKey: ['consent-forms-settings'],
        queryFn: () => api.consentForms.list(),
    });

    const [localForms, setLocalForms] = useState<ConsentFormItem[] | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Keep localForms synchronized with query data
    useEffect(() => {
        if (forms) {
            setLocalForms(forms);
        }
    }, [forms]);

    // Derive existing unique categories from all loaded forms for autocomplete suggestions
    const existingCategories = useMemo(() => {
        if (!forms) return [];
        const allCats = forms.flatMap((f: ConsentFormItem) => 
            f.category ? f.category.split(';').map(c => c.trim()).filter(Boolean) : []
        );
        return [...new Set(allCats)].sort();
    }, [forms]);

    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!file) throw new Error("Dosya seçilmedi");
            if (!displayName) throw new Error("Form adı girilmedi");
            const finalCats = uploadCategories.map(c => c.trim()).filter(Boolean).join(';');
            if (!finalCats) throw new Error("En az bir kategori girilmelidir");
            return api.consentForms.upload(file, displayName, finalCats);
        },
        onSuccess: () => {
            toast.success("Onam formu başarıyla yüklendi");
            queryClient.invalidateQueries({ queryKey: ['consent-forms-settings'] });
            queryClient.invalidateQueries({ queryKey: ['consent-forms'] });
            setFile(null);
            setDisplayName('');
            setUploadCategories(['']);
            
            // Reset file input via DOM because React state doesn't clear the visual text
            const fileInput = document.getElementById('consent-form-file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        },
        onError: (err: any) => {
            toast.error(err.message || "Yükleme sırasında hata oluştu");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.consentForms.delete(id),
        onSuccess: () => {
            toast.success("Onam formu silindi");
            queryClient.invalidateQueries({ queryKey: ['consent-forms-settings'] });
            queryClient.invalidateQueries({ queryKey: ['consent-forms'] });
        },
        onError: (err: any) => {
            toast.error(err.message || "Silme işlemi sırasında hata oluştu");
        }
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingForm) return;
            if (!editDisplayName) throw new Error("Form adı boş olamaz");
            const finalCats = editCategories.map(c => c.trim()).filter(Boolean).join(';');
            if (!finalCats) throw new Error("En az bir kategori girilmelidir");
            return api.consentForms.update(editingForm.id, editDisplayName, finalCats);
        },
        onSuccess: () => {
            toast.success("Onam formu başarıyla güncellendi");
            queryClient.invalidateQueries({ queryKey: ['consent-forms-settings'] });
            queryClient.invalidateQueries({ queryKey: ['consent-forms'] });
            setIsEditDialogOpen(false);
            setEditingForm(null);
        },
        onError: (err: any) => {
            toast.error(err.message || "Güncelleme sırasında hata oluştu");
        }
    });

    const reorderMutation = useMutation({
        mutationFn: (orders: { id: string; order_index: number }[]) => api.consentForms.reorder(orders),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consent-forms-settings'] });
            queryClient.invalidateQueries({ queryKey: ['consent-forms'] });
        },
        onError: (err: any) => {
            toast.error(err.message || "Sıralama güncellenirken hata oluştu");
        }
    });

    const handleMoveUp = (index: number) => {
        if (!localForms || index === 0) return;
        const newForms = [...localForms];
        const temp = newForms[index];
        newForms[index] = newForms[index - 1];
        newForms[index - 1] = temp;
        
        setLocalForms(newForms);
        const orders = newForms.map((f, i) => ({ id: f.id, order_index: i + 1 }));
        reorderMutation.mutate(orders);
    };

    const handleMoveDown = (index: number) => {
        if (!localForms || index === localForms.length - 1) return;
        const newForms = [...localForms];
        const temp = newForms[index];
        newForms[index] = newForms[index + 1];
        newForms[index + 1] = temp;
        
        setLocalForms(newForms);
        const orders = newForms.map((f, i) => ({ id: f.id, order_index: i + 1 }));
        reorderMutation.mutate(orders);
    };

    // HTML5 Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index || !localForms) return;
        
        const reordered = [...localForms];
        const draggedItem = reordered[draggedIndex];
        reordered.splice(draggedIndex, 1);
        reordered.splice(index, 0, draggedItem);
        
        setDraggedIndex(index);
        setLocalForms(reordered);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        if (localForms) {
            const orders = localForms.map((f, i) => ({ id: f.id, order_index: i + 1 }));
            reorderMutation.mutate(orders);
        }
    };

    const handleStartEdit = (form: ConsentFormItem) => {
        setEditingForm(form);
        setEditDisplayName(form.display_name);
        const parsedCats = form.category ? form.category.split(';').map(c => c.trim()).filter(Boolean) : [];
        setEditCategories([...parsedCats, '']);
        setIsEditDialogOpen(true);
    };

    const renderCategoryInputs = (
        cats: string[],
        setCats: React.Dispatch<React.SetStateAction<string[]>>,
        type: 'upload' | 'edit',
        placeholder: string = "Kategori ekle..."
    ) => {
        return (
            <div className="space-y-2">
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {cats.map((cat, index) => {
                        const query = cat.trim().toLowerCase();
                        // Find matching suggestions from existing categories
                        const suggestions = query
                            ? existingCategories.filter(c => 
                                c.toLowerCase().includes(query) && 
                                c.toLowerCase() !== query &&
                                !cats.map(val => val.trim().toLowerCase()).includes(c.toLowerCase())
                              )
                            : [];

                        return (
                            <div key={index} className="flex gap-2 items-center relative">
                                <div className="flex-1 relative">
                                    <Input
                                        placeholder={placeholder}
                                        value={cat}
                                        onChange={(e) => {
                                            const newVal = e.target.value;
                                            const updated = [...cats];
                                            updated[index] = newVal;
                                            // Eğer en sonuncuya yazmaya başlarsa, altına yeni bir tane ekle
                                            if (index === updated.length - 1 && newVal.trim() !== '') {
                                                updated.push('');
                                            }
                                            setCats(updated);
                                        }}
                                        onFocus={() => setFocusedInput({ type, index })}
                                        onBlur={() => {
                                            // Delay onBlur to allow selection from suggestions
                                            setTimeout(() => setFocusedInput(null), 200);
                                        }}
                                        className="h-9"
                                    />
                                    {focusedInput?.type === type && focusedInput?.index === index && suggestions.length > 0 && (
                                        <div className="absolute left-0 right-0 z-50 bg-white border border-slate-200 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                                            {suggestions.map(sug => (
                                                <button
                                                    key={sug}
                                                    type="button"
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors text-slate-700 font-medium"
                                                    onMouseDown={() => {
                                                        const updated = [...cats];
                                                        updated[index] = sug;
                                                        if (index === updated.length - 1) {
                                                            updated.push('');
                                                        }
                                                        setCats(updated);
                                                    }}
                                                >
                                                    {sug}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {index < cats.length - 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-slate-400 hover:text-red-500 shrink-0"
                                        onClick={() => {
                                            const updated = cats.filter((_, i) => i !== index);
                                            if (updated.length === 0 || updated[updated.length - 1] !== '') {
                                                updated.push('');
                                            }
                                            setCats(updated);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Yeni Onam Formu Yükle</CardTitle>
                    <CardDescription>Sisteme yeni bir PDF onam formu ekleyin.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Form Adı</Label>
                            <Input 
                                placeholder="Örn: Mesane taşı ameliyatı" 
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Kategoriler</Label>
                            {renderCategoryInputs(uploadCategories, setUploadCategories, 'upload', "Örn: Mesane")}
                        </div>
                        <div className="space-y-2">
                            <Label>PDF Dosyası</Label>
                            <Input 
                                id="consent-form-file-input"
                                type="file" 
                                accept=".pdf" 
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="cursor-pointer"
                            />
                        </div>
                    </div>
                    <Button 
                        onClick={() => uploadMutation.mutate()} 
                        disabled={uploadMutation.isPending || !file || !displayName || uploadCategories.filter(Boolean).length === 0}
                    >
                        {uploadMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        Yükle
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Mevcut Onam Formları</CardTitle>
                    <CardDescription>Sistemde yüklü olan onam formlarının listesi.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                    ) : (
                        <div className="space-y-2">
                            {(localForms || forms)?.map((form: ConsentFormItem, index: number) => (
                                <div 
                                    key={form.id} 
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors ${
                                        draggedIndex === index ? 'opacity-50 border-dashed border-blue-400 bg-blue-50/30' : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-200/50 rounded text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                                            <GripVertical className="h-4 w-4" />
                                        </div>
                                        <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                                        <div>
                                            <p className="font-medium text-sm text-slate-800">{form.display_name}</p>
                                            <div className="flex flex-wrap gap-1 mt-1 items-center">
                                                {(form.category ? form.category.split(';').map(c => c.trim()).filter(Boolean) : ['Genel']).map(cat => (
                                                    <span key={cat} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                        {cat}
                                                    </span>
                                                ))}
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100 ml-1">
                                                    Kullanım: {form.usage_count || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="flex flex-col gap-0.5 mr-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 text-slate-400 hover:text-slate-700"
                                                onClick={() => handleMoveUp(index)}
                                                disabled={index === 0 || reorderMutation.isPending}
                                                title="Yukarı Taşı"
                                            >
                                                <ArrowUp className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 text-slate-400 hover:text-slate-700"
                                                onClick={() => handleMoveDown(index)}
                                                disabled={index === ((localForms || forms)?.length || 0) - 1 || reorderMutation.isPending}
                                                title="Aşağı Taşı"
                                            >
                                                <ArrowDown className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 h-8 w-8"
                                            onClick={() => handleStartEdit(form)}
                                            title="Düzenle"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                                            onClick={() => {
                                                if (confirm(`${form.display_name} formunu silmek istediğinize emin misiniz?`)) {
                                                    deleteMutation.mutate(form.id);
                                                }
                                            }}
                                            disabled={deleteMutation.isPending}
                                            title="Sil"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {forms?.length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-4">Sistemde kayıtlı onam formu bulunmamaktadır.</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Düzenleme Dialog (Modal) */}
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
                setIsEditDialogOpen(open);
                if (!open) setEditingForm(null);
            }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Onam Formunu Düzenle</DialogTitle>
                        <DialogDescription>
                            Onam formunun adını ve kategorilerini güncelleyin.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-display-name">Form Adı</Label>
                            <Input
                                id="edit-display-name"
                                value={editDisplayName}
                                onChange={(e) => setEditDisplayName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Kategoriler</Label>
                            {renderCategoryInputs(editCategories, setEditCategories, 'edit', "Kategori adı")}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setIsEditDialogOpen(false);
                                setEditingForm(null);
                            }}
                        >
                            İptal
                        </Button>
                        <Button 
                            onClick={() => updateMutation.mutate()} 
                            disabled={updateMutation.isPending || !editDisplayName || editCategories.filter(Boolean).length === 0}
                        >
                            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
