'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Activity, ArrowRight } from 'lucide-react';

export default function OperationsPage() {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900">
                    <Activity className="h-8 w-8 text-red-600" />
                    Operasyon Yönetimi
                </h1>
                <p className="text-slate-500 mt-2">
                    Cerrahi operasyon kayıtları ve ameliyat raporları.
                </p>
            </div>

            <Card className="bg-red-50/50 border-red-100">
                <CardHeader>
                    <CardTitle className="text-red-700">Operasyon İşlemleri Hakkında</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-slate-700 leading-relaxed">
                        Sistemde operasyon kayıtları <strong>Hasta Odaklı</strong> olarak tutulmaktadır.
                        Yeni bir ameliyat kaydı girmek veya geçmiş ameliyat raporlarına ulaşmak için lütfen aşağıdaki adımları izleyiniz:
                    </p>

                    <ol className="list-decimal list-inside space-y-2 text-slate-700 ml-4 font-medium">
                        <li>"Hastalar" menüsüne gidiniz.</li>
                        <li>İşlem yapılacak hastayı arayıp seçiniz.</li>
                        <li>Hasta detay ekranında <strong>"Operasyon"</strong> sekmesine tıklayınız.</li>
                        <li>"Yeni Operasyon" butonunu kullanarak kaydı giriniz.</li>
                    </ol>

                    <div className="pt-4">
                        <Link href="/patients">
                            <Button className="bg-red-600 hover:bg-red-700 text-white gap-2">
                                Hasta Listesine Git
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
