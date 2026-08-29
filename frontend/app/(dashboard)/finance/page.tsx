'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Plus,
    ArrowRight,
    Clock,
    Users,
    Building2,
    CreditCard,
    Banknote,
    PiggyBank,
    Calendar,
    RefreshCw
} from 'lucide-react';
import { api, FinansOzet, FinansKasa, FinansIslem, AylikOzet } from '@/lib/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// Currency formatter
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

export default function FinanceDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<FinansOzet | null>(null);
    const [accounts, setAccounts] = useState<FinansKasa[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<FinansIslem[]>([]);
    const [overdueTransactions, setOverdueTransactions] = useState<FinansIslem[]>([]);
    const [monthlySummary, setMonthlySummary] = useState<AylikOzet[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [summaryRes, accountsRes, transactionsRes, overdueRes, monthlyRes] = await Promise.all([
                api.finance.getSummary(),
                api.finance.getAccounts(),
                api.finance.getTransactions({ limit: 5 }),
                api.finance.getOverdueTransactions(),
                api.finance.getMonthlySummary()
            ]);

            setSummary(summaryRes);
            setAccounts(accountsRes);
            setRecentTransactions(transactionsRes.items);
            setOverdueTransactions(overdueRes.items.slice(0, 5));
            setMonthlySummary(monthlyRes.slice(-6)); // Son 6 ay
        } catch (error) {
            console.error('Finans verileri yüklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const totalAccountBalance = accounts.reduce((sum, acc) => sum + acc.bakiye, 0);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
                    <p className="text-slate-500">Finans verileri yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <Wallet className="h-7 w-7 text-emerald-600" />
                        Finans Yönetimi
                    </h1>
                    <p className="text-slate-500 mt-1">Gelir, gider ve cari takip</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/finance/income/new">
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Gelir Ekle
                        </Button>
                    </Link>
                    <Link href="/finance/expenses/new">
                        <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50">
                            <Plus className="h-4 w-4 mr-2" />
                            Gider Ekle
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Ana Özet Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Toplam Gelir */}
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-100 text-sm font-medium">Toplam Gelir</p>
                                <p className="text-3xl font-bold mt-1">{formatCurrency(summary?.toplam_gelir || 0)}</p>
                                <p className="text-emerald-200 text-sm mt-2 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Bugün: {formatCurrency(summary?.bugun_gelir || 0)}
                                </p>
                            </div>
                            <div className="bg-white/20 p-3 rounded-xl">
                                <TrendingUp className="h-8 w-8" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Toplam Gider */}
                <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white border-0 shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-rose-100 text-sm font-medium">Toplam Gider</p>
                                <p className="text-3xl font-bold mt-1">{formatCurrency(summary?.toplam_gider || 0)}</p>
                                <p className="text-rose-200 text-sm mt-2 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Bugün: {formatCurrency(summary?.bugun_gider || 0)}
                                </p>
                            </div>
                            <div className="bg-white/20 p-3 rounded-xl">
                                <TrendingDown className="h-8 w-8" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Net Bakiye */}
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Net Bakiye</p>
                                <p className="text-3xl font-bold mt-1">{formatCurrency(summary?.net_bakiye || 0)}</p>
                                <p className="text-blue-200 text-sm mt-2 flex items-center gap-1">
                                    <PiggyBank className="h-3 w-3" />
                                    Kasa: {formatCurrency(totalAccountBalance)}
                                </p>
                            </div>
                            <div className="bg-white/20 p-3 rounded-xl">
                                <Wallet className="h-8 w-8" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bekleyen Tahsilat */}
                <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-amber-100 text-sm font-medium">Bekleyen Tahsilat</p>
                                <p className="text-3xl font-bold mt-1">{formatCurrency(summary?.bekleyen_tahsilat || 0)}</p>
                                <p className="text-amber-200 text-sm mt-2 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Vadesi Geçmiş: {summary?.vadesi_gecmis_islem_sayisi || 0}
                                </p>
                            </div>
                            <div className="bg-white/20 p-3 rounded-xl">
                                <Clock className="h-8 w-8" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* İkinci Sıra: Kasalar & Uyarılar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Kasa Durumları */}
                <Card className="lg:col-span-2 border-slate-200">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-slate-600" />
                                Kasa Bakiyeleri
                            </CardTitle>
                            <Link href="/finance/accounts">
                                <Button variant="ghost" size="sm" className="text-blue-600">
                                    Tümünü Gör <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {accounts.map((account) => (
                                <div
                                    key={account.id}
                                    className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        {account.tip === 'nakit' && <Banknote className="h-5 w-5 text-green-600" />}
                                        {account.tip === 'banka' && <Building2 className="h-5 w-5 text-blue-600" />}
                                        {account.tip === 'pos' && <CreditCard className="h-5 w-5 text-purple-600" />}
                                        <span className="font-medium text-slate-700">{account.ad}</span>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-900">
                                        {formatCurrency(account.bakiye)}
                                    </p>
                                    <Badge variant="secondary" className="mt-2 capitalize">
                                        {account.tip}
                                    </Badge>
                                </div>
                            ))}
                            {accounts.length === 0 && (
                                <p className="text-slate-500 text-center col-span-3 py-4">Henüz kasa tanımlı değil</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Uyarılar Paneli */}
                <Card className="border-amber-200 bg-amber-50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                            <AlertTriangle className="h-5 w-5" />
                            Uyarılar
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {overdueTransactions.length > 0 ? (
                            <>
                                {overdueTransactions.map((tx) => (
                                    <div
                                        key={tx.id}
                                        className="p-3 bg-white rounded-lg border border-amber-200 flex items-center justify-between"
                                    >
                                        <div>
                                            <p className="font-medium text-slate-900 text-sm">
                                                {tx.hasta_adi || tx.aciklama || tx.referans_kodu}
                                            </p>
                                            <p className="text-xs text-amber-600">
                                                Vade: {tx.vade_tarihi && format(new Date(tx.vade_tarihi), 'd MMM yyyy', { locale: tr })}
                                            </p>
                                        </div>
                                        <Badge variant="destructive">{formatCurrency(tx.net_tutar)}</Badge>
                                    </div>
                                ))}
                                <Link href="/finance/overdue">
                                    <Button variant="outline" size="sm" className="w-full mt-2 border-amber-300 text-amber-700">
                                        Tümünü Gör ({summary?.vadesi_gecmis_islem_sayisi})
                                    </Button>
                                </Link>
                            </>
                        ) : (
                            <div className="text-center py-6 text-amber-700">
                                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Vadesi geçmiş işlem yok</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Üçüncü Sıra: Son İşlemler & Aylık Grafik */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Son İşlemler */}
                <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Son İşlemler</CardTitle>
                            <Link href="/finance/transactions">
                                <Button variant="ghost" size="sm" className="text-blue-600">
                                    Tümünü Gör <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentTransactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${tx.islem_tipi === 'gelir'
                                                ? 'bg-emerald-100 text-emerald-600'
                                                : 'bg-rose-100 text-rose-600'
                                            }`}>
                                            {tx.islem_tipi === 'gelir' ? (
                                                <TrendingUp className="h-4 w-4" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 text-sm">
                                                {tx.hasta_adi || tx.aciklama || tx.kategori_adi || tx.referans_kodu}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {format(new Date(tx.tarih), 'd MMM yyyy', { locale: tr })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`font-bold ${tx.islem_tipi === 'gelir' ? 'text-emerald-600' : 'text-rose-600'
                                        }`}>
                                        {tx.islem_tipi === 'gelir' ? '+' : '-'}{formatCurrency(tx.net_tutar)}
                                    </span>
                                </div>
                            ))}
                            {recentTransactions.length === 0 && (
                                <p className="text-slate-500 text-center py-8">Henüz işlem yok</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Aylık Özet */}
                <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Aylık Özet</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {monthlySummary.map((month) => (
                                <div key={`${month.yil}-${month.ay}`} className="p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-slate-700">{month.ay_adi} {month.yil}</span>
                                        <span className={`font-bold ${month.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {month.net >= 0 ? '+' : ''}{formatCurrency(month.net)}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 text-sm">
                                        <span className="text-emerald-600">↑ {formatCurrency(month.gelir)}</span>
                                        <span className="text-rose-600">↓ {formatCurrency(month.gider)}</span>
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden flex">
                                        <div
                                            className="h-full bg-emerald-500"
                                            style={{ width: `${(month.gelir / (month.gelir + month.gider || 1)) * 100}%` }}
                                        />
                                        <div
                                            className="h-full bg-rose-500"
                                            style={{ width: `${(month.gider / (month.gelir + month.gider || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {monthlySummary.length === 0 && (
                                <p className="text-slate-500 text-center py-8">Henüz aylık veri yok</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Hızlı Erişim Linkleri */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/finance/income">
                    <Card className="border-emerald-200 hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-emerald-600" />
                            </div>
                            <span className="font-medium text-slate-700">Gelirler</span>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/finance/expenses">
                    <Card className="border-rose-200 hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 bg-rose-100 rounded-lg">
                                <TrendingDown className="h-5 w-5 text-rose-600" />
                            </div>
                            <span className="font-medium text-slate-700">Giderler</span>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/finance/debtors">
                    <Card className="border-amber-200 hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Users className="h-5 w-5 text-amber-600" />
                            </div>
                            <span className="font-medium text-slate-700">Borçlu Hastalar</span>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/finance/companies">
                    <Card className="border-blue-200 hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="font-medium text-slate-700">Firma Borçları</span>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
