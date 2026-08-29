'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
    ArrowLeft,
    BookOpen,
    Wallet,
    Tag,
    Briefcase,
    Building2,
    Receipt,
    Clock,
    Users,
    Settings,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Info,
    Ban,
    ArrowRight,
    CheckCircle2,
    CreditCard
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Kurulum adımları                                                    */
/* ------------------------------------------------------------------ */

const setupSteps = [
    {
        no: 1,
        icon: Wallet,
        color: 'purple',
        title: 'Kasa ve hesapları tanımlayın',
        where: '/finance/settings',
        whereLabel: 'Ayarlar › Kasalar',
        body: 'Para giriş/çıkışının izleneceği her kanal bir kasadır: Ana Kasa (nakit), POS cihazı, banka hesabı. Ödeme alırken hangi kasaya işleneceği seçilir; kasa tanımlı değilse ödeme kaydedilemez.',
        tips: [
            'Üç tip vardır: Ana Kasa (nakit), POS Cihazı, Banka Hesabı.',
            'Sistem hazır kasa ile gelmez — ilk kasayı siz oluşturursunuz.',
            'Banka hesabı eklerken banka adı ve IBAN alanlarını doldurun.',
            'Açılış bakiyesini kasa oluştururken girin — sonradan işlemle düzeltmek gerekir.',
            'Kapatılan kasalar listede gizlenir; "Kapalıları göster" ile görünür.',
        ],
    },
    {
        no: 2,
        icon: Tag,
        color: 'emerald',
        title: 'Gelir/gider kategorilerini oluşturun',
        where: '/finance/settings',
        whereLabel: 'Ayarlar › Kategoriler',
        body: 'Kategoriler raporların temelidir. Her kategori "gelir" ya da "gider" tipindedir. Kategorisiz işlemler raporlarda gruplanamaz.',
        tips: [
            'Gelir örnekleri: Muayene, Ameliyat, Tetkik, Paket Tedavi.',
            'Gider örnekleri: Kira, Personel, Sarf Malzeme, Laboratuvar.',
            'Az sayıda ve geniş kategoriyle başlayın; ihtiyaç doğdukça bölün.',
        ],
    },
    {
        no: 3,
        icon: Briefcase,
        color: 'blue',
        title: 'Hizmet listesini ve fiyatları girin',
        where: '/finance/settings',
        whereLabel: 'Ayarlar › Hizmetler',
        body: 'Hizmetler, gelir işlemi oluştururken seçtiğiniz kalemlerdir. Varsayılan fiyat tanımlarsanız işlem ekranında otomatik dolar — istenirse o işleme özel değiştirilebilir.',
        tips: [
            'Sık kullandığınız muayene ve işlem tiplerini önce girin.',
            'Fiyat değişince hizmeti güncelleyin; geçmiş işlemler etkilenmez.',
        ],
    },
    {
        no: 4,
        icon: Building2,
        color: 'amber',
        title: 'Tedarikçi firmaları ekleyin',
        where: '/finance/companies',
        whereLabel: 'Firmalar',
        body: 'Gider işlemlerini bir firmaya bağlarsanız firma bazlı borç takibi yapılır. Bu adım isteğe bağlıdır, sonradan da eklenebilir.',
        tips: [
            'Vergi dairesi ve vergi numarası alanları fatura eşleştirmede işe yarar.',
            'Ödenmemiş gider işlemleri firma borcu olarak toplanır.',
        ],
    },
];

/* ------------------------------------------------------------------ */
/* Modül haritası                                                      */
/* ------------------------------------------------------------------ */

const modulePages = [
    { href: '/finance', icon: TrendingUp, title: 'Panel', desc: 'Gelir/gider özeti, bugünün rakamları, vadesi geçmiş uyarıları.' },
    { href: '/finance/income', icon: TrendingUp, title: 'Gelirler', desc: 'Hasta ve hizmet bazlı tahsilat kayıtları.' },
    { href: '/finance/expenses', icon: TrendingDown, title: 'Giderler', desc: 'Firma ve kategori bazlı harcama kayıtları.' },
    { href: '/finance/transactions', icon: Receipt, title: 'Tüm İşlemler', desc: 'Tarih, tip, durum, kategori ve referans filtreleriyle arama.' },
    { href: '/finance/accounts', icon: Wallet, title: 'Kasalar', desc: 'Kasa bakiyeleri, hareket dökümü, kasalar arası transfer.' },
    { href: '/finance/debtors', icon: Users, title: 'Borçlu Hastalar', desc: 'Bakiyesi kapanmamış hastalar ve tahsilat oranları.' },
    { href: '/finance/overdue', icon: Clock, title: 'Vadesi Geçmiş', desc: 'Vadesi dolmuş, tahsilatı tamamlanmamış işlemler.' },
    { href: '/finance/companies', icon: Building2, title: 'Firmalar', desc: 'Tedarikçi kayıtları ve firma borç durumu.' },
    { href: '/finance/reports', icon: Receipt, title: 'Raporlar', desc: 'Aylık gelir/gider grafikleri ve dönemsel özetler.' },
    { href: '/finance/settings', icon: Settings, title: 'Ayarlar', desc: 'Kasa, hizmet ve kategori tanımları.' },
];

