'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
    Clock,
    ArrowLeft,
    RefreshCw,
    AlertTriangle,
    ExternalLink,
    FileText
} from 'lucide-react';
import { api, FinansIslem } from '@/lib/api';
import { format, differenceInDays, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
    }).format(amount || 0);
};

export default function OverduePage() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<FinansIslem[]>([]);
    const [total, setTotal] = useState(0);

    const fetchOverdue = async () => {
        setLoading(true);
        try {
            const res = await api.finance.getOverdueTransactions();
            setItems(res.items || []);
            setTotal(res.total || 0);
        } catch (error) {
            console.error('Vadesi geçmiş işlemler yüklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverdue();
    }, []);

    const toplamTutar = items.reduce((sum, tx) => sum + (tx.kalan_tutar ?? tx.net_tutar ?? 0), 0);

    const gecikmeGunu = (vade?: string) => {
        if (!vade) return null;
        try {
            return differenceInDays(new Date(), parseISO(vade));
        } catch {
            return null;
        }
    };

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
                            <Clock className="h-6 w-6 text-amber-600" />
                            Vadesi Geçmiş İşlemler
                        </h1>
                        <p className="text-slate-500 text-sm">Vadesi dolmuş, tahsilatı tamamlanmamış kayıtlar</p>
                    </div>
                </div>
                <Button variant="ghost" onClick={fetchOverdue}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Yenile
                </Button>
            </div>

            {/* Summary Card */}
            <Card className="mb-6 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0">
                <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-amber-100 text-sm">Vadesi Geçmiş Toplam</p>
                            <p className="text-4xl font-bold mt-1">{formatCurrency(toplamTutar)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-amber-100 text-sm">İşlem Sayısı</p>
                            <p className="text-3xl font-bold mt-1">{total}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                </div>
            ) : items.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-slate-500">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>Vadesi geçmiş işlem yok</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {items.map(tx => {
                        const gun = gecikmeGunu(tx.vade_tarihi);
                        return (
                            <Card key={tx.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-amber-100 rounded-xl">
                                                <AlertTriangle className="h-6 w-6 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">
                                                    {tx.hasta_adi || tx.aciklama || tx.referans_kodu}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
                                                    <span className="font-mono text-xs">{tx.referans_kodu}</span>
                                                    {tx.vade_tarihi && (
                                                        <span>
                                                            Vade: {format(parseISO(tx.vade_tarihi), 'd MMM yyyy', { locale: tr })}
                                                        </span>
                                                    )}
                                                    {gun !== null && gun > 0 && (
                                                        <Badge variant="destructive">{gun} gün gecikme</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-sm text-slate-500">Kalan</p>
                                                <p className="text-2xl font-bold text-amber-600">
                                                    {formatCurrency(tx.kalan_tutar ?? tx.net_tutar)}
                                                </p>
                                                {(tx.odenen_tutar ?? 0) > 0 && (
                                                    <p className="text-xs text-slate-400">
                                                        Ödenen: {formatCurrency(tx.odenen_tutar ?? 0)}
                                                    </p>
                                                )}
                                            </div>
                                            <Link href={`/finance/transactions/${tx.id}`}>
                                                <Button variant="outline" size="icon" title="İşlem detayı">
                                                    <FileText className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            {tx.hasta_id && (
                                                <Link href={`/patients/${tx.hasta_id}/finance`}>
                                                    <Button variant="outline" size="icon" title="Hasta cari">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
