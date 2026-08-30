import { useState, useEffect } from "react";
import { Plus, Trash2, FileSignature } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ReceteSablonu } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DrugItem {
    name: string;
    boxQty: string;
    dose: string;
    period: string;
    usage: string;
    description: string;
}

export function PrescriptionTemplateSettings() {
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Fetch Templates
    const { data: templates = [], isLoading } = useQuery({
        queryKey: ['definitions', 'recete-sablonlari'],
        queryFn: () => api.definitions.receteSablonlari.list(),
    });

    // Temp state for adding a drug in the editor
    const [newDrug, setNewDrug] = useState<DrugItem>({
        name: "",
        boxQty: "1",
        dose: "1x1",
        period: "",
        usage: "Tok",
        description: ""
    });

    // Dose split state for UI
    const [dose1, setDose1] = useState("1");
    const [dose2, setDose2] = useState("1");

    useEffect(() => {
        setNewDrug(prev => ({ ...prev, dose: `${dose1}x${dose2}` }));
    }, [dose1, dose2]);

    // Auto-select first template
    useEffect(() => {
        if (templates.length > 0 && !selectedId) {
            setSelectedId(templates[0].id);
        }
    }, [templates, selectedId]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (name: string) => api.definitions.receteSablonlari.create({ ad: name, icerik: "[]", aktif: true }),
        onSuccess: (newItem) => {
            queryClient.invalidateQueries({ queryKey: ['definitions', 'recete-sablonlari'] });
            setSelectedId(newItem.id);
            toast.success("Yeni şablon oluşturuldu");
        }
    });

    const updateMutation = useMutation({
        mutationFn: (params: { id: string, data: Partial<ReceteSablonu> }) =>
            api.definitions.receteSablonlari.update(params.id, params.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['definitions', 'recete-sablonlari'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.definitions.receteSablonlari.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['definitions', 'recete-sablonlari'] });
            setSelectedId(null);
            toast.success("Şablon silindi");
        }
    });

    const handleUpdateName = (id: string, name: string) => {
        updateMutation.mutate({ id, data: { ad: name } });
    };

    const handleAddDrug = () => {
        if (!selectedId || !newDrug.name) return;
        const currentTemplate = templates.find(t => t.id === selectedId);
        if (!currentTemplate) return;

        let drugs: DrugItem[] = [];
        try {
            drugs = JSON.parse(currentTemplate.icerik);
            if (!Array.isArray(drugs)) drugs = [];
        } catch (e) {
            drugs = [];
        }

        const updatedDrugs = [...drugs, newDrug];
        updateMutation.mutate({ id: selectedId, data: { icerik: JSON.stringify(updatedDrugs) } });

        setNewDrug({ name: "", boxQty: "1", dose: `1x1`, period: "", usage: "Tok", description: "" });
        setDose1("1");
        setDose2("1");
        toast.success("İlaç eklendi");
    };

    const handleRemoveDrug = (drugIndex: number) => {
        if (!selectedId) return;
        const currentTemplate = templates.find(t => t.id === selectedId);
        if (!currentTemplate) return;

        let drugs: DrugItem[] = [];
        try {
            drugs = JSON.parse(currentTemplate.icerik);
        } catch (e) { }

        const updatedDrugs = drugs.filter((_, i) => i !== drugIndex);
        updateMutation.mutate({ id: selectedId, data: { icerik: JSON.stringify(updatedDrugs) } });
    };

    const handleAddTemplate = () => {
        createMutation.mutate("Yeni Şablon");
    };

    const handleDeleteTemplate = (id: string) => {
        if (confirm("Bu şablonu silmek istediğinize emin misiniz?")) {
            deleteMutation.mutate(id);
        }
    };

    const selectedTemplate = templates.find(t => t.id === selectedId);
    let currentDrugs: DrugItem[] = [];
    if (selectedTemplate) {
        try {
            currentDrugs = JSON.parse(selectedTemplate.icerik);
            if (!Array.isArray(currentDrugs)) currentDrugs = [];
        } catch (e) { }
    }

    if (isLoading) return <div className="p-8 text-center text-slate-400">Yükleniyor...</div>;

    return (
        <div className="grid grid-cols-12 gap-6 h-[600px]">
            {/* Template List */}
            <div className="col-span-4 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Şablonlar</h3>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-emerald-50 hover:text-emerald-600" onClick={handleAddTemplate}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {templates.map(tmp => (
                        <button
                            key={tmp.id}
                            onClick={() => setSelectedId(tmp.id)}
                            className={cn(
                                "w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-3",
                                selectedId === tmp.id ? "bg-white shadow-sm ring-1 ring-slate-200 text-slate-900" : "text-slate-500 hover:bg-slate-100/50"
                            )}
                        >
                            <FileSignature className={cn("w-4 h-4", selectedId === tmp.id ? "text-emerald-500" : "text-slate-400")} />
                            <span className="truncate">{tmp.ad || "İsimsiz Şablon"}</span>
                            <span className="text-xs text-slate-300 ml-auto">{JSON.parse(tmp.icerik || '[]').length} ilaç</span>
                        </button>
                    ))}
                    {templates.length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400 italic">
                            Henüz şablon eklenmemiş.
                        </div>
                    )}
                </div>
            </div>

            {/* Template Editor */}
            <div className="col-span-8">
                {selectedTemplate ? (
                    <Card className="h-full border-slate-200 shadow-sm flex flex-col">
                        <div className="flex-1 p-6 space-y-6 flex flex-col h-full overflow-hidden">
                            {/* Header */}
                            <div className="space-y-4 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <FileSignature className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-[10px] uppercase text-slate-400 font-bold">Şablon Adı</Label>
                                        <Input
                                            value={selectedTemplate.ad}
                                            onChange={(e) => handleUpdateName(selectedTemplate.id, e.target.value)}
                                            className="font-bold border-none shadow-none text-lg px-0 h-8 focus-visible:ring-0"
                                            placeholder="Şablon Adı"
                                        />
                                    </div>
                                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteTemplate(selectedTemplate.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Drug List Table */}
                            <div className="flex-1 overflow-auto rounded-lg border border-slate-100 bg-white shadow-sm">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0">
                                        <TableRow className="uppercase text-[10px] tracking-wider hover:bg-slate-50">
                                            <TableHead className="w-8">#</TableHead>
                                            <TableHead>İlaç Adı</TableHead>
                                            <TableHead className="text-center">Doz</TableHead>
                                            <TableHead className="text-center">Kutu</TableHead>
                                            <TableHead>Periyod</TableHead>
                                            <TableHead>Kullanım</TableHead>
                                            <TableHead className="w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentDrugs.map((drug, idx) => (
                                            <TableRow key={idx} className="text-xs">
                                                <TableCell className="text-slate-400 font-mono">{idx + 1}</TableCell>
                                                <TableCell className="font-bold">{drug.name}</TableCell>
                                                <TableCell className="text-center font-mono">{drug.dose}</TableCell>
                                                <TableCell className="text-center font-mono">{drug.boxQty}</TableCell>
                                                <TableCell>{drug.period}</TableCell>
                                                <TableCell>{drug.usage}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-500" onClick={() => handleRemoveDrug(idx)}>
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {currentDrugs.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-24 text-center text-slate-400 text-xs italic">
                                                    Bu şablonda ilaç yok. Aşağıdan ekleyin.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Add Drug Form */}
                            <div className=" pt-4 border-t border-slate-100 bg-slate-50/50 p-4 rounded-lg">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Plus className="w-3 h-3" /> İlaç Ekle
                                </h4>
                                <div className="grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-4 space-y-1">
                                        <Label className="text-[10px]">İlaç Adı</Label>
                                        <Input
                                            value={newDrug.name}
                                            onChange={e => setNewDrug({ ...newDrug, name: e.target.value })}
                                            className="h-8 text-xs bg-white"
                                            placeholder="İlaç Adı..."
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-[10px] text-center w-full block">Doz</Label>
                                        <div className="flex items-center gap-1">
                                            <Input
                                                value={dose1}
                                                onChange={e => setDose1(e.target.value)}
                                                className="h-8 text-xs text-center p-0 bg-white"
                                                placeholder="1"
                                            />
                                            <span className="text-xs text-slate-400">x</span>
                                            <Input
                                                value={dose2}
                                                onChange={e => setDose2(e.target.value)}
                                                className="h-8 text-xs text-center p-0 bg-white"
                                                placeholder="1"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-1 space-y-1">
                                        <Label className="text-[10px] text-center w-full block">Kutu</Label>
                                        <Input
                                            value={newDrug.boxQty}
                                            onChange={e => setNewDrug({ ...newDrug, boxQty: e.target.value })}
                                            className="h-8 text-xs text-center bg-white"
                                            placeholder="1"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-[10px]">Periyod (Süre)</Label>
                                        <Input
                                            value={newDrug.period}
                                            onChange={e => setNewDrug({ ...newDrug, period: e.target.value })}
                                            className="h-8 text-xs bg-white"
                                            placeholder="Süre"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-[10px]">Kullanım</Label>
                                        <Input
                                            value={newDrug.usage}
                                            onChange={e => setNewDrug({ ...newDrug, usage: e.target.value })}
                                            className="h-8 text-xs bg-white"
                                            placeholder="Tok"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Button
                                            onClick={handleAddDrug}
                                            disabled={!newDrug.name}
                                            className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        Şablon seçin veya yeni oluşturun.
                    </div>
                )}
            </div>
        </div>
    );
}
