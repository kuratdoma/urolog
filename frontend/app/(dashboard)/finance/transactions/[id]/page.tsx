'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
    ArrowLeft,
    RefreshCw,
    Receipt,
    User,
    Ban,
    ExternalLink,
    Wallet,
    CalendarDays
} from 'lucide-react';
import { api, FinansIslem } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

const formatCurrency = (amount?: number) => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2,
    }).format(amount || 0);
};

const formatDate = (value?: string) => {
    if (!value) return '—';
    try {
        return format(parseISO(value), 'd MMMM yyyy', { locale: tr });
    } catch {
        return value;
    }
};

const durumVariant = (durum?: string) => {
    if (durum === 'iptal') return 'destructive' as const;
    if (durum === 'tamamlandi') return 'default' as const;
    return 'secondary' as const;
};

export default function TransactionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const islemId = Number(params?.id);

    const [loading, setLoading] = useState(true);
    const [islem, setIslem] = useState<FinansIslem | null>(null);
    const [cancelling, setCancelling] = useState(false);

    const fetchIslem = async () => {
        if (!Number.isFinite(islemId)) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await api.finance.getTransaction(islemId);
            setIslem(res);
        } catch (error) {
            console.error('İşlem yüklenemedi:', error);
            toast.error('İşlem bulunamadı');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIslem();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [islemId]);

    const handleCancel = async () => {
        const neden = window.prompt('İptal nedenini girin:');
        if (!neden) return;

        setCancelling(true);
        try {
            const res = await api.finance.cancelTransaction(islemId, neden);
            setIslem(res);
            toast.success('İşlem iptal edildi');
        } catch (error) {
            console.error('İptal başarısız:', error);
            toast.error('İşlem iptal edilemedi');
        } finally {
            setCancelling(false);
        }
    };

    const odenenToplam = (islem?.odemeler || []).reduce((sum, o) => sum + (o.tutar || 0), 0);
    const kalan = (islem?.net_tutar || 0) - odenenToplam;

    if (loading) {
        return (
            <div className="p-6 bg-slate-50 min-h-screen flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!islem) {
        return (
            <div className="p-6 bg-slate-50 min-h-screen">
                <Link href="/finance/transactions">
                    <Button variant="ghost" className="mb-4">
                        <ArrowLeft className="h-4 w-4 mr-2" /> İşlemler
                    </Button>
                </Link>
                <Card>
                    <CardContent className="py-12 text-center text-slate-500">
                        <Receipt className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>İşlem bulunamadı</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Receipt className="h-6 w-6 text-slate-600" />
                            {islem.referans_kodu}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant={islem.islem_tipi === 'gelir' ? 'default' : 'secondary'}>
                                {islem.islem_tipi === 'gelir' ? 'Gelir' : 'Gider'}
                            </Badge>
                            <Badge variant={durumVariant(islem.durum)}>{islem.durum}</Badge>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={fetchIslem}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Yenile
                    </Button>
                    {islem.durum !== 'iptal' && (
                        <Button variant="outline" onClick={handleCancel} disabled={cancelling}>
                            <Ban className="h-4 w-4 mr-2" /> İptal Et
                        </Button>
                    )}
                </div>
            </div>

            {/* Tutar Özeti */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Net Tutar</p>
                        <p className="text-3xl font-bold text-slate-900 mt-1">
                            {formatCurrency(islem.net_tutar)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Tahsil Edilen</p>
                        <p className="text-3xl font-bold text-emerald-600 mt-1">
                            {formatCurrency(odenenToplam)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Kalan</p>
                        <p className={`text-3xl font-bold mt-1 ${kalan > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {formatCurrency(kalan)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Genel Bilgiler */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-base">Genel Bilgiler</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            <dt className="text-slate-500">İşlem Tarihi:</dt>
                            <dd className="font-medium">{formatDate(islem.tarih)}</dd>
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            <dt className="text-slate-500">Vade Tarihi:</dt>
                            <dd className="font-medium">{formatDate(islem.vade_tarihi)}</dd>
                        </div>
                        {islem.hasta_id && (
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-slate-400" />
                                <dt className="text-slate-500">Hasta:</dt>
                                <dd className="font-medium">
                                    <Link
                                        href={`/patients/${islem.hasta_id}/finance`}
                                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                                    >
                                        {islem.hasta_adi || 'Hasta kaydı'}
                                        <ExternalLink className="h-3 w-3" />
                                    </Link>
                                </dd>
                            </div>
                        )}
                        {islem.doktor && (
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-slate-400" />
                                <dt className="text-slate-500">Doktor:</dt>
                                <dd className="font-medium">{islem.doktor}</dd>
                            </div>
                        )}
                        {islem.aciklama && (
                            <div className="md:col-span-2">
                                <dt className="text-slate-500">Açıklama:</dt>
                                <dd className="font-medium mt-1">{islem.aciklama}</dd>
                            </div>
                        )}
                        {islem.durum === 'iptal' && islem.iptal_nedeni && (
                            <div className="md:col-span-2 p-3 bg-rose-50 rounded-lg">
                                <dt className="text-rose-500 text-xs">İptal Nedeni</dt>
                                <dd className="font-medium text-rose-900 mt-1">{islem.iptal_nedeni}</dd>
                            </div>
                        )}
                    </dl>
                </CardContent>
            </Card>

            {/* Kalemler */}
            {(islem.satirlar?.length ?? 0) > 0 && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-base">Kalemler</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-slate-500">
                                    <th className="pb-2 font-medium">Açıklama</th>
                                    <th className="pb-2 font-medium text-right">Adet</th>
                                    <th className="pb-2 font-medium text-right">Birim Fiyat</th>
                                    <th className="pb-2 font-medium text-right">Toplam</th>
                                </tr>
                            </thead>
                            <tbody>
                                {islem.satirlar!.map(satir => (
                                    <tr key={satir.id} className="border-b last:border-0">
                                        <td className="py-2">{satir.hizmet_adi || '—'}</td>
                                        <td className="py-2 text-right">{satir.adet ?? 1}</td>
                                        <td className="py-2 text-right">{formatCurrency(satir.birim_fiyat)}</td>
                                        <td className="py-2 text-right font-medium">{formatCurrency(satir.toplam)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

            {/* Ödemeler */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-slate-400" />
                        Ödemeler
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {(islem.odemeler?.length ?? 0) === 0 ? (
                        <p className="text-sm text-slate-500 py-4 text-center">Henüz ödeme kaydı yok</p>
                    ) : (
                        <div className="space-y-3">
                            {islem.odemeler!.map(odeme => (
                                <div key={odeme.id} className="p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-slate-900">{odeme.odeme_yontemi}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {formatDate(odeme.odeme_tarihi)}
                                                {odeme.kasa_adi ? ` • ${odeme.kasa_adi}` : ''}
                                                {(odeme.taksit_sayisi ?? 1) > 1 ? ` • ${odeme.taksit_sayisi} taksit` : ''}
                                            </p>
                                        </div>
                                        <p className="font-semibold text-emerald-600">
                                            {formatCurrency(odeme.tutar)}
                                        </p>
                                    </div>

                                    {(odeme.taksitler?.length ?? 0) > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
                                            {odeme.taksitler!.map(taksit => (
                                                <div
                                                    key={taksit.id}
                                                    className="flex items-center justify-between text-xs text-slate-600"
                                                >
                                                    <span>
                                                        {taksit.taksit_no}. taksit • {formatDate(taksit.vade_tarihi)}
                                                    </span>
                                                    <span className="flex items-center gap-2">
                                                        {formatCurrency(taksit.tutar)}
                                                        <Badge
                                                            variant={taksit.durum === 'tahsil_edildi' ? 'default' : 'secondary'}
                                                            className="text-[10px]"
                                                        >
                                                            {taksit.durum}
                                                        </Badge>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
