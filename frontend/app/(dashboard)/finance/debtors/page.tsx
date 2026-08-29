'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
    Users,
    ArrowLeft,
    Search,
    RefreshCw,
    Phone,
    Mail,
    User,
    TrendingUp,
    AlertTriangle,
    ExternalLink
} from 'lucide-react';
import { api, BorcluHasta } from '@/lib/api';
import { toast } from 'sonner';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
    }).format(amount);
};

export default function DebtorsPage() {
    const [loading, setLoading] = useState(true);
    const [debtors, setDebtors] = useState<BorcluHasta[]>([]);
    const [minDebt, setMinDebt] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchDebtors = async () => {
        setLoading(true);
        try {
            const res = await api.finance.getDebtors(minDebt);
            setDebtors(res);
        } catch (error) {
            console.error('Borçlu hastalar yüklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDebtors();
    }, [minDebt]);

    const filteredDebtors = debtors.filter(d =>
        !searchQuery ||
        d.hasta_adi.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalDebt = filteredDebtors.reduce((sum, d) => sum + d.bakiye, 0);

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
                            <Users className="h-6 w-6 text-amber-600" />
                            Borçlu Hastalar
                        </h1>
                        <p className="text-slate-500 text-sm">Ödenmemiş hasta borçları</p>
                    </div>
                </div>
                <Button variant="ghost" onClick={fetchDebtors}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Yenile
                </Button>
            </div>

            {/* Summary Card */}
            <Card className="mb-6 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0">
                <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-amber-100 text-sm">Toplam Tahsil Edilecek</p>
                            <p className="text-4xl font-bold mt-1">{formatCurrency(totalDebt)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-amber-100 text-sm">Borçlu Hasta</p>
                            <p className="text-3xl font-bold mt-1">{filteredDebtors.length}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="pt-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Hasta adı ile ara..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500">Min. Borç:</span>
                            <Input
                                type="number"
                                className="w-32"
                                value={minDebt}
                                onChange={(e) => setMinDebt(parseFloat(e.target.value) || 0)}
                                min={0}
                            />
                            <span className="text-sm text-slate-500">₺</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Debtors List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                </div>
            ) : filteredDebtors.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-slate-500">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>Borçlu hasta bulunamadı</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredDebtors
                        .sort((a, b) => b.bakiye - a.bakiye)
                        .map(debtor => (
                            <Card key={debtor.hasta_id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-amber-100 rounded-xl">
                                                <User className="h-6 w-6 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900 text-lg">
                                                    {debtor.hasta_adi}
                                                </p>
                                                <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                                                    <span>Toplam Borç: {formatCurrency(debtor.toplam_borc)}</span>
                                                    <span>Ödenen: {formatCurrency(debtor.toplam_odeme)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-sm text-slate-500">Kalan Borç</p>
                                                <p className="text-2xl font-bold text-amber-600">
                                                    {formatCurrency(debtor.bakiye)}
                                                </p>
                                            </div>
                                            <Link href={`/patients/${debtor.hasta_id}/finance`}>
                                                <Button variant="outline" size="icon">
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-4">
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>Ödeme Durumu</span>
                                            <span>
                                                {debtor.toplam_borc > 0
                                                    ? Math.round((debtor.toplam_odeme / debtor.toplam_borc) * 100)
                                                    : 0
                                                }%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 transition-all"
                                                style={{
                                                    width: `${debtor.toplam_borc > 0
                                                        ? (debtor.toplam_odeme / debtor.toplam_borc) * 100
                                                        : 0
                                                        }%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                </div>
            )}

            {/* Quick Actions */}
            {filteredDebtors.length > 0 && (
                <div className="mt-6 flex justify-center">
                    <p className="text-sm text-slate-500">
                        {filteredDebtors.length} hasta listeleniyor •
                        En yüksek borç: {formatCurrency(Math.max(...filteredDebtors.map(d => d.bakiye)))}
                    </p>
                </div>
            )}
        </div>
    );
}
