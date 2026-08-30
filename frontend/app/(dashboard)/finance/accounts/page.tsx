'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import {
    CreditCard,
    Banknote,
    Building2,
    ArrowLeft,
    Plus,
    ArrowRightLeft,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Clock
} from 'lucide-react';
import { api, FinansKasa, KasaHareket } from '@/lib/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
    }).format(amount);
};

const KASA_ICONS = {
    nakit: Banknote,
    banka: Building2,
    pos: CreditCard,
};

const KASA_COLORS = {
    nakit: 'bg-green-100 text-green-700 border-green-200',
    banka: 'bg-blue-100 text-blue-700 border-blue-200',
    pos: 'bg-purple-100 text-purple-700 border-purple-200',
};

export default function AccountsPage() {
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState<FinansKasa[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<FinansKasa | null>(null);
    const [movements, setMovements] = useState<KasaHareket[]>([]);
    const [loadingMovements, setLoadingMovements] = useState(false);

    // Transfer Dialog
    const [showTransfer, setShowTransfer] = useState(false);
    const [transferFrom, setTransferFrom] = useState<string>('');
    const [transferTo, setTransferTo] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [transferNote, setTransferNote] = useState('');
    const [transferring, setTransferring] = useState(false);

    // New Account Dialog
    const [showNewAccount, setShowNewAccount] = useState(false);
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountType, setNewAccountType] = useState('');
    const [newAccountBalance, setNewAccountBalance] = useState('0');
    const [creating, setCreating] = useState(false);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await api.finance.getAccounts(false);
            setAccounts(res);
        } catch (error) {
            console.error('Kasalar yüklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMovements = async (accountId: number) => {
        setLoadingMovements(true);
        try {
            const res = await api.finance.getAccountMovements(accountId, { limit: 50 });
            setMovements(res);
        } catch (error) {
            console.error('Hareketler yüklenemedi:', error);
        } finally {
            setLoadingMovements(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        if (selectedAccount) {
            fetchMovements(selectedAccount.id);
        }
    }, [selectedAccount]);

    const handleTransfer = async () => {
        if (!transferFrom || !transferTo || !transferAmount || transferFrom === transferTo) {
            toast.error('Lütfen tüm alanları doldurun');
            return;
        }

        setTransferring(true);
        try {
            await api.finance.transferBetweenAccounts(
                Number(transferFrom),
                Number(transferTo),
                parseFloat(transferAmount),
                transferNote
            );
            toast.success('Transfer tamamlandı');
            setShowTransfer(false);
            setTransferFrom('');
            setTransferTo('');
            setTransferAmount('');
            setTransferNote('');
            fetchAccounts();
        } catch (error) {
            toast.error('Transfer başarısız');
        } finally {
            setTransferring(false);
        }
    };

    const handleCreateAccount = async () => {
        if (!newAccountName || !newAccountType) {
            toast.error('Ad ve tip zorunlu');
            return;
        }

        setCreating(true);
        try {
            await api.finance.createAccount({
                ad: newAccountName,
                tip: newAccountType,
                bakiye: parseFloat(newAccountBalance) || 0,
            });
            toast.success('Kasa oluşturuldu');
            setShowNewAccount(false);
            setNewAccountName('');
            setNewAccountType('');
            setNewAccountBalance('0');
            fetchAccounts();
        } catch (error) {
            toast.error('Kasa oluşturulamadı');
        } finally {
            setCreating(false);
        }
    };

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.bakiye, 0);

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
                            <CreditCard className="h-6 w-6 text-blue-600" />
                            Kasa Yönetimi
                        </h1>
                        <p className="text-slate-500 text-sm">Nakit, banka ve POS hesapları</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowTransfer(true)}>
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Transfer
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowNewAccount(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Yeni Kasa
                    </Button>
                </div>
            </div>

            {/* Total Balance */}
            <Card className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
                <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm">Toplam Bakiye</p>
                            <p className="text-4xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
                        </div>
                        <div className="flex gap-4">
                            {accounts.map(acc => {
                                const Icon = KASA_ICONS[acc.tip as keyof typeof KASA_ICONS] || Banknote;
                                return (
                                    <div key={acc.id} className="text-center bg-white/10 rounded-lg p-3">
                                        <Icon className="h-5 w-5 mx-auto mb-1" />
                                        <p className="text-xs text-blue-100">{acc.ad}</p>
                                        <p className="font-bold">{formatCurrency(acc.bakiye)}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Kasa Listesi */}
                <div className="lg:col-span-1 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        accounts.map(account => {
                            const Icon = KASA_ICONS[account.tip as keyof typeof KASA_ICONS] || Banknote;
                            const colorClass = KASA_COLORS[account.tip as keyof typeof KASA_COLORS] || KASA_COLORS.nakit;
                            const isSelected = selectedAccount?.id === account.id;

                            return (
                                <Card
                                    key={account.id}
                                    className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                                        }`}
                                    onClick={() => setSelectedAccount(account)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-3 rounded-xl ${colorClass}`}>
                                                    <Icon className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{account.ad}</p>
                                                    <p className="text-xs text-slate-500 capitalize">{account.tip}</p>
                                                </div>
                                            </div>
                                            {!account.aktif && (
                                                <Badge variant="secondary">Pasif</Badge>
                                            )}
                                        </div>
                                        <div className="mt-4">
                                            <p className="text-2xl font-bold text-slate-900">
                                                {formatCurrency(account.bakiye)}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">{account.para_birimi}</p>
                                        </div>
                                        {account.banka_adi && (
                                            <p className="text-sm text-slate-500 mt-2">{account.banka_adi}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>

                {/* Hareket Detayı */}
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                {selectedAccount ? `${selectedAccount.ad} - Hareketler` : 'Kasa Hareketleri'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!selectedAccount ? (
                                <div className="text-center py-12 text-slate-500">
                                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                    <p>Hareketleri görmek için bir kasa seçin</p>
                                </div>
                            ) : loadingMovements ? (
                                <div className="flex items-center justify-center py-8">
                                    <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                                </div>
                            ) : movements.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                    <p>Bu kasada henüz hareket yok</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                    {movements.map(movement => (
                                        <div
                                            key={movement.id}
                                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${movement.hareket_tipi === 'giris'
                                                        ? 'bg-emerald-100 text-emerald-600'
                                                        : 'bg-rose-100 text-rose-600'
                                                    }`}>
                                                    {movement.hareket_tipi === 'giris' ? (
                                                        <TrendingUp className="h-4 w-4" />
                                                    ) : (
                                                        <TrendingDown className="h-4 w-4" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">
                                                        {movement.aciklama ||
                                                            (movement.hareket_tipi === 'giris' ? 'Giriş' : 'Çıkış')
                                                        }
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {movement.tarih && format(new Date(movement.tarih), 'd MMM yyyy HH:mm', { locale: tr })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold ${movement.hareket_tipi === 'giris' ? 'text-emerald-600' : 'text-rose-600'
                                                    }`}>
                                                    {movement.hareket_tipi === 'giris' ? '+' : '-'}{formatCurrency(movement.tutar)}
                                                </p>
                                                {movement.sonraki_bakiye !== undefined && (
                                                    <p className="text-xs text-slate-500">
                                                        Bakiye: {formatCurrency(movement.sonraki_bakiye)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Transfer Dialog */}
            <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Kasalar Arası Transfer</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Kaynak Kasa</Label>
                            <Select value={transferFrom} onValueChange={setTransferFrom}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seçin..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id.toString()}>
                                            {acc.ad} ({formatCurrency(acc.bakiye)})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Hedef Kasa</Label>
                            <Select value={transferTo} onValueChange={setTransferTo}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seçin..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.filter(a => a.id.toString() !== transferFrom).map(acc => (
                                        <SelectItem key={acc.id} value={acc.id.toString()}>
                                            {acc.ad} ({formatCurrency(acc.bakiye)})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Tutar</Label>
                            <Input
                                type="number"
                                min={0}
                                value={transferAmount}
                                onChange={(e) => setTransferAmount(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <Label>Açıklama (Opsiyonel)</Label>
                            <Input
                                value={transferNote}
                                onChange={(e) => setTransferNote(e.target.value)}
                                placeholder="Transfer açıklaması..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTransfer(false)}>İptal</Button>
                        <Button onClick={handleTransfer} disabled={transferring}>
                            {transferring ? 'Aktarılıyor...' : 'Transfer Et'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* New Account Dialog */}
            <Dialog open={showNewAccount} onOpenChange={setShowNewAccount}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Yeni Kasa Ekle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Kasa Adı</Label>
                            <Input
                                value={newAccountName}
                                onChange={(e) => setNewAccountName(e.target.value)}
                                placeholder="Örn: Ana Kasa, İş Bankası vb."
                            />
                        </div>
                        <div>
                            <Label>Tip</Label>
                            <Select value={newAccountType} onValueChange={setNewAccountType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seçin..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="nakit">Nakit</SelectItem>
                                    <SelectItem value="banka">Banka</SelectItem>
                                    <SelectItem value="pos">POS</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Açılış Bakiyesi</Label>
                            <Input
                                type="number"
                                value={newAccountBalance}
                                onChange={(e) => setNewAccountBalance(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewAccount(false)}>İptal</Button>
                        <Button onClick={handleCreateAccount} disabled={creating}>
                            {creating ? 'Oluşturuluyor...' : 'Oluştur'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
