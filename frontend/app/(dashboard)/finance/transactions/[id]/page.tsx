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
    CalendarDays,
    Trash2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, FinansIslem, FinansKasa } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

const ODEME_YONTEMLERI = ['Nakit', 'Kredi Kartı', 'Havale/EFT', 'Çek', 'Senet'];

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

    // Tahsilat ekleme
    const [kasalar, setKasalar] = useState<FinansKasa[]>([]);
    const [payOpen, setPayOpen] = useState(false);
    const [paySaving, setPaySaving] = useState(false);
    const [payTutar, setPayTutar] = useState('');
    const [payKasa, setPayKasa] = useState('');
    const [payYontem, setPayYontem] = useState(ODEME_YONTEMLERI[0]);
    const [payTarih, setPayTarih] = useState(() => format(new Date(), 'yyyy-MM-dd'));

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
        api.finance.getAccounts().then(setKasalar).catch(() => setKasalar([]));
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

    const handleDeletePayment = async (odemeId: number) => {
        if (!window.confirm('Bu tahsilat silinecek ve kasa bakiyesi geri alınacak. Onaylıyor musunuz?')) return;
        try {
            const res = await api.finance.deletePayment(islemId, odemeId);
            setIslem(res);
            toast.success('Tahsilat silindi');
        } catch (error: any) {
            toast.error(error?.message || 'Tahsilat silinemedi');
        }
    };

    const handleToggleInstallment = async (taksitId: number, tahsilEdildi: boolean) => {
        try {
            if (tahsilEdildi) {
                await api.finance.uncollectInstallment(taksitId);
            } else {
                await api.finance.collectInstallment(taksitId);
            }
            await fetchIslem();
            toast.success(tahsilEdildi ? 'Taksit tahsilatı geri alındı' : 'Taksit tahsil edildi');
        } catch (error: any) {
            toast.error(error?.message || 'Taksit güncellenemedi');
        }
    };

    const odenenToplam = (islem?.odemeler || []).reduce((sum, o) => sum + (o.tutar || 0), 0);
    const kalan = Math.round(((islem?.net_tutar || 0) - odenenToplam) * 100) / 100;
    const tahsilatYapilabilir = !!islem && islem.durum !== 'iptal' && kalan > 0;

    const openPayDialog = () => {
        setPayTutar(kalan > 0 ? String(kalan) : '');
        setPayKasa(kasalar[0]?.id ? String(kasalar[0].id) : '');
        setPayYontem(ODEME_YONTEMLERI[0]);
        setPayTarih(format(new Date(), 'yyyy-MM-dd'));
        setPayOpen(true);
    };

    const handleAddPayment = async () => {
        const tutar = parseFloat(payTutar);
        if (!Number.isFinite(tutar) || tutar <= 0) {
            toast.error('Geçerli bir tutar girin');
            return;
        }
        if (tutar > kalan + 0.01) {
            toast.error(`Tutar kalan borcu aşamaz (kalan: ${formatCurrency(kalan)})`);
            return;
        }

        setPaySaving(true);
        try {
            const res = await api.finance.addPayment(islemId, {
                tutar,
                odeme_tarihi: payTarih,
                odeme_yontemi: payYontem,
                kasa_id: payKasa ? Number(payKasa) : undefined,
            });
            setIslem(res);
            setPayOpen(false);
            toast.success('Tahsilat kaydedildi');
        } catch (error: any) {
            console.error('Tahsilat eklenemedi:', error);
            toast.error(error?.message || 'Tahsilat eklenemedi');
        } finally {
            setPaySaving(false);
        }
    };

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
                    {tahsilatYapilabilir && (
                        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openPayDialog}>
                            <Wallet className="h-4 w-4 mr-2" /> Tahsilat Ekle
                        </Button>
                    )}
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
                        <div className="py-6 text-center">
                            <p className="text-sm text-slate-500">Henüz ödeme kaydı yok</p>
                            {tahsilatYapilabilir && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={openPayDialog}
                                >
                                    <Wallet className="h-4 w-4 mr-2" /> İlk tahsilatı ekle
                                </Button>
                            )}
                        </div>
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
                                        <div className="flex items-center gap-3">
                                            <p className="font-semibold text-emerald-600">
                                                {formatCurrency(odeme.tutar)}
                                            </p>
                                            {islem.durum !== 'iptal' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    title="Tahsilatı sil"
                                                    onClick={() => handleDeletePayment(odeme.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                                                </Button>
                                            )}
                                        </div>
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
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleInstallment(taksit.id, taksit.durum === 'tahsil_edildi')}
                                                            title={taksit.durum === 'tahsil_edildi' ? 'Tahsilatı geri al' : 'Tahsil edildi olarak işaretle'}
                                                            className="cursor-pointer"
                                                        >
                                                            <Badge
                                                                variant={taksit.durum === 'tahsil_edildi' ? 'default' : 'secondary'}
                                                                className="text-[10px] hover:opacity-75 transition-opacity"
                                                            >
                                                                {taksit.durum === 'tahsil_edildi' ? 'tahsil edildi' : 'bekliyor'}
                                                            </Badge>
                                                        </button>
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

            {/* Tahsilat ekleme diyaloğu */}
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tahsilat Ekle</DialogTitle>
                        <DialogDescription>
                            {islem.referans_kodu} · Kalan borç {formatCurrency(kalan)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div>
                            <Label htmlFor="pay-tutar">Tutar (₺)</Label>
                            <Input
                                id="pay-tutar"
                                type="number"
                                step="0.01"
                                min="0"
                                value={payTutar}
                                onChange={e => setPayTutar(e.target.value)}
                                className="mt-1"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                En fazla {formatCurrency(kalan)} girilebilir.
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="pay-tarih">Ödeme Tarihi</Label>
                            <Input
                                id="pay-tarih"
                                type="date"
                                value={payTarih}
                                onChange={e => setPayTarih(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label>Ödeme Yöntemi</Label>
                            <Select value={payYontem} onValueChange={setPayYontem}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ODEME_YONTEMLERI.map(y => (
                                        <SelectItem key={y} value={y}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Kasa</Label>
                            <Select value={payKasa} onValueChange={setPayKasa}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Kasa seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {kasalar.map(k => (
                                        <SelectItem key={k.id} value={String(k.id)}>
                                            {k.ad}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {kasalar.length === 0 && (
                                <p className="text-xs text-amber-600 mt-1">
                                    Tanımlı kasa yok — tahsilat kasaya işlenmeyecek.
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayOpen(false)} disabled={paySaving}>
                            Vazgeç
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={handleAddPayment}
                            disabled={paySaving}
                        >
                            {paySaving ? 'Kaydediliyor...' : 'Tahsilatı Kaydet'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
