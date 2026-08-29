'use client';

import { Card, CardContent } from '@/components/ui/card';
import { FlaskConical, Construction } from 'lucide-react';

export default function LabPage() {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900">
                    <FlaskConical className="h-8 w-8 text-teal-600" />
                    Laboratuvar Sonuçları
                </h1>
                <p className="text-slate-500 mt-2">
                    Hemogram, Biyokimya, PSA ve Patoloji sonuçları.
                </p>
            </div>

            <Card className="border-dashed border-2 border-slate-200 bg-slate-50">
                <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                    <Construction className="h-12 w-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">Entegrasyon Bekleniyor</h3>
                    <p className="text-slate-500 max-w-md mt-2">
                        Lab sonuçları entegrasyonu (PDF Import / HL7) şu anda yapılandırılmaktadır.
                        Manuel sonuç girişi için Hasta Detay sayfasını kullanabilirsiniz.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
