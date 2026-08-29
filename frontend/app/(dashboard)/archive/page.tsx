'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function ArchivePage() {
    return (
        <div className="p-8"><Card className="bg-slate-50"><CardContent className="h-64 flex flex-col items-center justify-center"><Construction className="h-12 w-12 text-slate-300 mb-4" /><h3 className="text-lg font-medium text-slate-900">Belge Arşivi</h3><p className="text-slate-500">Yapım aşamasında</p></CardContent></Card></div>
    );
}
