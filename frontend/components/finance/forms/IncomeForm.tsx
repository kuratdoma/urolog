'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, Search, Plus, Trash2, Save, User, CreditCard, Banknote, Building2, X } from 'lucide-react';
import { api, FinansKategori, FinansHizmet, FinansKasa, Patient, Muayene, Doktor } from '@/lib/api';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ServiceLine {
    id: string;
    hizmet_id?: string;
    hizmet_adi: string;
    adet: number;
    birim_fiyat: number;
    toplam: number;
}

interface PaymentLine {
    id: string;
    kasa_id?: string;
    odeme_yontemi: string;
    tutar: number;
    taksit_sayisi: number;
}

const PAYMENT_METHODS = [
    { value: 'nakit', label: 'Nakit', icon: Banknote },
    { value: 'kredi_karti', label: 'Kredi Kartı', icon: CreditCard },
    { value: 'havale', label: 'Havale/EFT', icon: Building2 },
    { value: 'sgk', label: 'SGK', icon: Building2 },
    { value: 'ozel_sigorta', label: 'Özel Sigorta', icon: Building2 },
];

export interface IncomeFormProps {
    patientId?: string;
    patientName?: string;
    requireClinicalLink?: boolean;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function IncomeForm({ patientId: initialPatientId, patientName: initialPatientName, requireClinicalLink = false, onSuccess, onCancel }: IncomeFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Data
    const [categories, setCategories] = useState<FinansKategori[]>([]);
    const [services, setServices] = useState<FinansHizmet[]>([]);
    const [accounts, setAccounts] = useState<FinansKasa[]>([]);
    const [muayeneler, setMuayeneler] = useState<Muayene[]>([]);
    const [doktorlar, setDoktorlar] = useState<Doktor[]>([]);

    // Form State
    const [tarih, setTarih] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [paraBirimi, setParaBirimi] = useState('TRY');
    const [kategoriId, setKategoriId] = useState<string>('');
    const [aciklama, setAciklama] = useState('');
    const [doktor, setDoktor] = useState('');
    const [notlar, setNotlar] = useState('');
    const [vadeTarihi, setVadeTarihi] = useState('');
    const [muayeneId, setMuayeneId] = useState<string>('');

    // Hasta Seçimi
    const isPatientLocked = !!initialPatientId;
    const [hastaId, setHastaId] = useState<string | null>(initialPatientId || null);
    const [hastaAdi, setHastaAdi] = useState(initialPatientName || '');
    const [hastaSearchQuery, setHastaSearchQuery] = useState('');
    const [hastaSearchResults, setHastaSearchResults] = useState<Patient[]>([]);
    const [showHastaSearch, setShowHastaSearch] = useState(false);

    // Satırlar
    const [serviceLines, setServiceLines] = useState<ServiceLine[]>([
        { id: '1', hizmet_adi: '', adet: 1, birim_fiyat: 0, toplam: 0 }
    ]);

    // Ödemeler
    const [payments, setPayments] = useState<PaymentLine[]>([]);
    const [showPaymentForm, setShowPaymentForm] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [categoriesRes, servicesRes, accountsRes, doktorlarRes] = await Promise.all([
                    api.finance.getCategories('gelir'),
                    api.finance.getServices(),
                    api.finance.getAccounts(),
                    api.definitions.doktorlar.list()
                ]);
                setCategories(categoriesRes);
                setServices(servicesRes);
                setDoktorlar(doktorlarRes.filter(d => d.aktif));

                // Active accounts only and trigger UI updates
                setAccounts(accountsRes.filter(a => a.aktif));

                if (hastaId) {
                    const patientMuayeneler = await api.clinical.getMuayeneler(hastaId);
                    setMuayeneler(patientMuayeneler);
                }
            } catch (error) {
                console.error('Veriler yüklenemedi:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [hastaId]);

    // Hasta Arama
    useEffect(() => {
        const searchPatients = async () => {
            if (hastaSearchQuery.length < 2 || isPatientLocked) {
                setHastaSearchResults([]);
                return;
            }
            try {
                const results = await api.patients.list({ search: hastaSearchQuery, limit: 10 });
                setHastaSearchResults(results);
            } catch (error) {
                console.error('Hasta araması başarısız:', error);
            }
        };

        const debounce = setTimeout(searchPatients, 300);
        return () => clearTimeout(debounce);
    }, [hastaSearchQuery, isPatientLocked]);

    const selectPatient = (patient: Patient) => {
        if (isPatientLocked) return;
        setHastaId(patient.id);
        setHastaAdi(`${patient.ad} ${patient.soyad}`);
        setShowHastaSearch(false);
        setHastaSearchQuery('');
        setHastaSearchResults([]);
    };

    const clearPatient = () => {
        if (isPatientLocked) return;
        setHastaId(null);
        setHastaAdi('');
        setMuayeneler([]);
        setMuayeneId('');
    };

    // Satır Yönetimi
    const addServiceLine = () => {
        setServiceLines([
            ...serviceLines,
            { id: Date.now().toString(), hizmet_adi: '', adet: 1, birim_fiyat: 0, toplam: 0 }
        ]);
    };

    const removeServiceLine = (id: string) => {
        if (serviceLines.length > 1) {
            setServiceLines(serviceLines.filter(line => line.id !== id));
        }
    };

    const updateServiceLine = (id: string, field: keyof ServiceLine, value: any) => {
        setServiceLines(serviceLines.map(line => {
            if (line.id === id) {
                const updated = { ...line, [field]: value };
                if (field === 'adet' || field === 'birim_fiyat') {
                    updated.toplam = updated.adet * updated.birim_fiyat;
                }
                return updated;
            }
            return line;
        }));
    };

    const selectService = (lineId: string, serviceId: string) => {
        const service = services.find(s => s.id === serviceId);
        if (service) {
            setServiceLines(serviceLines.map(line => {
                if (line.id === lineId) {
                    return {
                        ...line,
                        hizmet_id: service.id,
                        hizmet_adi: service.ad,
                        birim_fiyat: service.varsayilan_fiyat || 0,
                        toplam: line.adet * (service.varsayilan_fiyat || 0)
                    };
                }
                return line;
            }));
        }
    };

    // Ödeme Yönetimi
    const addPayment = (method: string) => {
        const defaultAccount = accounts.find(a =>
            (method === 'nakit' && a.tip === 'NAKIT' && a.para_birimi === paraBirimi) ||
            (method === 'kredi_karti' && a.tip === 'POS' && a.para_birimi === paraBirimi) ||
            (method === 'havale' && a.tip === 'BANKA' && a.para_birimi === paraBirimi)
        );

        setPayments([
            ...payments,
            {
                id: Date.now().toString(),
                kasa_id: defaultAccount?.id,
                odeme_yontemi: method,
                tutar: remainingAmount > 0 ? remainingAmount : 0,
                taksit_sayisi: 1
            }
        ]);
        setShowPaymentForm(false);
    };

    const removePayment = (id: string) => {
        setPayments(payments.filter(p => p.id !== id));
    };

    const updatePayment = (id: string, field: keyof PaymentLine, value: any) => {
        setPayments(payments.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    // Hesaplamalar
    const totalAmount = serviceLines.reduce((sum, line) => sum + line.toplam, 0);
    const totalPayments = payments.reduce((sum, p) => sum + p.tutar, 0);
    const remainingAmount = totalAmount - totalPayments;

    // Kaydet
    const handleSubmit = async () => {
        if (serviceLines.every(l => !l.hizmet_adi || l.toplam === 0)) {
            toast.error('En az bir hizmet satırı ekleyin');
            return;
        }

        if (requireClinicalLink && !muayeneId) {
            toast.error('Bu işlem için İlgili İşlem/Muayene bağlamı zorunludur.');
            return;
        }

        setSaving(true);
        try {
            const data = {
                hasta_id: hastaId || undefined,
                muayene_id: muayeneId || undefined,
                tarih,
                islem_tipi: 'gelir',
                durum: remainingAmount > 0 ? 'bekliyor' : 'tamamlandi',
                kategori_id: kategoriId || undefined,
                aciklama: aciklama || hastaAdi || 'Gelir',
                tutar: totalAmount,
                para_birimi: paraBirimi,
                kdv_orani: 0,
                kdv_tutari: 0,
                net_tutar: totalAmount,
                doktor,
                vade_tarihi: vadeTarihi || undefined,
                notlar,
                satirlar: serviceLines
                    .filter(l => l.hizmet_adi && l.toplam > 0)
                    .map(l => ({
                        hizmet_id: l.hizmet_id,
                        hizmet_adi: l.hizmet_adi,
                        adet: l.adet,
                        birim_fiyat: l.birim_fiyat,
                        toplam: l.toplam,
                        doktor
                    })),
                odemeler: payments.map(p => ({
                    kasa_id: p.kasa_id,
                    odeme_tarihi: tarih,
                    tutar: p.tutar,
                    odeme_yontemi: p.odeme_yontemi,
                    taksit_sayisi: p.taksit_sayisi
                }))
            };

            await api.finance.createTransaction(data);
            toast.success('Gelir kaydı oluşturuldu');

            if (onSuccess) {
                onSuccess();
            } else {
                router.push('/finance');
            }
        } catch (error) {
            console.error('Kayıt hatası:', error);
            toast.error('Kayıt oluşturulamadı');
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: paraBirimi,
            minimumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[300px]">
                <p className="text-slate-500">Yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Sol Panel - Form */}
            <div className="lg:col-span-2 space-y-4">
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-lg">Temel Bilgiler</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Tarih</Label>
                                <Input
                                    type="date"
                                    value={tarih}
                                    onChange={(e) => setTarih(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Para Birimi</Label>
                                <Select value={paraBirimi} onValueChange={(val) => {
                                    setParaBirimi(val);
                                    setPayments([]); // Currency değişince ödemeleri sıfırla
                                }}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
                                        <SelectItem value="USD">Amerikan Doları ($)</SelectItem>
                                        <SelectItem value="EUR">Euro (€)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-2">
                                <Label className="mb-2 block">İşlem Kategorisi</Label>
                                <div className="flex flex-wrap gap-2">
                                    {categories.map(cat => (
                                        <Button
                                            key={cat.id}
                                            type="button"
                                            variant={kategoriId === cat.id.toString() ? 'default' : 'outline'}
                                            onClick={() => setKategoriId(cat.id.toString())}
                                            className={kategoriId === cat.id.toString() ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                                            size="sm"
                                        >
                                            {cat.ad}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Hasta, Muayene ve Doktor Seçimi */}
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-4">
                            <div>
                                <Label>İlgili Hasta (Opsiyonel)</Label>
                                {hastaId ? (
                                    <div className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-md mt-1.5">
                                        <User className="h-4 w-4 text-emerald-600" />
                                        <span className="font-medium text-emerald-800">{hastaAdi}</span>
                                        {!isPatientLocked && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearPatient}
                                                className="ml-auto text-emerald-600 h-6 px-2"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="relative mt-1.5">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                placeholder="Hasta ara..."
                                                className="pl-10 bg-white"
                                                value={hastaSearchQuery}
                                                onChange={(e) => {
                                                    setHastaSearchQuery(e.target.value);
                                                    setShowHastaSearch(true);
                                                }}
                                                onFocus={() => setShowHastaSearch(true)}
                                                disabled={isPatientLocked}
                                            />
                                        </div>
                                        {showHastaSearch && hastaSearchResults.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                                                {hastaSearchResults.map(patient => (
                                                    <button
                                                        key={patient.id}
                                                        className="w-full px-4 py-2 text-left hover:bg-slate-50 border-b last:border-0"
                                                        onClick={() => selectPatient(patient)}
                                                    >
                                                        <p className="font-medium">{patient.ad} {patient.soyad}</p>
                                                        <p className="text-sm text-slate-500">{patient.tc_kimlik}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>İlgili Muayene/İşlem {requireClinicalLink && <span className="text-rose-500">*</span>}</Label>
                                    <Select value={muayeneId} onValueChange={setMuayeneId} disabled={!hastaId}>
                                        <SelectTrigger className="bg-white mt-1.5">
                                            <SelectValue placeholder={hastaId ? "Seçin..." : "Önce hasta seçin"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {muayeneler.map(m => (
                                                <SelectItem key={m.id} value={m.id.toString()}>
                                                    {format(new Date(m.tarih || Date.now()), 'dd MMM yyyy')} - {m.tani1 || 'Genel Muayene/İşlem'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>İlgili Personel (Doktor)</Label>
                                    <Select value={doktor} onValueChange={setDoktor}>
                                        <SelectTrigger className="bg-white mt-1.5">
                                            <SelectValue placeholder="Doktor Seçin..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {doktorlar.map(d => (
                                                <SelectItem key={d.id} value={d.id.toString()}>
                                                    {d.ad_soyad}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label>Genel Açıklama</Label>
                            <Input
                                placeholder="Örn: Muayene ücreti, ESWL vb."
                                value={aciklama}
                                onChange={(e) => setAciklama(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Hizmet Satırları */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                        <CardTitle className="text-lg">Hizmetler</CardTitle>
                        <Button variant="outline" size="sm" onClick={addServiceLine}>
                            <Plus className="h-4 w-4 mr-1" /> Satır Ekle
                        </Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="space-y-2">
                            {serviceLines.map((line) => (
                                <div key={line.id} className="flex gap-2 items-end p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex-1">
                                        <Label className="text-xs">Hizmet</Label>
                                        <Select
                                            value={line.hizmet_id?.toString() || ''}
                                            onValueChange={(val) => selectService(line.id, val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Hizmet seçin..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {services.map(s => (
                                                    <SelectItem key={s.id} value={s.id.toString()}>
                                                        {s.ad} - {formatCurrency(s.varsayilan_fiyat || 0)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-20">
                                        <Label className="text-xs">Adet</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={line.adet}
                                            onChange={(e) => updateServiceLine(line.id, 'adet', parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                    <div className="w-32">
                                        <Label className="text-xs">Birim Fiyat</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={line.birim_fiyat}
                                            onChange={(e) => updateServiceLine(line.id, 'birim_fiyat', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="w-28 text-right">
                                        <Label className="text-xs">Toplam</Label>
                                        <p className="font-bold text-emerald-600 py-2">{formatCurrency(line.toplam)}</p>
                                    </div>
                                    {serviceLines.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeServiceLine(line.id)}
                                            className="text-rose-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Ödemeler */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                        <CardTitle className="text-lg">Ödemeler (Tahsilat)</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(!showPaymentForm)}>
                            <Plus className="h-4 w-4 mr-1" /> Ödeme Ekle
                        </Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        {showPaymentForm && (
                            <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-sm font-medium mb-3">Ödeme Yöntemi Seçin</p>
                                <div className="flex flex-wrap gap-2">
                                    {PAYMENT_METHODS.map(method => (
                                        <Button
                                            key={method.value}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addPayment(method.value)}
                                            className="flex items-center gap-2"
                                        >
                                            <method.icon className="h-4 w-4" />
                                            {method.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {payments.map(payment => (
                                <div key={payment.id} className="flex gap-3 items-end p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                    <div className="w-40">
                                        <Label className="text-xs">Yöntem</Label>
                                        <Badge variant="secondary" className="mt-1 flex text-xs">
                                            {PAYMENT_METHODS.find(m => m.value === payment.odeme_yontemi)?.label}
                                        </Badge>
                                    </div>
                                    <div className="w-40">
                                        <Label className="text-xs">Kasa</Label>
                                        <Select
                                            value={payment.kasa_id?.toString() || ''}
                                            onValueChange={(val) => updatePayment(payment.id, 'kasa_id', val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seçin..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {accounts
                                                    .filter(acc => {
                                                        if (acc.para_birimi !== paraBirimi) return false;
                                                        if (payment.odeme_yontemi === 'nakit' && acc.tip !== 'NAKIT') return false;
                                                        if (payment.odeme_yontemi === 'kredi_karti' && acc.tip !== 'POS') return false;
                                                        if (payment.odeme_yontemi === 'havale' && acc.tip !== 'BANKA') return false;
                                                        return true;
                                                    })
                                                    .map(acc => (
                                                        <SelectItem key={acc.id} value={acc.id.toString()}>
                                                            {acc.ad} ({formatCurrency(acc.bakiye)})
                                                        </SelectItem>
                                                    ))
                                                }
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-xs">Tutar</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={payment.tutar}
                                            onChange={(e) => updatePayment(payment.id, 'tutar', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    {payment.odeme_yontemi === 'kredi_karti' && (
                                        <div className="w-24">
                                            <Label className="text-xs">Taksit</Label>
                                            <Select
                                                value={payment.taksit_sayisi.toString()}
                                                onValueChange={(val) => updatePayment(payment.id, 'taksit_sayisi', parseInt(val))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[1, 2, 3, 4, 5, 6, 9, 12].map(n => (
                                                        <SelectItem key={n} value={n.toString()}>
                                                            {n === 1 ? 'Tek Çekim' : `${n} Taksit`}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removePayment(payment.id)}
                                        className="text-rose-500"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {payments.length === 0 && (
                                <p className="text-slate-500 text-center py-4">Satır bazında girilen hizmetlerin tahsilatı için ödeme ekleyin.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Notlar */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="col-span-2">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-lg">Ek Bilgiler</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                            <div>
                                <Label>Vade Tarihi (Opsiyonel)</Label>
                                <Input
                                    type="date"
                                    value={vadeTarihi}
                                    onChange={(e) => setVadeTarihi(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Notlar</Label>
                                <Textarea
                                    placeholder="Ek notlar..."
                                    value={notlar}
                                    onChange={(e) => setNotlar(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Sağ Panel - Özet */}
            <div className="lg:col-span-1">
                <Card className="sticky top-6 border-emerald-200">
                    <CardHeader className="bg-emerald-50 rounded-t-lg p-4 pb-3">
                        <CardTitle className="text-lg text-emerald-800">Özet</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-4 space-y-3">
                        <div className="flex justify-between items-center pb-3 border-b">
                            <span className="text-slate-600">Toplam Tutar</span>
                            <span className="text-2xl font-bold text-slate-900">{formatCurrency(totalAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600">Ödenen</span>
                            <span className="font-medium text-emerald-600">{formatCurrency(totalPayments)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t">
                            <span className="text-slate-600 font-medium">Kalan</span>
                            <span className={`text-xl font-bold ${remainingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {formatCurrency(remainingAmount)}
                            </span>
                        </div>

                        {remainingAmount > 0 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-amber-800 text-sm">
                                    Kalan tutar hesaba borç olarak yansıtılacak.
                                </p>
                            </div>
                        )}

                        <div className="pt-4 flex flex-col gap-2">
                            <Button
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                                onClick={handleSubmit}
                                disabled={saving}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </Button>
                            {onCancel && (
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={onCancel}
                                    disabled={saving}
                                >
                                    İptal
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