/* ------------------------------------------------------------------ */
/* Kavramlar                                                           */
/* ------------------------------------------------------------------ */

const concepts = [
    { term: 'Kasa', desc: 'Paranın fiilen durduğu yer (nakit, POS, banka). Her ödeme bir kasaya işlenir ve kasa bakiyesini anında değiştirir.' },
    { term: 'İşlem', desc: 'Bir gelir ya da gider kaydı. Kalemlerden (hizmetler) ve ödemelerden oluşur. Otomatik referans kodu alır: GEL-2026-00001 / GID-2026-00001.' },
    { term: 'Kalem', desc: 'İşlemin içindeki tek satır — hangi hizmet, kaç adet, birim fiyat.' },
    { term: 'Ödeme', desc: 'İşleme karşılık alınan tahsilat. Bir işlemin birden çok ödemesi olabilir (parçalı tahsilat).' },
    { term: 'Taksit', desc: 'Ödeme kaydında taksit sayısı 1\'den büyükse sistem otomatik taksit planı üretir ve vadeleri aylık dağıtır.' },
    { term: 'Vade tarihi', desc: 'İşlemin tahsil edilmesi gereken son tarih. Geçtiği hâlde tamamı tahsil edilmemiş işlemler "Vadesi Geçmiş" listesine düşer.' },
    { term: 'Cari / Bakiye', desc: 'Hastanın toplam tahakkuku eksi toplam ödemesi. Pozitif bakiye = hasta borçlu.' },
    { term: 'Durum', desc: 'bekliyor (tahsilat sürüyor), tamamlandi (kapandı), iptal (geçersiz kılındı).' },
];

const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', ring: 'ring-purple-200' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', ring: 'ring-emerald-200' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', ring: 'ring-blue-200' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', ring: 'ring-amber-200' },
};

