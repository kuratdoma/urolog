'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ConsentFormItem } from '@/lib/api/consentForms';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    FileText,
    Search,
    Printer,
    Loader2,
    Clock,
    User,
    Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

interface ConsentFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientId: string;
    patientName: string;
    patientDoctor?: string;
}

const formatFormName = (name: string) => {
    if (!name) return '';
    const lowerCase = name.slice(1)
        .replace(/I/g, 'ı')
        .replace(/İ/g, 'i')
        .toLocaleLowerCase('tr-TR');
    
    const upperCaseFirst = name.charAt(0)
        .replace(/i/g, 'İ')
        .replace(/ı/g, 'I')
        .toLocaleUpperCase('tr-TR');

    return upperCaseFirst + lowerCase;
};

// Kategori renkleri
const CATEGORY_COLORS: Record<string, string> = {
    'Böbrek & Üreter': 'bg-amber-100 text-amber-700 border-amber-200',
    'Mesane': 'bg-blue-100 text-blue-700 border-blue-200',
    'Prostat': 'bg-purple-100 text-purple-700 border-purple-200',
    'Penis & Üretra': 'bg-teal-100 text-teal-700 border-teal-200',
    'Testis & Skrotal': 'bg-green-100 text-green-700 border-green-200',
    'Kadın Üroloji': 'bg-pink-100 text-pink-700 border-pink-200',
    'Onkoloji & İleri Cerrahi': 'bg-red-100 text-red-700 border-red-200',
    'Girişimsel & Tanısal': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Androloji': 'bg-orange-100 text-orange-700 border-orange-200',
    'Genel': 'bg-slate-100 text-slate-700 border-slate-200',
};

