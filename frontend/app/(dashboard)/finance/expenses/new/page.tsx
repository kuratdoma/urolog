'use client';

import { ExpenseForm } from '@/components/finance/forms/ExpenseForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewExpensePage() {
    const router = useRouter();
    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/finance">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <TrendingDown className="h-6 w-6 text-rose-600" />
                            Yeni Gider Kaydı
                        </h1>
                        <p className="text-slate-500 text-sm">Fatura, personel, kira vb.</p>
                    </div>
                </div>
            </div>

            <ExpenseForm
                onSuccess={() => router.push('/finance')}
            />
        </div>
    );
}
