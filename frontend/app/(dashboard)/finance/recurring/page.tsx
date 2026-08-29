'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
    ArrowLeft, Plus, RefreshCw, Repeat, Play, Power, Pencil, CalendarClock, Info
} from 'lucide-react';
import { api, DuzenliGider, FinansKategori, Firma } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(amount || 0);

const formatDate = (value?: string | null) => {
    if (!value) return '—';
    try {
        return format(parseISO(value), 'd MMM yyyy', { locale: tr });
    } catch {
        return value;
    }
};

const PERIYOT_ETIKET: Record<string, string> = { aylik: 'Aylık', yillik: 'Yıllık' };

export default function RecurringExpensesPage() {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<DuzenliGider | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const { data: sablonlar, isLoading } = useQuery({
        queryKey: ['recurring-expenses'],
        queryFn: () => api.finance.getRecurringExpenses(false),
    });

    const { data: bekleyen } = useQuery({
        queryKey: ['recurring-pending'],
        queryFn: () => api.finance.getPendingRecurring(),
    });

    const { data: kategoriler } = useQuery({
        queryKey: ['finance-categories', 'gider'],
        queryFn: () => api.finance.getCategories('gider'),
    });

    const { data: firmalar } = useQuery({
        queryKey: ['finance-companies'],
        queryFn: () => api.finance.getCompanies(),
    });

    const bekleyenAdet = bekleyen?.reduce((t, b) => t + b.adet, 0) ?? 0;
    const bekleyenTutar = bekleyen?.reduce((t, b) => t + b.toplam_tutar, 0) ?? 0;

    const yenile = () => {
        queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
        queryClient.invalidateQueries({ queryKey: ['recurring-pending'] });
    };

    const saveMutation = useMutation({
        mutationFn: (data: any) =>
            editing
                ? api.finance.updateRecurringExpense(editing.id, data)
                : api.finance.createRecurringExpense(data),
        onSuccess: () => {
            yenile();
            setDialogOpen(false);
            toast.success(editing ? 'Şablon güncellendi' : 'Şablon oluşturuldu');
        },
        onError: (e: Error) => toast.error(e.message || 'Kaydedilemedi'),
    });

    // Aktif şablon pasife alınır (delete = soft), pasif olan yeniden aktifleştirilir.
    // İki uç farklı tip döndüğü için dönüş değeri kullanılmıyor.
    const toggleMutation = useMutation<void, Error, DuzenliGider>({
        mutationFn: async (s: DuzenliGider) => {
            if (s.aktif) {
                await api.finance.deleteRecurringExpense(s.id);
            } else {
                await api.finance.updateRecurringExpense(s.id, { aktif: true });
            }
        },
        onSuccess: () => {
            yenile();
            toast.success('Şablon durumu güncellendi');
        },
        onError: (e: Error) => toast.error(e.message || 'Güncellenemedi'),
    });

    const generateMutation = useMutation({
        mutationFn: () => api.finance.generateRecurring(),
        onSuccess: (sonuc) => {
            yenile();
            setConfirmOpen(false);
            toast.success(
                sonuc.adet
                    ? `${sonuc.adet} gider kaydı oluşturuldu (${formatCurrency(sonuc.toplam_tutar)})`
                    : 'Oluşturulacak yeni dönem yok'
            );
        },
        onError: (e: Error) => toast.error(e.message || 'Üretim başarısız'),
    });

    const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const kategori = fd.get('kategori_id') as string;
        const firma = fd.get('firma_id') as string;
        saveMutation.mutate({
            ad: fd.get('ad') as string,
            tutar: parseFloat(fd.get('tutar') as string),
            periyot: fd.get('periyot') as string,
            ayin_gunu: parseInt(fd.get('ayin_gunu') as string) || 1,
            baslangic_tarihi: fd.get('baslangic_tarihi') as string,
            bitis_tarihi: (fd.get('bitis_tarihi') as string) || null,
            kategori_id: kategori ? Number(kategori) : null,
            firma_id: firma ? Number(firma) : null,
            aciklama: (fd.get('aciklama') as string) || null,
        });
    };

    const openNew = () => { setEditing(null); setDialogOpen(true); };
    const openEdit = (s: DuzenliGider) => { setEditing(s); setDialogOpen(true); };

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/finance">
                        <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Repeat className="h-6 w-6 text-indigo-600" />
                            Düzenli Giderler
                        </h1>
                        <p className="text-slate-500 text-sm">Kira, maaş, abonelik gibi tekrar eden giderler</p>
                    </div>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openNew}>
                    <Plus className="h-4 w-4 mr-2" /> Yeni Şablon
                </Button>
            </div>

            {/* Bekleyen üretim */}
            <Card className={cn("mb-6", bekleyenAdet > 0 ? "border-amber-300 bg-amber-50" : "border-slate-200")}>
                <CardContent className="py-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3">
                            <CalendarClock className={cn("h-5 w-5 mt-0.5", bekleyenAdet > 0 ? "text-amber-600" : "text-slate-400")} />
                            <div>
                                {bekleyenAdet > 0 ? (
                                    <>
                                        <p className="font-semibold text-amber-900">
                                            {bekleyenAdet} dönem oluşturulmayı bekliyor — toplam {formatCurrency(bekleyenTutar)}
                                        </p>
                                        <ul className="mt-1 space-y-0.5 text-xs text-amber-800">
                                            {bekleyen!.map(b => (
                                                <li key={b.sablon_id}>
                                                    {b.ad}: {b.adet} dönem ({b.donemler.map(d => formatDate(d)).join(', ')})
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                ) : (
                                    <p className="text-sm text-slate-600">Oluşturulmayı bekleyen dönem yok.</p>
                                )}
                            </div>
                        </div>
                        {bekleyenAdet > 0 && (
                            <Button
                                className="bg-amber-600 hover:bg-amber-700"
                                onClick={() => setConfirmOpen(true)}
                                disabled={generateMutation.isPending}
                            >
                                <Play className="h-4 w-4 mr-2" /> Bekleyenleri Oluştur
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Bilgi notu */}
            <Card className="mb-6 border-slate-200">
                <CardContent className="py-3">
                    <div className="flex gap-2 text-xs text-slate-600">
                        <Info className="h-4 w-4 shrink-0 text-slate-400" />
                        <p>
                            Üretim otomatik değildir — bu sayfadan siz tetiklersiniz. Oluşan gider kayıtları
                            <span className="font-medium"> bekliyor</span> durumundadır ve ödeme içermez;
                            kasa bakiyesi ancak ödemeyi girdiğinizde değişir. Aynı dönem iki kez oluşturulmaz.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Şablon listesi */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Şablonlar</CardTitle>
                    <CardDescription>Pasif şablonlardan yeni dönem üretilmez</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : !sablonlar || sablonlar.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                            <Repeat className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Henüz düzenli gider şablonu yok</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-y bg-slate-50 text-left text-slate-500">
                                        <th className="p-3 font-medium">Ad</th>
                                        <th className="p-3 font-medium">Periyot</th>
                                        <th className="p-3 font-medium">Başlangıç</th>
                                        <th className="p-3 font-medium">Son üretim</th>
                                        <th className="p-3 font-medium text-right">Tutar</th>
                                        <th className="p-3 font-medium text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sablonlar.map(s => (
                                        <tr key={s.id} className={cn("border-b last:border-0", !s.aktif && "opacity-50")}>
                                            <td className="p-3">
                                                <span className="font-medium text-slate-900">{s.ad}</span>
                                                {!s.aktif && (
                                                    <Badge variant="secondary" className="ml-2 text-[10px]">Pasif</Badge>
                                                )}
                                                {s.aciklama && (
                                                    <p className="text-xs text-slate-400 mt-0.5">{s.aciklama}</p>
                                                )}
                                            </td>
                                            <td className="p-3 text-slate-600">
                                                {PERIYOT_ETIKET[s.periyot] || s.periyot}
                                                <span className="text-slate-400"> · ayın {s.ayin_gunu}. günü</span>
                                            </td>
                                            <td className="p-3 text-slate-600">{formatDate(s.baslangic_tarihi)}</td>
                                            <td className="p-3 text-slate-600">{formatDate(s.son_uretilen_donem)}</td>
                                            <td className="p-3 text-right font-semibold text-slate-900">
                                                {formatCurrency(s.tutar)}
                                            </td>
                                            <td className="p-3 text-right whitespace-nowrap">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                                                    <Pencil className="h-4 w-4 text-slate-400" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    title={s.aktif ? 'Pasife al' : 'Aktifleştir'}
                                                    onClick={() => toggleMutation.mutate(s)}
                                                >
                                                    <Power className={cn("h-4 w-4", s.aktif ? "text-emerald-500" : "text-slate-300")} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Şablon formu */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Şablonu Düzenle' : 'Yeni Düzenli Gider'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <Label htmlFor="ad">Ad</Label>
                            <Input id="ad" name="ad" defaultValue={editing?.ad} placeholder="örn: Klinik kirası" required className="mt-1" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="tutar">Tutar (₺)</Label>
                                <Input id="tutar" name="tutar" type="number" step="0.01" min="0.01"
                                    defaultValue={editing?.tutar} required className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="periyot">Periyot</Label>
                                <select id="periyot" name="periyot" defaultValue={editing?.periyot || 'aylik'}
                                    className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
                                    <option value="aylik">Aylık</option>
                                    <option value="yillik">Yıllık</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label htmlFor="ayin_gunu">Ayın günü</Label>
                                <Input id="ayin_gunu" name="ayin_gunu" type="number" min="1" max="31"
                                    defaultValue={editing?.ayin_gunu || 1} className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="baslangic_tarihi">Başlangıç</Label>
                                <Input id="baslangic_tarihi" name="baslangic_tarihi" type="date"
                                    defaultValue={editing?.baslangic_tarihi || format(new Date(), 'yyyy-MM-dd')}
                                    required className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="bitis_tarihi">Bitiş (ops.)</Label>
                                <Input id="bitis_tarihi" name="bitis_tarihi" type="date"
                                    defaultValue={editing?.bitis_tarihi || ''} className="mt-1" />
                            </div>
                        </div>
                        <p className="-mt-2 text-xs text-slate-500">
                            Ayın 31&apos;i seçilirse kısa aylarda ayın son gününe kaydırılır.
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="kategori_id">Kategori</Label>
                                <select id="kategori_id" name="kategori_id" defaultValue={editing?.kategori_id ?? ''}
                                    className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
                                    <option value="">Seçilmedi</option>
                                    {kategoriler?.map((k: FinansKategori) => (
                                        <option key={k.id} value={k.id}>{k.ad}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label htmlFor="firma_id">Firma</Label>
                                <select id="firma_id" name="firma_id" defaultValue={editing?.firma_id ?? ''}
                                    className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
                                    <option value="">Seçilmedi</option>
                                    {firmalar?.map((f: Firma) => (
                                        <option key={f.id} value={f.id}>{f.ad}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="aciklama">Açıklama</Label>
                            <Input id="aciklama" name="aciklama" defaultValue={editing?.aciklama || ''}
                                placeholder="Gider kaydında görünecek metin" className="mt-1" />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Vazgeç</Button>
                            <Button type="submit" disabled={saveMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                                {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Üretim onayı */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bekleyen Giderleri Oluştur</DialogTitle>
                        <DialogDescription>
                            {bekleyenAdet} adet gider kaydı oluşturulacak, toplam {formatCurrency(bekleyenTutar)}.
                            Kayıtlar &ldquo;bekliyor&rdquo; durumunda açılır; kasa bakiyesi etkilenmez.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>Vazgeç</Button>
                        <Button
                            className="bg-amber-600 hover:bg-amber-700"
                            onClick={() => generateMutation.mutate()}
                            disabled={generateMutation.isPending}
                        >
                            {generateMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