export default function FinanceHelpPage() {
    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/finance">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <BookOpen className="h-6 w-6 text-emerald-600" />
                        Finans Modülü Kullanım Kılavuzu
                    </h1>
                    <p className="text-slate-500 text-sm">Kurulum, günlük kullanım ve kavramlar</p>
                </div>
            </div>

            <div className="max-w-4xl space-y-6">

                {/* Hızlı başlangıç uyarısı */}
                <Card className="border-emerald-200 bg-emerald-50">
                    <CardContent className="py-4">
                        <div className="flex gap-3">
                            <Info className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-emerald-900">
                                <p className="font-semibold mb-1">Modülü ilk kez mi kuruyorsunuz?</p>
                                <p>
                                    Aşağıdaki 4 adımı sırayla tamamlayın. Sıra önemlidir: kasa ve kategori
                                    tanımlı olmadan gelir/gider işlemi kaydedilemez.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* İlk kurulum */}
                <section>
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">İlk Kurulum</h2>
                    <div className="space-y-3">
                        {setupSteps.map(step => {
                            const c = colorMap[step.color];
                            const Icon = step.icon;
                            return (
                                <Card key={step.no}>
                                    <CardContent className="p-5">
                                        <div className="flex gap-4">
                                            <div className="shrink-0">
                                                <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center ring-4 ${c.ring}`}>
                                                    <Icon className={`h-5 w-5 ${c.text}`} />
                                                </div>
                                                <p className="text-center text-xs font-bold text-slate-400 mt-2">
                                                    {step.no}. adım
                                                </p>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                                    <h3 className="font-semibold text-slate-900">{step.title}</h3>
                                                    <Link href={step.where}>
                                                        <Button variant="outline" size="sm" className="h-7 text-xs">
                                                            {step.whereLabel}
                                                            <ArrowRight className="h-3 w-3 ml-1" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                                <p className="text-sm text-slate-600 mt-2">{step.body}</p>
                                                <ul className="mt-3 space-y-1">
                                                    {step.tips.map((tip, i) => (
                                                        <li key={i} className="flex gap-2 text-xs text-slate-500">
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-slate-300 shrink-0 mt-0.5" />
                                                            <span>{tip}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>

                {/* Günlük kullanım */}
                <section>
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">Günlük Kullanım</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                                    Gelir kaydetme
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-slate-600 space-y-2">
                                <p><span className="font-medium text-slate-900">1.</span> Panel &rsaquo; <span className="font-medium">Gelir Ekle</span></p>
                                <p><span className="font-medium text-slate-900">2.</span> Hastayı seçin (isteğe bağlı — hasta seçilirse cari hesabına işlenir).</p>
                                <p><span className="font-medium text-slate-900">3.</span> Hizmet kalemlerini ekleyin; tutar otomatik hesaplanır.</p>
                                <p><span className="font-medium text-slate-900">4.</span> Tahsilat aldıysanız ödeme satırı ekleyin ve kasayı seçin.</p>
                                <p><span className="font-medium text-slate-900">5.</span> Peşin değilse taksit sayısını girin — vade planı otomatik üretilir.</p>
                                <p className="pt-1 text-xs text-slate-500">
                                    Sonradan ödeme alırsanız işlemi açıp <span className="font-medium">Tahsilat Ekle</span> deyin;
                                    borç kapanınca durum kendiliğinden <span className="font-mono">tamamlandi</span> olur.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TrendingDown className="h-4 w-4 text-rose-600" />
                                    Gider kaydetme
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-slate-600 space-y-2">
                                <p><span className="font-medium text-slate-900">1.</span> Panel &rsaquo; <span className="font-medium">Gider Ekle</span></p>
                                <p><span className="font-medium text-slate-900">2.</span> Firmayı ve gider kategorisini seçin.</p>
                                <p><span className="font-medium text-slate-900">3.</span> Tutarı ve varsa vade tarihini girin.</p>
                                <p><span className="font-medium text-slate-900">4.</span> Ödeme yaptıysanız kasa seçerek ödeme ekleyin; kasa bakiyesi düşer.</p>
                                <p><span className="font-medium text-slate-900">5.</span> Ödemeyi sonra yapacaksanız durumu <span className="font-mono text-xs">bekliyor</span> bırakın — firma borcunda görünür.</p>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Önemli davranışlar */}
                <section>
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">Bilinmesi Gerekenler</h2>
                    <div className="space-y-3">
                        <Card className="border-amber-200">
                            <CardContent className="py-4">
                                <div className="flex gap-3">
                                    <Ban className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-semibold text-slate-900">İptal ile silme aynı şey değildir</p>
                                        <p className="text-slate-600 mt-1">
                                            <span className="font-medium">İptal</span>, işlemi kayıtta bırakır ve nedenini saklar;
                                            ödemeler kasadan geri alınır. <span className="font-medium">Silme</span> kaydı listelerden
                                            kaldırır (veritabanından fiziksel olarak silinmez) ve yalnızca yöneticiler yapabilir.
                                            Muhasebe izi için iptali tercih edin. Aynı ilke tanımlar için de geçerlidir:
                                            kasalar kapatılır, kullanımdaki kategori ve hizmetler silinemez.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200">
                            <CardContent className="py-4">
                                <div className="flex gap-3">
                                    <CreditCard className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-semibold text-slate-900">Tutar ve kasa sonradan değiştirilemez</p>
                                        <p className="text-slate-600 mt-1">
                                            Kayıtlı bir işlemde tarih, kategori, açıklama ve vade güncellenebilir; ancak
                                            tutar ve kasa alanları kasa bakiyesini bozacağı için kilitlidir. Bu bilgiler
                                            yanlışsa işlemi iptal edip yeniden oluşturun.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200">
                            <CardContent className="py-4">
                                <div className="flex gap-3">
                                    <AlertTriangle className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-semibold text-slate-900">Erişim yetkisi</p>
                                        <p className="text-slate-600 mt-1">
                                            Finans modülünün tamamı yalnızca <Badge variant="secondary" className="mx-1">Yönetici</Badge>
                                            ve <Badge variant="secondary" className="mx-1">Doktor</Badge> rollerine açıktır.
                                            Kasa, hizmet, kategori ve işlem <span className="font-medium">silme</span> yetkisi
                                            yalnızca yöneticilere aittir. Tüm işlemler denetim kaydına (audit log) yazılır.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Modül haritası */}
                <section>
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">Modül Haritası</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {modulePages.map(page => {
                            const Icon = page.icon;
                            return (
                                <Link key={page.href} href={page.href}>
                                    <Card className="hover:shadow-md hover:border-emerald-200 transition-all h-full">
                                        <CardContent className="p-4">
                                            <div className="flex gap-3">
                                                <div className="p-2 bg-slate-100 rounded-lg h-fit">
                                                    <Icon className="h-4 w-4 text-slate-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-slate-900 text-sm">{page.title}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{page.desc}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                </section>

                {/* Kavramlar */}
                <section>
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">Kavramlar</h2>
                    <Card>
                        <CardContent className="p-0 divide-y divide-slate-100">
                            {concepts.map(c => (
                                <div key={c.term} className="p-4 flex flex-col md:flex-row md:gap-6">
                                    <p className="font-semibold text-slate-900 text-sm md:w-40 shrink-0">{c.term}</p>
                                    <p className="text-sm text-slate-600 mt-1 md:mt-0">{c.desc}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </section>

                {/* Sorun giderme */}
                <section className="pb-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">Sık Karşılaşılan Durumlar</h2>
                    <Card>
                        <CardContent className="p-0 divide-y divide-slate-100">
                            <div className="p-4">
                                <p className="font-medium text-slate-900 text-sm">İşlem kaydederken kasa listesi boş geliyor</p>
                                <p className="text-sm text-slate-600 mt-1">
                                    Henüz kasa tanımlanmamış. <Link href="/finance/settings" className="text-blue-600 hover:underline">Ayarlar &rsaquo; Kasalar</Link> bölümünden en az bir kasa ekleyin.
                                </p>
                            </div>
                            <div className="p-4">
                                <p className="font-medium text-slate-900 text-sm">Kasa bakiyesi beklediğimden farklı</p>
                                <p className="text-sm text-slate-600 mt-1">
                                    <Link href="/finance/accounts" className="text-blue-600 hover:underline">Kasalar</Link> sayfasında ilgili kasanın hareket dökümünü açın.
                                    Her satır önceki ve sonraki bakiyeyi gösterir; farkın hangi işlemden geldiği buradan izlenir.
                                </p>
                            </div>
                            <div className="p-4">
                                <p className="font-medium text-slate-900 text-sm">Hasta sonradan ödeme yaptı, nasıl işlerim?</p>
                                <p className="text-sm text-slate-600 mt-1">
                                    İlgili işlemi açın ve <span className="font-medium">Tahsilat Ekle</span> butonunu kullanın.
                                    Ayrı bir gelir işlemi açmayın — bu borcu kapatmaz, yeni tahakkuk oluşturur.
                                    Tahsilat girildiğinde kasa bakiyesi artar ve borç tamamen kapandıysa işlem
                                    otomatik olarak <span className="font-mono text-xs">tamamlandi</span> durumuna geçer.
                                </p>
                            </div>
                            <div className="p-4">
                                <p className="font-medium text-slate-900 text-sm">Kasayı silemiyorum</p>
                                <p className="text-sm text-slate-600 mt-1">
                                    Kasalar silinmez, <span className="font-medium">kapatılır</span> (pasife alınır) — hareket
                                    geçmişi muhasebe kaydı olduğu için korunur. Bakiyesi sıfır olmayan kasa kapatılamaz;
                                    önce bakiyeyi başka bir kasaya transfer edin.
                                </p>
                            </div>
                            <div className="p-4">
                                <p className="font-medium text-slate-900 text-sm">Kategori veya hizmet silinmiyor</p>
                                <p className="text-sm text-slate-600 mt-1">
                                    Geçmiş işlemlerde kullanılan kategori ve hizmetler silinemez — silinirse eski
                                    kayıtların dökümü bozulur. Yeni işlemlerde çıkmaması için ilgili kaydı
                                    <span className="font-medium"> pasife alın</span>.
                                </p>
                            </div>
                            <div className="p-4">
                                <p className="font-medium text-slate-900 text-sm">Raporlarda kategorisiz tutarlar var</p>
                                <p className="text-sm text-slate-600 mt-1">
                                    Kategori seçilmeden kaydedilmiş işlemler var demektir.
                                    <Link href="/finance/transactions" className="text-blue-600 hover:underline mx-1">Tüm İşlemler</Link>
                                    sayfasından bu kayıtları bulup kategori atayabilirsiniz.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </section>

            </div>
        </div>
    );
}
