'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import {
    TrendingUp,
    Plus,
    Search,
    Filter,
    ArrowLeft,
    Calendar,
    Eye,
    MoreHorizontal,
    RefreshCw,
    X
} from 'lucide-react';
import { api, FinansIslem, FinansKategori } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { DatePicker } from '@/components/ui/date-picker';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
    }).format(amount);
};

/** Liste yanıtı ödemeleri özet olarak taşır: tek ödemede yöntem, çoklu ödemede sayı. */
const ODEME_YONTEMI_ETIKET: Record<string, string> = {
    nakit: 'Nakit',
    kredi_karti: 'Kredi Kartı',
    havale: 'Havale/EFT',
};

const formatOdemeYontemi = (tx: FinansIslem) => {
    const sayi = tx.odeme_sayisi ?? 0;
    if (sayi === 0) return '-';
    if (sayi > 1) return 'Çoklu Ödeme';
    const yontem = tx.odeme_yontemi;
    if (!yontem) return '-';
    return ODEME_YONTEMI_ETIKET[yontem] ?? yontem;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    tamamlandi: { label: 'Tamamlandı', color: 'bg-emerald-100 text-emerald-700' },
    bekliyor: { label: 'Bekliyor', color: 'bg-amber-100 text-amber-700' },
    iptal: { label: 'İptal', color: 'bg-rose-100 text-rose-700' },
};

export default function IncomeListPage() {
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<FinansIslem[]>([]);
    const [categories, setCategories] = useState<FinansKategori[]>([]);
    const [total, setTotal] = useState(0);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [durum, setDurum] = useState('');
    const [kategoriId, setKategoriId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Pagination
    const [page, setPage] = useState(0);
    const limit = 20;

    const fetchData = async () => {
        setLoading(true);
        try {
            const [transactionsRes, categoriesRes] = await Promise.all([
                api.finance.getTransactions({
                    islem_tipi: 'gelir',
                    start_date: startDate || undefined,
                    end_date: endDate || undefined,
                    durum: durum || undefined,
                    kategori_id: kategoriId || undefined,
                    referans: searchQuery || undefined,
                    skip: page * limit,
                    limit
                }),
                api.finance.getCategories('gelir')
            ]);

            setTransactions(transactionsRes.items);
            setTotal(transactionsRes.total);
            setCategories(categoriesRes);
        } catch (error) {
            console.error('Veriler yüklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, startDate, endDate, durum, kategoriId]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            if (searchQuery.length === 0 || searchQuery.length >= 2) {
                fetchData();
            }
        }, 500);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    const clearFilters = () => {
        setStartDate('');
        setEndDate('');
        setDurum('');
        setKategoriId('');
        setSearchQuery('');
        setPage(0);
    };

    const hasActiveFilters = startDate || endDate || durum || kategoriId || searchQuery;

    const totalPages = Math.ceil(total / limit);

    // Toplam tutar hesaplama
    const totalAmount = transactions.reduce((sum, t) => sum + t.net_tutar, 0);

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/finance">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp className="h-6 w-6 text-emerald-600" />
                            Gelir Kayıtları
                        </h1>
                        <p className="text-slate-500 text-sm">Toplam {total} kayıt</p>
                    </div>
                </div>
                <Link href="/finance/income/new">
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Yeni Gelir
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="pt-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Referans, hasta adı ile ara..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setShowFilters(!showFilters)}
                            className={showFilters ? 'bg-slate-100' : ''}
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Filtreler
                            {hasActiveFilters && (
                                <Badge className="ml-2 bg-emerald-600">!</Badge>
                            )}
                        </Button>
                        <Button variant="ghost" onClick={fetchData}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>

                    {showFilters && (
                        <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Başlangıç Tarihi</label>
                                <DatePicker
                                    date={startDate ? parseISO(startDate) : undefined}
                                    setDate={(d) => setStartDate(d ? format(d, 'yyyy-MM-dd') : '')}
                                    placeholder="Seçiniz..."
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Bitiş Tarihi</label>
                                <DatePicker
                                    date={endDate ? parseISO(endDate) : undefined}
                                    setDate={(d) => setEndDate(d ? format(d, 'yyyy-MM-dd') : '')}
                                    placeholder="Seçiniz..."
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Kategori</label>
                                <Select value={kategoriId} onValueChange={setKategoriId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tümü" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Tümü</SelectItem>
                                        {categories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id.toString()}>
                                                {cat.ad}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Durum</label>
                                <Select value={durum} onValueChange={setDurum}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tümü" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Tümü</SelectItem>
                                        <SelectItem value="tamamlandi">Tamamlandı</SelectItem>
                                        <SelectItem value="bekliyor">Bekliyor</SelectItem>
                                        <SelectItem value="iptal">İptal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {hasActiveFilters && (
                                <div className="col-span-full">
                                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                                        <X className="h-4 w-4 mr-1" /> Filtreleri Temizle
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Summary */}
            <div className="mb-4 flex items-center justify-between bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                <span className="text-emerald-800 font-medium">
                    Görüntülenen {transactions.length} kayıt
                </span>
                <span className="text-emerald-800 font-bold text-lg">
                    Toplam: {formatCurrency(totalAmount)}
                </span>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>Kayıt bulunamadı</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="text-left p-4 font-medium text-slate-600">Tarih</th>
                                        <th className="text-left p-4 font-medium text-slate-600">Ref</th>
                                        <th className="text-left p-4 font-medium text-slate-600">İşlem / Açıklama</th>
                                        <th className="text-left p-4 font-medium text-slate-600">Ödeme Yöntemi</th>
                                        <th className="text-left p-4 font-medium text-slate-600">Ödeme Aracı</th>
                                        <th className="text-left p-4 font-medium text-slate-600">Detay</th>
                                        <th className="text-right p-4 font-medium text-slate-600">Toplam</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="border-b hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-slate-400" />
                                                    {format(new Date(tx.tarih), 'dd.MM.yyyy', { locale: tr })}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-600">
                                                    {tx.referans_kodu}
                                                </code>
                                            </td>
                                            <td className="p-4">
                                                <div>
                                                    <p className="font-medium text-slate-900">
                                                        {tx.hasta_adi || tx.aciklama || '-'}
                                                    </p>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                                        {tx.islem_tipi === 'gelir' ? 'GELİR' : tx.islem_tipi.toUpperCase()}
                                                        {tx.doktor && <span>• Dr. {tx.doktor}</span>}
                                                        {tx.kategori_adi && <span className="bg-slate-100 px-1 rounded ml-1">{tx.kategori_adi}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600">
                                                {formatOdemeYontemi(tx)}
                                            </td>
                                            <td className="p-4 text-sm text-slate-600">
                                                {(tx.odeme_sayisi ?? 0) > 1 ? 'Çeşitli' : (tx.kasa_adi || '-')}
                                            </td>
                                            <td className="p-4">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/finance/transactions/${tx.id}`}>
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                Detay Görüntüle
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold text-emerald-600">
                                                        {formatCurrency(tx.net_tutar)}
                                                    </span>
                                                    <Badge className={`text-[10px] px-1 py-0 ${STATUS_LABELS[tx.durum]?.color || ''}`}>
                                                        {STATUS_LABELS[tx.durum]?.label || tx.durum}
                                                    </Badge>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-slate-500">
                        Sayfa {page + 1} / {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                        >
                            Önceki
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Sonraki
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
