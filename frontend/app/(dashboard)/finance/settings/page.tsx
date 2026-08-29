"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, FinansHizmet, FinansKategori, FinansKasa } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from "@/components/ui/table";
import {
    Plus, Edit, Trash2, Settings, List,
    Tag, Activity, RefreshCw, Check, X,
    AlertCircle, Save, Wallet, Search,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function FinanceSettingsPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("accounts");

    // --- DIALOG STATES ---
    const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<FinansHizmet | null>(null);

    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<FinansKategori | null>(null);

    const [accountDialogOpen, setAccountDialogOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<FinansKasa | null>(null);
    const [accountType, setAccountType] = useState<string>("NAKIT");

    // --- PAGINATION STATES ---
    const [serviceSearch, setServiceSearch] = useState("");
    const [servicePage, setServicePage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // --- QUERIES ---
    const { data: services, isLoading: servicesLoading } = useQuery({
        queryKey: ['finance-services'],
        queryFn: () => api.finance.getServices(false)
    });

    const { data: categories, isLoading: categoriesLoading } = useQuery({
        queryKey: ['finance-categories'],
        queryFn: () => api.finance.getCategories()
    });

    const { data: accounts, isLoading: accountsLoading } = useQuery({
        queryKey: ['finance-accounts'],
        queryFn: () => api.finance.getAccounts(false)
    });

    // --- FILTERS & PAGINATION LOGIC ---
    const filteredServices = services?.filter(s => {
        if (!s) return false;
        const term = serviceSearch.toLowerCase();
        const nameMatch = s.ad ? s.ad.toLowerCase().includes(term) : false;
        const codeMatch = s.kod ? s.kod.toLowerCase().includes(term) : false;
        return nameMatch || codeMatch;
    }) || [];

    const totalPages = Math.ceil(filteredServices.length / ITEMS_PER_PAGE);
    const paginatedServices = filteredServices.slice(
        (servicePage - 1) * ITEMS_PER_PAGE,
        servicePage * ITEMS_PER_PAGE
    );

    // --- MUTATIONS: SERVICES ---
    const serviceMutation = useMutation({
        mutationFn: (data: any) =>
            selectedService
                ? api.finance.updateService(selectedService.id, data)
                : api.finance.createService(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance-services'] });
            setServiceDialogOpen(false);
            toast.success(selectedService ? 'Hizmet güncellendi' : 'Hizmet oluşturuldu');
        },
        onError: () => toast.error('Hata oluştu')
    });

    const deleteServiceMutation = useMutation({
        mutationFn: (id: string) => api.finance.deleteService(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance-services'] });
            toast.success('Hizmet silindi');
        }
    });

    // --- MUTATIONS: CATEGORIES ---
    const categoryMutation = useMutation({
        mutationFn: (data: any) =>
            selectedCategory
                ? api.finance.updateCategory(selectedCategory.id, data)
                : api.finance.createCategory(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance-categories'] });
            setCategoryDialogOpen(false);
            toast.success(selectedCategory ? 'Kategori güncellendi' : 'Kategori oluşturuldu');
        },
        onError: () => toast.error('Hata oluştu')
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: (id: string) => api.finance.deleteCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance-categories'] });
            toast.success('Kategori silindi');
        }
    });

    // --- MUTATIONS: ACCOUNTS ---
    const accountMutation = useMutation({
        mutationFn: (data: any) =>
            selectedAccount
                ? api.finance.updateAccount(selectedAccount.id, data)
                : api.finance.createAccount(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
            setAccountDialogOpen(false);
            toast.success(selectedAccount ? 'Hesap güncellendi' : 'Hesap oluşturuldu');
        },
        onError: () => toast.error('Hata oluştu')
    });

    const deleteAccountMutation = useMutation({
        mutationFn: (id: string) => api.finance.deleteAccount(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
            toast.success('Hesap silindi');
        }
    });

    // --- HANDLERS ---
    const handleSaveService = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            ad: formData.get('ad') as string,
            kod: formData.get('kod') as string,
            kategori: formData.get('kategori') as string,
            varsayilan_fiyat: parseFloat(formData.get('varsayilan_fiyat') as string || '0'),
            para_birimi: formData.get('para_birimi') as string || 'TRY',
            kdv_orani: parseInt(formData.get('kdv_orani') as string || '10'),
            aktif: formData.get('aktif') === 'on'
        };
        serviceMutation.mutate(data);
    };

    const handleSaveCategory = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            ad: formData.get('ad') as string,
            tip: formData.get('tip') as string,
            renk: formData.get('renk') as string || null,
            aktif: formData.get('aktif') === 'on'
        };
        categoryMutation.mutate(data);
    };

    const handleSaveAccount = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            ad: formData.get('ad') as string,
            tip: formData.get('tip') as string,
            banka_adi: formData.get('banka_adi') as string,
            iban: formData.get('iban') as string,
            para_birimi: formData.get('para_birimi') as string,
            sira_no: parseInt(formData.get('sira_no') as string || '0'),
            aktif: formData.get('aktif') === 'on'
        };
        accountMutation.mutate(data);
    };

    if (servicesLoading || categoriesLoading || accountsLoading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <Settings className="h-7 w-7 text-slate-600" />
                        Finans Ayarları
                    </h1>
                    <p className="text-slate-500 mt-1">Kategori, hizmet, kasa ve sistem tanımları</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-white border p-1 h-12 shadow-sm rounded-xl">
                    <TabsTrigger value="accounts" className="px-6 rounded-lg gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all">
                        <Wallet className="h-4 w-4" /> Hesaplar / Kasalar
                    </TabsTrigger>
                    <TabsTrigger value="services" className="px-6 rounded-lg gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                        <Activity className="h-4 w-4" /> Hizmetler
                    </TabsTrigger>
                    <TabsTrigger value="categories" className="px-6 rounded-lg gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all">
                        <Tag className="h-4 w-4" /> Kategoriler
                    </TabsTrigger>
                </TabsList>

                {/* --- ACCOUNTS TAB --- */}
                <TabsContent value="accounts">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-white border-b border-slate-50 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Kasa ve Hesap Tanımları</CardTitle>
                                <CardDescription>Nakit kasalar, banka hesapları, POS cihazları ve diğer ödeme yöntemleri</CardDescription>
                            </div>
                            <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => { setSelectedAccount(null); setAccountType("NAKIT"); setAccountDialogOpen(true); }}>
                                <Plus className="h-4 w-4 mr-2" /> Yeni Hesap
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>Hesap Adı</TableHead>
                                        <TableHead>Tip</TableHead>
                                        <TableHead>Banka / Detay</TableHead>
                                        <TableHead className="text-right">Bakiye</TableHead>
                                        <TableHead className="text-center">Durum</TableHead>
                                        <TableHead className="w-[100px] text-right">İşlemler</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {accounts?.map((acc) => (
                                        <TableRow key={acc.id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-bold text-slate-800">{acc.ad}</TableCell>
                                            <TableCell>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                    acc.tip === 'NAKIT' && "bg-emerald-100 text-emerald-700",
                                                    acc.tip === 'BANKA' && "bg-blue-100 text-blue-700",
                                                    acc.tip === 'POS' && "bg-orange-100 text-orange-700",
                                                    (acc.tip !== 'NAKIT' && acc.tip !== 'BANKA' && acc.tip !== 'POS') && "bg-slate-100 text-slate-700"
                                                )}>
                                                    {acc.tip === 'NAKIT' && 'ANA KASA'}
                                                    {acc.tip === 'BANKA' && 'BANKA'}
                                                    {acc.tip === 'POS' && 'POS'}
                                                    {acc.tip === 'OZEL_SIGORTA' && 'ÖZEL SİGORTA'}
                                                    {acc.tip === 'ACIK_HESAP' && 'AÇIK HESAP'}
                                                    {acc.tip === 'DIGER' && 'DİĞER'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {acc.banka_adi && <div className="font-medium">{acc.banka_adi}</div>}
                                                {acc.iban && <div className="font-mono text-xs">{acc.iban}</div>}
                                                {!acc.banka_adi && !acc.iban && '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-slate-700 text-lg">
                                                {acc.bakiye?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {acc.para_birimi}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {acc.aktif ? (
                                                    <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                                                ) : (
                                                    <X className="h-4 w-4 text-rose-500 mx-auto" />
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => { setSelectedAccount(acc); setAccountType(acc.tip); setAccountDialogOpen(true); }}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => { if (confirm('Silmek istediğinize emin misiniz?')) deleteAccountMutation.mutate(acc.id); }}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="services">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-white border-b border-slate-50 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-lg">Klinik Hizmetleri</CardTitle>
                                <CardDescription>Hizmet adları, kodlar ve varsayılan fiyatlandırma</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Hizmet ara..."
                                        className="pl-9 w-[200px] h-9"
                                        value={serviceSearch}
                                        onChange={(e) => {
                                            setServiceSearch(e.target.value);
                                            setServicePage(1); // Reset to first page on search
                                        }}
                                    />
                                </div>
                                <Button className="bg-blue-600 hover:bg-blue-700 h-9" onClick={() => { setSelectedService(null); setServiceDialogOpen(true); }}>
                                    <Plus className="h-4 w-4 mr-2" /> Yeni Hizmet
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="w-[80px]">Kod</TableHead>
                                        <TableHead>Hizmet Adı</TableHead>
                                        <TableHead>Kategori</TableHead>
                                        <TableHead className="text-right">Birim Fiyat</TableHead>
                                        <TableHead className="text-center">KDV %</TableHead>
                                        <TableHead className="text-center">Durum</TableHead>
                                        <TableHead className="w-[100px] text-right">İşlemler</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedServices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                                                Kayıt bulunamadı.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedServices.map((service) => (
                                            <TableRow key={service.id} className="hover:bg-slate-50 transition-colors">
                                                <TableCell className="font-mono text-xs text-slate-500 font-bold">{service.kod || '-'}</TableCell>
                                                <TableCell className="font-medium text-slate-900">{service.ad}</TableCell>
                                                <TableCell className="text-slate-500 text-sm">{service.kategori || '-'}</TableCell>
                                                <TableCell className="text-right font-bold text-slate-700">
                                                    {service.varsayilan_fiyat?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                    <span className="text-xs text-slate-400 ml-1">
                                                        {service.para_birimi === 'USD' ? '$' : service.para_birimi === 'EUR' ? '€' : '₺'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center text-slate-500 font-medium">%{service.kdv_orani}</TableCell>
                                                <TableCell className="text-center">
                                                    {service.aktif ? (
                                                        <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                                                    ) : (
                                                        <X className="h-4 w-4 text-rose-500 mx-auto" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => { setSelectedService(service); setServiceDialogOpen(true); }}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => { if (confirm('Silmek istediğinize emin misiniz?')) deleteServiceMutation.mutate(service.id); }}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>

                            {/* Pagination Controls */}
                            {filteredServices && filteredServices.length > ITEMS_PER_PAGE && (
                                <div className="flex items-center justify-between px-4 py-4 border-t border-slate-100 bg-slate-50/50">
                                    <div className="text-xs text-slate-500">
                                        Toplam <strong>{filteredServices.length}</strong> kayıttan <strong>{(servicePage - 1) * ITEMS_PER_PAGE + 1}</strong> - <strong>{Math.min(servicePage * ITEMS_PER_PAGE, filteredServices.length)}</strong> arası gösteriliyor
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setServicePage(p => Math.max(1, p - 1))}
                                            disabled={servicePage === 1}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <div className="text-xs font-bold min-w-[20px] text-center">
                                            {servicePage}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setServicePage(p => Math.min(totalPages, p + 1))}
                                            disabled={servicePage === totalPages}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="categories">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-white border-b border-slate-50 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">İşlem Kategorileri</CardTitle>
                                <CardDescription>Gelir ve gider işlemlerini sınıflandırmak için kullanılır</CardDescription>
                            </div>
                            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setSelectedCategory(null); setCategoryDialogOpen(true); }}>
                                <Plus className="h-4 w-4 mr-2" /> Yeni Kategori
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>Kategori Adı</TableHead>
                                        <TableHead>Tür</TableHead>
                                        <TableHead className="text-center">Renk</TableHead>
                                        <TableHead className="text-center">Durum</TableHead>
                                        <TableHead className="w-[100px] text-right">İşlemler</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categories?.map((cat) => (
                                        <TableRow key={cat.id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-bold text-slate-800">{cat.ad}</TableCell>
                                            <TableCell>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                    cat.tip === 'gelir' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                                )}>
                                                    {cat.tip === 'gelir' ? 'GELİR' : 'GİDER'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {cat.renk && <div className="w-4 h-4 rounded-full mx-auto" style={{ backgroundColor: cat.renk }} />}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {cat.aktif ? (
                                                    <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                                                ) : (
                                                    <X className="h-4 w-4 text-rose-500 mx-auto" />
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => { setSelectedCategory(cat); setCategoryDialogOpen(true); }}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => { if (confirm('Silmek istediğinize emin misiniz?')) deleteCategoryMutation.mutate(cat.id); }}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* SERVICE DIALOG */}
            <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleSaveService}>
                        <DialogHeader>
                            <DialogTitle>{selectedService ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle'}</DialogTitle>
                            <DialogDescription>Hizmet tanımlarını buradan yönetebilirsiniz.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="ad">Hizmet Adı</Label>
                                <Input id="ad" name="ad" defaultValue={selectedService?.ad} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="kod">Hizmet Kodu (Ops)</Label>
                                    <Input id="kod" name="kod" defaultValue={selectedService?.kod} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="kategori">Grup / Kategori</Label>
                                    <Input id="kategori" name="kategori" defaultValue={selectedService?.kategori} placeholder="örn: Muayene, Ameliyat" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="grid gap-2 col-span-2">
                                    <Label htmlFor="varsayilan_fiyat">Varsayılan Fiyat</Label>
                                    <Input id="varsayilan_fiyat" name="varsayilan_fiyat" type="number" step="0.01" defaultValue={selectedService?.varsayilan_fiyat || 0} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="para_birimi">Birim</Label>
                                    <select
                                        id="para_birimi"
                                        name="para_birimi"
                                        defaultValue={selectedService?.para_birimi || 'TRY'}
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="TRY">₺ TL</option>
                                        <option value="USD">$ USD</option>
                                        <option value="EUR">€ EUR</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="kdv_orani">KDV Oranı (%)</Label>
                                <select
                                    id="kdv_orani"
                                    name="kdv_orani"
                                    defaultValue={selectedService?.kdv_orani ?? 10}
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="0">%0</option>
                                    <option value="1">%1</option>
                                    <option value="10">%10</option>
                                    <option value="20">%20</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="aktif" name="aktif" defaultChecked={selectedService?.aktif ?? true} className="h-4 w-4" />
                                <Label htmlFor="aktif">Aktif</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setServiceDialogOpen(false)}>İptal</Button>
                            <Button type="submit" disabled={serviceMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                                {serviceMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="h-4 w-4 mr-2" /> Kaydet
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* CATEGORY DIALOG */}
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleSaveCategory}>
                        <DialogHeader>
                            <DialogTitle>{selectedCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="ad_cat">Kategori Adı</Label>
                                <Input id="ad_cat" name="ad" defaultValue={selectedCategory?.ad} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="tip">Kategori Türü</Label>
                                <select
                                    id="tip"
                                    name="tip"
                                    defaultValue={selectedCategory?.tip || 'gelir'}
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="gelir">Gelir</option>
                                    <option value="gider">Gider</option>
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="renk">Renk (Hex)</Label>
                                <div className="flex gap-2">
                                    <Input id="renk" name="renk" type="color" className="h-10 w-20 p-1" defaultValue={selectedCategory?.renk || '#3b82f6'} />
                                    <Input name="renk_text" value={selectedCategory?.renk || ''} readOnly className="flex-1 font-mono text-xs" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="aktif_cat" name="aktif" defaultChecked={selectedCategory?.aktif ?? true} className="h-4 w-4" />
                                <Label htmlFor="aktif_cat">Aktif</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>İptal</Button>
                            <Button type="submit" disabled={categoryMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                                {categoryMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="h-4 w-4 mr-2" /> Kaydet
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ACCOUNT DIALOG */}
            <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleSaveAccount}>
                        <DialogHeader>
                            <DialogTitle>{selectedAccount ? 'Hesabı Düzenle' : 'Yeni Hesap Ekle'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="ad_acc">Hesap / Kasa Adı</Label>
                                <Input id="ad_acc" name="ad" defaultValue={selectedAccount?.ad} placeholder="örn: Ana Kasa, Garanti POS..." required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="tip_acc">Hesap Tipi</Label>
                                <select
                                    id="tip_acc"
                                    name="tip"
                                    value={accountType}
                                    onChange={(e) => setAccountType(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="NAKIT">Ana Kasa (Nakit)</option>
                                    <option value="POS">POS Cihazı</option>
                                    <option value="BANKA">Banka Hesabı</option>
                                    <option value="OZEL_SIGORTA">Özel Sigorta</option>
                                    <option value="ACIK_HESAP">Açık Hesap</option>
                                    <option value="DIGER">Diğer</option>
                                </select>
                            </div>

                            {(accountType === 'BANKA' || accountType === 'POS') && (
                                <div className="grid gap-2">
                                    <Label htmlFor="banka_adi">Banka Adı</Label>
                                    <Input id="banka_adi" name="banka_adi" defaultValue={selectedAccount?.banka_adi} placeholder="örn: Garanti BBVA" />
                                </div>
                            )}

                            {(accountType === 'BANKA') && (
                                <div className="grid gap-2">
                                    <Label htmlFor="iban">IBAN</Label>
                                    <Input id="iban" name="iban" defaultValue={selectedAccount?.iban} placeholder="TR..." />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="para_birimi">Para Birimi</Label>
                                    <select
                                        id="para_birimi"
                                        name="para_birimi"
                                        defaultValue={selectedAccount?.para_birimi || 'TRY'}
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="TRY">Türk Lirası (₺)</option>
                                        <option value="USD">Amerikan Doları ($)</option>
                                        <option value="EUR">Euro (€)</option>
                                        <option value="GBP">Sterlin (£)</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="sira_no">Sıra No</Label>
                                    <Input id="sira_no" name="sira_no" type="number" defaultValue={selectedAccount?.sira_no || 0} />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="aktif_acc" name="aktif" defaultChecked={selectedAccount?.aktif ?? true} className="h-4 w-4" />
                                <Label htmlFor="aktif_acc">Aktif</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setAccountDialogOpen(false)}>İptal</Button>
                            <Button type="submit" disabled={accountMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                                {accountMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="h-4 w-4 mr-2" /> Kaydet
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