export function ConsentFormDialog({
    open,
    onOpenChange,
    patientId,
    patientName,
    patientDoctor,
}: ConsentFormDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
    const [selectedDoktorId, setSelectedDoktorId] = useState<string>('');
    const [tarih, setTarih] = useState(format(new Date(), 'dd/MM/yyyy'));
    const [saat, setSaat] = useState(format(new Date(), 'HH:mm'));
    const [isPrinting, setIsPrinting] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Fetch consent forms list
    const { data: forms, isLoading: formsLoading } = useQuery({
        queryKey: ['consent-forms'],
        queryFn: () => api.consentForms.list(),
        enabled: open,
    });

    // Fetch doctors
    const { data: doktorlar } = useQuery({
        queryKey: ['doktorlar-list'],
        queryFn: () => api.definitions.doktorlar.list(),
        enabled: open,
    });

    // Set default doctor when dialog opens
    useEffect(() => {
        if (open && doktorlar && doktorlar.length > 0 && !selectedDoktorId) {
            // Try to match patient's assigned doctor
            if (patientDoctor) {
                const matched = doktorlar.find(
                    (d: any) => d.ad_soyad === patientDoctor
                );
                if (matched) {
                    setSelectedDoktorId(String(matched.id));
                    return;
                }
            }
            // Default to first doctor
            setSelectedDoktorId(String(doktorlar[0].id));
        }
    }, [open, doktorlar, patientDoctor]);

    // Reset on close
    useEffect(() => {
        if (!open) {
            setSelectedFormId(null);
            setSearchQuery('');
            setSelectedCategory('all');
            setTarih(format(new Date(), 'dd/MM/yyyy'));
            setSaat(format(new Date(), 'HH:mm'));
        }
    }, [open]);

    // Categories derived from forms (handling multiple semicolon-separated categories)
    const categories = useMemo(() => {
        if (!forms) return [];
        const allCats = forms.flatMap((f: ConsentFormItem) => 
            f.category ? f.category.split(';').map(c => c.trim()).filter(Boolean) : []
        );
        const cats = [...new Set(allCats)];
        cats.sort();
        if (cats.includes('Androloji')) {
            const idx = cats.indexOf('Androloji');
            cats.splice(idx, 1);
            cats.unshift('Androloji');
        }
        return cats;
    }, [forms]);

    // Filtered forms
    const filteredForms = useMemo(() => {
        if (!forms) return [];
        return forms.filter((f: ConsentFormItem) => {
            const matchesSearch =
                searchQuery === '' ||
                f.display_name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase());
            
            const formCats = f.category ? f.category.split(';').map(c => c.trim()).filter(Boolean) : ['Genel'];
            const matchesCategory =
                selectedCategory === 'all' || formCats.includes(selectedCategory);
            
            return matchesSearch && matchesCategory;
        });
    }, [forms, searchQuery, selectedCategory]);

    // Group by category
    const groupedForms = useMemo(() => {
        const groups: Record<string, ConsentFormItem[]> = {};
        for (const form of filteredForms) {
            const cats = form.category ? form.category.split(';').map(c => c.trim()).filter(Boolean) : ['Genel'];
            for (const cat of cats) {
                // If we are filtering by a specific category, only include this form under that category group
                if (selectedCategory !== 'all' && cat !== selectedCategory) {
                    continue;
                }
                if (!groups[cat]) {
                    groups[cat] = [];
                }
                // Avoid adding the duplicate form to the same category group
                if (!groups[cat].some(f => f.id === form.id)) {
                    groups[cat].push(form);
                }
            }
        }
        return groups;
    }, [filteredForms, selectedCategory]);

    const handlePrint = async () => {
        if (!selectedFormId) {
            toast.error('Lütfen bir onam formu seçin');
            return;
        }

        setIsPrinting(true);
        try {
            await api.consentForms.preview(selectedFormId, patientId, {
                doktorId: selectedDoktorId
                    ? Number(selectedDoktorId)
                    : undefined,
                tarih,
                saat,
            });
            toast.success('Onam formu yeni sekmede açıldı');
        } catch (error: any) {
            toast.error(error.message || 'Onam formu oluşturulamadı');
        } finally {
            setIsPrinting(false);
        }
    };

    const selectedForm = forms?.find(
        (f: ConsentFormItem) => f.id === selectedFormId
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[70vw] max-w-[70vw] sm:max-w-[70vw] h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Onam Formu Yazdır
                    </DialogTitle>
                    <DialogDescription>
                        <span className="font-medium text-slate-800">
                            {patientName}
                        </span>{' '}
                        için onam formu seçin ve yazdırın
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-4 flex-1 overflow-hidden">
                    {/* Sol: Form Listesi */}
                    <div className="flex-1 flex flex-col gap-3 min-w-0">
                        {/* Arama */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Onam formu ara..."
                                value={searchQuery}
                                onChange={(e) =>
                                    setSearchQuery(e.target.value)
                                }
                                className="pl-9"
                                id="consent-form-search"
                            />
                        </div>

                        {/* Kategori Filtresi */}
                        <div className="flex gap-1.5 flex-wrap">
                            <Badge
                                variant={
                                    selectedCategory === 'all'
                                        ? 'default'
                                        : 'outline'
                                }
                                className="cursor-pointer text-xs"
                                onClick={() => setSelectedCategory('all')}
                            >
                                Tümü ({forms?.length || 0})
                            </Badge>
                            {categories.map((cat) => (
                                <Badge
                                    key={cat}
                                    variant={
                                        selectedCategory === cat
                                            ? 'default'
                                            : 'outline'
                                    }
                                    className={`cursor-pointer text-xs ${
                                        selectedCategory !== cat
                                            ? CATEGORY_COLORS[cat] || ''
                                            : ''
                                    }`}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat}
                                </Badge>
                            ))}
                        </div>

                        {/* Form Listesi */}
                        <ScrollArea className="flex-1 border rounded-lg h-full overflow-y-auto">
                            {formsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                </div>
                            ) : filteredForms.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 text-sm">
                                    Sonuç bulunamadı
                                </div>
                            ) : (
                                <div className="p-2 space-y-3">
                                    {Object.entries(groupedForms)
                                        .sort(([catA], [catB]) => {
                                            if (catA === 'Androloji') return -1;
                                            if (catB === 'Androloji') return 1;
                                            return catA.localeCompare(catB);
                                        })
                                        .map(([category, catForms]) => (
                                            <div key={category}>
                                                <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                                    {category}
                                                </div>
                                                <div className="space-y-0.5">
                                                    {catForms.map((form) => (
                                                        <button
                                                            key={form.id}
                                                            onClick={() =>
                                                                setSelectedFormId(
                                                                    form.id
                                                                )
                                                            }
                                                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                                                selectedFormId ===
                                                                form.id
                                                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                                    : 'hover:bg-slate-50 text-slate-700'
                                                            }`}
                                                            id={`consent-form-${form.id}`}
                                                        >
                                                            <FileText className="inline-block h-3.5 w-3.5 mr-2 opacity-50" />
                                                            {formatFormName(form.display_name)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Sağ: Seçenekler ve Yazdır */}
                    <div className="w-56 flex flex-col gap-4 shrink-0">
                        {/* Doktor Seçimi */}
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="consent-doctor"
                                className="text-xs font-medium flex items-center gap-1"
                            >
                                <User className="h-3.5 w-3.5" />
                                Doktor
                            </Label>
                            <Select
                                value={selectedDoktorId}
                                onValueChange={setSelectedDoktorId}
                            >
                                <SelectTrigger
                                    id="consent-doctor"
                                    className="h-9 text-sm"
                                >
                                    <SelectValue placeholder="Doktor seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {doktorlar?.map((d: any) => (
                                        <SelectItem
                                            key={d.id}
                                            value={String(d.id)}
                                        >
                                            {d.ad_soyad}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Tarih */}
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="consent-date"
                                className="text-xs font-medium flex items-center gap-1"
                            >
                                <Calendar className="h-3.5 w-3.5" />
                                Tarih
                            </Label>
                            <Input
                                id="consent-date"
                                value={tarih}
                                onChange={(e) => setTarih(e.target.value)}
                                placeholder="GG/AA/YYYY"
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* Saat */}
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="consent-time"
                                className="text-xs font-medium flex items-center gap-1"
                            >
                                <Clock className="h-3.5 w-3.5" />
                                Saat
                            </Label>
                            <Input
                                id="consent-time"
                                type="time"
                                value={saat}
                                onChange={(e) => setSaat(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* Seçilen Form Bilgisi */}
                        {selectedForm && (
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                <p className="text-xs text-blue-600 font-medium mb-1">
                                    Seçilen Form
                                </p>
                                <p className="text-sm text-blue-800 font-semibold leading-tight">
                                    {formatFormName(selectedForm.display_name)}
                                </p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {(selectedForm.category ? selectedForm.category.split(';').map(c => c.trim()).filter(Boolean) : ['Genel']).map(cat => (
                                        <Badge
                                            key={cat}
                                            variant="outline"
                                            className={`text-[10px] ${
                                                CATEGORY_COLORS[cat] || ''
                                            }`}
                                        >
                                            {cat}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Yazdır Butonu */}
                        <Button
                            onClick={handlePrint}
                            disabled={!selectedFormId || isPrinting}
                            className="w-full"
                            id="consent-form-print-btn"
                        >
                            {isPrinting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Printer className="h-4 w-4 mr-2" />
                            )}
                            Önizle & Yazdır
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
