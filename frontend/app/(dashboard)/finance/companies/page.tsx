'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
    Building2,
    ArrowLeft,
    Plus,
    RefreshCw,
    Phone,
    Mail,
    MapPin,
    Eye,
    Edit,
    AlertTriangle
} from 'lucide-react';
import { api, Firma, FirmaBorcOzet } from '@/lib/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
    }).format(amount);
};

export default function CompaniesPage() {
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState<Firma[]>([]);
    const [debts, setDebts] = useState<FirmaBorcOzet[]>([]);

    // New/Edit Dialog
    const [showDialog, setShowDialog] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        ad: '',
        vergi_no: '',
        telefon: '',
        email: '',
        adres: '',
        notlar: ''
    });
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [companiesRes, debtsRes] = await Promise.all([
                api.finance.getCompanies(),
                api.finance.getCompanyDebts()
            ]);
            setCompanies(companiesRes);
            setDebts(debtsRes);
        } catch (error) {
            console.error('Veriler yüklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getDebt = (companyId: number): number => {
        const debt = debts.find(d => d.id === companyId);
        return debt?.toplam_borc || 0;
    };

    const openNewDialog = () => {
        setEditingId(null);
        setFormData({ ad: '', vergi_no: '', telefon: '', email: '', adres: '', notlar: '' });
        setShowDialog(true);
    };

    const openEditDialog = (company: Firma) => {
        setEditingId(company.id);
        setFormData({
            ad: company.ad,
            vergi_no: company.vergi_no || '',
            telefon: company.telefon || '',
            email: company.email || '',
            adres: company.adres || '',
            notlar: company.notlar || ''
        });
        setShowDialog(true);
    };

    const handleSubmit = async () => {
        if (!formData.ad) {
            toast.error('Firma adı zorunlu');
            return;
        }

        setSaving(true);
        try {
            if (editingId) {
                await api.finance.updateCompany(editingId, formData);
                toast.success('Firma güncellendi');
            } else {
                await api.finance.createCompany(formData);
                toast.success('Firma oluşturuldu');
            }
            setShowDialog(false);
            fetchData();
        } catch (error) {
            toast.error('İşlem başarısız');
        } finally {
            setSaving(false);
        }
    };

    const totalDebt = debts.reduce((sum, d) => sum + d.toplam_borc, 0);

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
                            <Building2 className="h-6 w-6 text-blue-600" />
                            Firma Yönetimi
                        </h1>
                        <p className="text-slate-500 text-sm">Tedarikçiler ve borç takibi</p>
                    </div>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={openNewDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Firma
                </Button>
            </div>

            {/* Summary */}
            {totalDebt > 0 && (
                <Card className="mb-6 bg-amber-50 border-amber-200">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-6 w-6 text-amber-600" />
                                <div>
                                    <p className="font-medium text-amber-800">Toplam Firma Borcu</p>
                                    <p className="text-sm text-amber-600">{debts.filter(d => d.toplam_borc > 0).length} firmaya borç var</p>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-amber-700">{formatCurrency(totalDebt)}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Companies Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                </div>
            ) : companies.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-slate-500">
                        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>Henüz firma eklenmemiş</p>
                        <Button className="mt-4" onClick={openNewDialog}>
                            <Plus className="h-4 w-4 mr-2" />
                            İlk Firmayı Ekle
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {companies.map(company => {
                        const debt = getDebt(company.id);

                        return (
                            <Card key={company.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-lg">{company.ad}</CardTitle>
                                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(company)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {company.vergi_no && (
                                        <p className="text-xs text-slate-500">VKN: {company.vergi_no}</p>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {company.telefon && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Phone className="h-4 w-4" />
                                            {company.telefon}
                                        </div>
                                    )}
                                    {company.email && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Mail className="h-4 w-4" />
                                            {company.email}
                                        </div>
                                    )}
                                    {company.adres && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <MapPin className="h-4 w-4" />
                                            <span className="line-clamp-1">{company.adres}</span>
                                        </div>
                                    )}

                                    <div className="pt-3 border-t">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-500">Borç Durumu</span>
                                            {debt > 0 ? (
                                                <Badge className="bg-amber-100 text-amber-700">
                                                    {formatCurrency(debt)}
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-emerald-100 text-emerald-700">
                                                    Borç Yok
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? 'Firma Düzenle' : 'Yeni Firma Ekle'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Firma Adı *</Label>
                            <Input
                                value={formData.ad}
                                onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                                placeholder="Firma adı"
                            />
                        </div>
                        <div>
                            <Label>Vergi No</Label>
                            <Input
                                value={formData.vergi_no}
                                onChange={(e) => setFormData({ ...formData, vergi_no: e.target.value })}
                                placeholder="Vergi kimlik numarası"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Telefon</Label>
                                <Input
                                    value={formData.telefon}
                                    onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                                    placeholder="Telefon"
                                />
                            </div>
                            <div>
                                <Label>E-posta</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="E-posta"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Adres</Label>
                            <Textarea
                                value={formData.adres}
                                onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                                placeholder="Adres"
                            />
                        </div>
                        <div>
                            <Label>Notlar</Label>
                            <Textarea
                                value={formData.notlar}
                                onChange={(e) => setFormData({ ...formData, notlar: e.target.value })}
                                placeholder="Ek notlar..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>İptal</Button>
                        <Button onClick={handleSubmit} disabled={saving}>
                            {saving ? 'Kaydediliyor...' : (editingId ? 'Güncelle' : 'Oluştur')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
