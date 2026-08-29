'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import {
    ArrowLeftRight,
    Plus,
    Search,
    Filter,
    ArrowLeft,
    Calendar,
    Eye,
    MoreHorizontal,
    RefreshCw,
    X,
    TrendingUp,
    TrendingDown
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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    tamamlandi: { label: 'Tamamlandı', color: 'bg-emerald-100 text-emerald-700' },
    bekliyor: { label: 'Bekliyor', color: 'bg-amber-100 text-amber-700' },
    iptal: { label: 'İptal', color: 'bg-rose-100 text-rose-700' },
};

const TYPE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
    gelir: { label: 'Gelir', color: 'text-emerald-600', icon: TrendingUp },
    gider: { label: 'Gider', color: 'text-rose-600', icon: TrendingDown },
    transfer: { label: 'Transfer', color: 'text-blue-600', icon: ArrowLeftRight },
};

export default function TransactionsPage() {
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<FinansIslem[]>([]);
    const [categories, setCategories] = useState<FinansKategori[]>([]);
    const [total, setTotal] = useState(0);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [durum, setDurum] = useState('');
    const [islemTipi, setIslemTipi] = useState('');
    const [kategoriId, setKategoriId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Pagination
    const [page, setPage] = useState(0);
    const limit = 25;

    const fetchData = async () => {
        setLoading(true);
        try {
            const [transactionsRes, categoriesRes] = await Promise.all([
                api.finance.getTransactions({
                    start_date: startDate || undefined,
                    end_date: endDate || undefined,
                    islem_tipi: islemTipi || undefined,
                    durum: durum || undefined,
                    kategori_id: kategoriId || undefined,
                    referans: searchQuery || undefined,
                    skip: page * limit,
                    limit
                }),
                api.finance.getCategories()
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
    }, [page, startDate, endDate, durum, islemTipi, kategoriId]);

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
        setIslemTipi('');
        setKategoriId('');
        setSearchQuery('');
        setPage(0);
    };

    const hasActiveFilters = startDate || endDate || durum || islemTipi || kategoriId || searchQuery;
    const totalPages = Math.ceil(total / limit);

    // Toplamlar
    const incomeTotal = transactions.filter(t => t.islem_tipi === 'gelir').reduce((s, t) => s + t.net_tutar, 0);
    const expenseTotal = transactions.filter(t => t.islem_tipi === 'gider').reduce((s, t) => s + t.net_tutar, 0);

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
                            <ArrowLeftRight className="h-6 w-6 text-slate-600" />
                            Tüm İşlemler
                        </h1>
                        <p className="text-slate-500 text-sm">Toplam {total} işlem</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href="/finance/income/new">
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Gelir
                        </Button>
                    </Link>
                    <Link href="/finance/expenses/new">
                        <Button variant="outline" className="border-rose-200 text-rose-600">
                            <Plus className="h-4 w-4 mr-2" />
                            Gider
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="pt-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Referans, açıklama ile ara..."
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
                                <Badge className="ml-2 bg-blue-600">!</Badge>
                            )}
                        </Button>
                        <Button variant="ghost" onClick={fetchData}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>

                    {showFilters && (
                        <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Başlangıç</label>
                                <DatePicker
                                    date={startDate ? parseISO(startDate) : undefined}
                                    setDate={(d) => setStartDate(d ? format(d, 'yyyy-MM-dd') : '')}
                                    placeholder="Seçiniz..."
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Bitiş</label>
                                <DatePicker
                                    date={endDate ? parseISO(endDate) : undefined}
                                    setDate={(d) => setEndDate(d ? format(d, 'yyyy-MM-dd') : '')}
                                    placeholder="Seçiniz..."
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">İşlem Tipi</label>
                                <Select value={islemTipi} onValueChange={setIslemTipi}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tümü" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Tümü</SelectItem>
                                        <SelectItem value="gelir">Gelir</SelectItem>
                                        <SelectItem value="gider">Gider</SelectItem>
                                        <SelectItem value="transfer">Transfer</SelectItem>
                                    </SelectContent>
                                </Select>
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
            <div className="mb-4 grid grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                    <p className="text-sm text-emerald-600">Gelir</p>
                    <p className="text-xl font-bold text-emerald-700">{formatCurrency(incomeTotal)}</p>
                </div>
                <div className="p-4 bg-rose-50 rounded-lg border border-rose-200 text-center">
                    <p className="text-sm text-rose-600">Gider</p>
                    <p className="text-xl font-bold text-rose-700">{formatCurrency(expenseTotal)}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                    <p className="text-sm text-blue-600">Net</p>
                    <p className={`text-xl font-bold ${incomeTotal - expenseTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatCurrency(incomeTotal - expenseTotal)}
                    </p>
                </div>
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
                            <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>İşlem bulunamadı</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="text-left p-4 font-medium text-slate-600">Tarih</th>
                                        <th className="text-left p-4 font-medium text-slate-600">Tip</th>
                                        <th className="text-left p-4 font-medium text-slate-600">Referans</th>
                                        <th className="text-left p-4 font-medium text-slate-600">Açıklama</th>
                                        <th className="text-left p-4 font-medium text-slate-600">Kategori</th>
                                        <th className="text-left p-4 font-medium text-slate-600">Durum</th>
                                        <th className="text-right p-4 font-medium text-slate-600">Tutar</th>
                                        <th className="text-right p-4 font-medium text-slate-600"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((tx) => {
                                        const typeInfo = TYPE_LABELS[tx.islem_tipi] || TYPE_LABELS.gelir;
                                        const TypeIcon = typeInfo.icon;

                                        return (
                                            <tr key={tx.id} className="border-b hover:bg-slate-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-slate-400" />
                                                        {format(new Date(tx.tarih), 'd MMM yyyy', { locale: tr })}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <TypeIcon className={`h-4 w-4 ${typeInfo.color}`} />
                                                        <span className={typeInfo.color}>{typeInfo.label}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                                                        {tx.referans_kodu}
                                                    </code>
                                                </td>
                                                <td className="p-4">
                                                    <p className="font-medium text-slate-900 max-w-[200px] truncate">
                                                        {tx.hasta_adi || tx.aciklama || '-'}
                                                    </p>
                                                </td>
                                                <td className="p-4">
                                                    {tx.kategori_adi && (
                                                        <Badge variant="secondary">{tx.kategori_adi}</Badge>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <Badge className={STATUS_LABELS[tx.durum]?.color || ''}>
                                                        {STATUS_LABELS[tx.durum]?.label || tx.durum}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <span className={`font-bold ${typeInfo.color}`}>
                                                        {tx.islem_tipi === 'gider' ? '-' : '+'}{formatCurrency(tx.net_tutar)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/finance/transactions/${tx.id}`}>
                                                                    <Eye className="h-4 w-4 mr-2" /> Detay
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-slate-500">Sayfa {page + 1} / {totalPages}</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                            Önceki
                        </Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                            Sonraki
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
