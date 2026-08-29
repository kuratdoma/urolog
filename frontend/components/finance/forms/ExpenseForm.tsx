'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingDown, Plus, Trash2, Save, Building2, CreditCard, Banknote, Upload, FileText, User, X } from 'lucide-react';
import { api, FinansKategori, FinansKasa, Firma, Patient, Muayene, Doktor } from '@/lib/api';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ExpenseLine {
    id: string;
    aciklama: string;
    adet: number;
    birim_fiyat: number;
    toplam: number;
}

const PAYMENT_METHODS = [
    { value: 'nakit', label: 'Nakit', icon: Banknote },
    { value: 'kredi_karti', label: 'Kredi Kartı', icon: CreditCard },
    { value: 'havale', label: 'Havale/EFT', icon: Building2 },
];

export interface ExpenseFormProps {
    patientId?: string;
    patientName?: string;
    requireClinicalLink?: boolean;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function ExpenseForm({ patientId: initialPatientId, patientName: initialPatientName, requireClinicalLink = false, onSuccess, onCancel }: ExpenseFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Data
    const [categories, setCategories] = useState<FinansKategori[]>([]);
    const [accounts, setAccounts] = useState<FinansKasa[]>([]);
    const [companies, setCompanies] = useState<Firma[]>([]);
    const [muayeneler, setMuayeneler] = useState<Muayene[]>([]);
    const [doktorlar, setDoktorlar] = useState<Doktor[]>([]);
    const [doktor, setDoktor] = useState('');

    // Form State
    const [tarih, setTarih] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [paraBirimi, setParaBirimi] = useState('TRY');
    const [kategoriId, setKategoriId] = useState<string>('');
    const [aciklama, setAciklama] = useState('');
    const [notlar, setNotlar] = useState('');
    const [vadeTarihi, setVadeTarihi] = useState('');
    const [firmaId, setFirmaId] = useState<string>('');
    const [odemeYontemi, setOdemeYontemi] = useState<string>('');
    const [kasaId, setKasaId] = useState<string>('');
    const [belgeUrl, setBelgeUrl] = useState('');
    const [muayeneId, setMuayeneId] = useState<string>('');

    // Hasta Seçimi (Giderde Nadir Ama Hasta İadesi Gibi Durumlar İçin)
    const isPatientLocked = !!initialPatientId;
    const [hastaId, setHastaId] = useState<string | null>(initialPatientId || null);

    // New Company State
    const [openNewCompany, setOpenNewCompany] = useState(false);
    const [newCompanyData, setNewCompanyData] = useState({
        ad: '',
        vergi_no: '',
        telefon: '',
        email: ''
    });
    const [creatingCompany, setCreatingCompany] = useState(false);

    // Satırlar
    const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>([
        { id: '1', aciklama: '', adet: 1, birim_fiyat: 0, toplam: 0 }
    ]);

    // Ödeme durumu
    const [odemeYapildi, setOdemeYapildi] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [categoriesRes, accountsRes, companiesRes, doktorlarRes] = await Promise.all([
                    api.finance.getCategories('gider'),
                    api.finance.getAccounts(),
                    api.finance.getCompanies(),
                    api.definitions.doktorlar.list()
                ]);
                setCategories(categoriesRes);
                // Sadece aktif kasalar
                setAccounts(accountsRes.filter(a => a.aktif));
                setCompanies(companiesRes);
                setDoktorlar(doktorlarRes.filter(d => d.aktif));

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

    // Satır Yönetimi
    const addExpenseLine = () => {
        setExpenseLines([
            ...expenseLines,
            { id: Date.now().toString(), aciklama: '', adet: 1, birim_fiyat: 0, toplam: 0 }
        ]);
    };

    const removeExpenseLine = (id: string) => {
        if (expenseLines.length > 1) {
            setExpenseLines(expenseLines.filter(line => line.id !== id));
        }
    };

    const updateExpenseLine = (id: string, field: keyof ExpenseLine, value: any) => {
        setExpenseLines(expenseLines.map(line => {
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

    // New Company Handler
    const handleCreateCompany = async () => {
        if (!newCompanyData.ad) {
            toast.error('Firma adı zorunludur');
            return;
        }

        setCreatingCompany(true);
        try {
            const newCompany = await api.finance.createCompany(newCompanyData);
            setCompanies([...companies, newCompany]);
            setFirmaId(newCompany.id.toString());
            setOpenNewCompany(false);
            setNewCompanyData({ ad: '', vergi_no: '', telefon: '', email: '' });
            toast.success('Firma başarıyla oluşturuldu');
        } catch (error) {
            console.error('Firma oluşturma hatası:', error);
            toast.error('Firma oluşturulamadı');
        } finally {
            setCreatingCompany(false);
        }
    };

    // Hesaplamalar
    const totalAmount = expenseLines.reduce((sum, line) => sum + line.toplam, 0);

    // Kaydet
    const handleSubmit = async () => {
        if (expenseLines.every(l => !l.aciklama || l.toplam === 0)) {
            toast.error('En az bir gider satırı ekleyin');
            return;
        }

        if (requireClinicalLink && !muayeneId) {
            toast.error('Bu işlem için İlgili İşlem/Muayene bağlamı zorunludur.');
            return;
        }

        setSaving(true);
        try {
            const data = {
                tarih,
                islem_tipi: 'gider',
                durum: odemeYapildi ? 'tamamlandi' : 'bekliyor',
                kategori_id: kategoriId ? Number(kategoriId) : undefined,
                hasta_id: hastaId || undefined,
                muayene_id: muayeneId || undefined,
                aciklama: aciklama || 'Gider',
                tutar: totalAmount,
                para_birimi: paraBirimi,
                net_tutar: totalAmount,
                firma_id: (firmaId && firmaId !== '0') ? Number(firmaId) : undefined,
                kasa_id: kasaId ? Number(kasaId) : undefined,
                vade_tarihi: (!odemeYapildi && vadeTarihi) ? vadeTarihi : undefined,
                notlar,
                belge_url: belgeUrl || undefined,
                satirlar: expenseLines
                    .filter(l => l.aciklama && l.toplam > 0)
                    .map(l => ({
                        hizmet_adi: l.aciklama,
                        adet: l.adet,
                        birim_fiyat: l.birim_fiyat,
                        toplam: l.toplam,
                        doktor: doktor || undefined
                    })),
                odemeler: odemeYapildi && kasaId ? [{
                    kasa_id: Number(kasaId),
                    odeme_tarihi: tarih,
                    tutar: totalAmount,
                    odeme_yontemi: odemeYontemi || 'nakit'
                }] : []
            };

            await api.finance.createTransaction(data);
            toast.success('Gider kaydı oluşturuldu');

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
            <div className="lg:col-span-2 space-y-4">
                {/* Form */}
                <div className="space-y-4">
                    {/* Temel Bilgiler */}
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
                                        setKasaId('');
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
                                                className={kategoriId === cat.id.toString() ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}
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
                                {isPatientLocked && initialPatientName && (
                                    <div>
                                        <Label>İlgili Hasta</Label>
                                        <div className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg mt-1.5">
                                            <User className="h-4 w-4 text-slate-500" />
                                            <span className="font-medium text-slate-700">{initialPatientName}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    {isPatientLocked && (
                                        <div>
                                            <Label>İlgili Muayene/İşlem {requireClinicalLink && <span className="text-rose-500">*</span>}</Label>
                                            <Select value={muayeneId} onValueChange={setMuayeneId}>
                                                <SelectTrigger className="bg-white mt-1.5">
                                                    <SelectValue placeholder="Seçin..." />
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
                                    )}

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
                                    placeholder="Örn: Elektrik faturası, ofis malzemeleri, hasta iadesi vb."
                                    value={aciklama}
                                    onChange={(e) => setAciklama(e.target.value)}
                                />
                            </div>

                            {!isPatientLocked && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <Label>Firma / Tedarikçi (Opsiyonel)</Label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                            onClick={() => setOpenNewCompany(true)}
                                        >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Yeni Ekle
                                        </Button>
                                    </div>
                                    <Select value={firmaId} onValueChange={setFirmaId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Firma seçin..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">Seçilmedi</SelectItem>
                                            {companies.map(c => (
                                                <SelectItem key={c.id} value={c.id.toString()}>
                                                    {c.ad}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Gider Satırları */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                            <CardTitle className="text-lg">Gider Kalemleri</CardTitle>
                            <Button variant="outline" size="sm" onClick={addExpenseLine}>
                                <Plus className="h-4 w-4 mr-1" /> Satır Ekle
                            </Button>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="space-y-2">
                                {expenseLines.map((line) => (
                                    <div key={line.id} className="flex gap-2 items-end p-2 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="flex-1">
                                            <Label className="text-xs">Açıklama</Label>
                                            <Input
                                                placeholder="Gider açıklaması..."
                                                value={line.aciklama}
                                                onChange={(e) => updateExpenseLine(line.id, 'aciklama', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-20">
                                            <Label className="text-xs">Adet</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={line.adet}
                                                onChange={(e) => updateExpenseLine(line.id, 'adet', parseInt(e.target.value) || 1)}
                                            />
                                        </div>
                                        <div className="w-32">
                                            <Label className="text-xs">Birim Fiyat</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={line.birim_fiyat}
                                                onChange={(e) => updateExpenseLine(line.id, 'birim_fiyat', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="w-28 text-right">
                                            <Label className="text-xs">Toplam</Label>
                                            <p className="font-bold text-rose-600 py-2">{formatCurrency(line.toplam)}</p>
                                        </div>
                                        {expenseLines.length > 1 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeExpenseLine(line.id)}
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

                    {/* Ödeme Bilgileri */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-lg">Ödeme / Çıkış Bilgileri</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                            <div className="flex gap-4">
                                <Button
                                    variant={odemeYapildi ? 'default' : 'outline'}
                                    onClick={() => setOdemeYapildi(true)}
                                    className={odemeYapildi ? 'bg-rose-600 hover:bg-rose-700' : ''}
                                >
                                    Ödeme Yapıldı
                                </Button>
                                <Button
                                    variant={!odemeYapildi ? 'default' : 'outline'}
                                    onClick={() => setOdemeYapildi(false)}
                                    className={!odemeYapildi ? 'bg-amber-600 hover:bg-amber-700' : ''}
                                >
                                    Vadeli / Bekliyor
                                </Button>
                            </div>

                            {odemeYapildi ? (
                                <div className="grid grid-cols-2 gap-4 border border-rose-100 bg-rose-50/30 p-4 rounded-lg">
                                    <div>
                                        <Label>Ödeme Yöntemi</Label>
                                        <Select value={odemeYontemi} onValueChange={(val) => {
                                            setOdemeYontemi(val);
                                            setKasaId(''); // Reset account when method changes
                                        }}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Önce yöntem seçin..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PAYMENT_METHODS.map(m => (
                                                    <SelectItem key={m.value} value={m.value}>
                                                        {m.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Çıkış Yapılacak Kasa ({paraBirimi})</Label>
                                        <Select value={kasaId} onValueChange={setKasaId} disabled={!odemeYontemi}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={!odemeYontemi ? "Önce yöntem seçin" : "Hesap seçin..."} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {accounts
                                                    .filter(acc => {
                                                        // Filter by Currency
                                                        if (acc.para_birimi !== paraBirimi) return false;

                                                        // Filter by Method
                                                        if (odemeYontemi === 'nakit' && acc.tip !== 'NAKIT') return false;
                                                        if (odemeYontemi === 'kredi_karti' && acc.tip !== 'POS') return false;
                                                        if (odemeYontemi === 'havale' && acc.tip !== 'BANKA') return false;

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
                                        {!odemeYontemi && <p className="text-[10px] text-slate-500 mt-1">Lütfen önce ödeme yöntemini seçiniz.</p>}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <Label>Öngörülen Ödeme Tarihi (Vade)</Label>
                                    <Input
                                        type="date"
                                        className="mt-1"
                                        value={vadeTarihi}
                                        onChange={(e) => setVadeTarihi(e.target.value)}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Notlar */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-lg">Ek Belgeler</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                            <div>
                                <Label>Belge / Dekont URL (Opsiyonel)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Belge linki veya yolu..."
                                        value={belgeUrl}
                                        onChange={(e) => setBelgeUrl(e.target.value)}
                                    />
                                    <Button variant="outline" size="icon">
                                        <Upload className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <Label>Dahili Notlar</Label>
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
                <Card className="sticky top-6 border-rose-200 shadow-sm">
                    <CardHeader className="bg-rose-50 rounded-t-lg p-4 pb-3">
                        <CardTitle className="text-lg text-rose-800">Gider Özeti</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-4 space-y-3">
                        <div className="flex justify-between items-center pb-3 border-b">
                            <span className="text-slate-600">Toplam Gider Tutarı</span>
                            <span className="text-2xl font-bold text-slate-900">{formatCurrency(totalAmount)}</span>
                        </div>

                        <div className="pt-2">
                            <div className={`p-3 rounded-lg flex items-center gap-2 ${odemeYapildi ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                                {odemeYapildi ? (
                                    <>
                                        <Banknote className="h-4 w-4 shrink-0" />
                                        <span className="font-medium text-sm">Nakit çıkışı yapılacak</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <span className="font-medium text-sm">Borç olarak kaydedilecek</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 flex flex-col gap-2">
                            <Button
                                className="w-full bg-rose-600 hover:bg-rose-700"
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

            {/* New Company Dialog */}
            <Dialog open={openNewCompany} onOpenChange={setOpenNewCompany}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Yeni Firma / Tedarikçi Ekle</DialogTitle>
                        <DialogDescription>
                            Finansal işlemler için yeni bir cari kart oluşturun.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label>Firma Adı <span className="text-red-500">*</span></Label>
                            <Input
                                value={newCompanyData.ad}
                                onChange={(e) => setNewCompanyData({ ...newCompanyData, ad: e.target.value })}
                                placeholder="Örn: ABC Kırtasiye Ltd. Şti."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Vergi No (Opsiyonel)</Label>
                                <Input
                                    value={newCompanyData.vergi_no}
                                    onChange={(e) => setNewCompanyData({ ...newCompanyData, vergi_no: e.target.value })}
                                    placeholder="VKN / TCKN"
                                />
                            </div>
                            <div>
                                <Label>Telefon (Opsiyonel)</Label>
                                <Input
                                    value={newCompanyData.telefon}
                                    onChange={(e) => setNewCompanyData({ ...newCompanyData, telefon: e.target.value })}
                                    placeholder="0212..."
                                />
                            </div>
                        </div>
                        <div>
                            <Label>E-posta (Opsiyonel)</Label>
                            <Input
                                value={newCompanyData.email}
                                onChange={(e) => setNewCompanyData({ ...newCompanyData, email: e.target.value })}
                                placeholder="muhasebe@sirket.com"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenNewCompany(false)}>İptal</Button>
                        <Button onClick={handleCreateCompany} disabled={creatingCompany} className="bg-rose-600 hover:bg-rose-700">
                            {creatingCompany ? 'Oluşturuluyor...' : 'Oluştur'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
