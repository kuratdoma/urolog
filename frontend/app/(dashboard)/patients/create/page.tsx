'use client';

import { PatientForm } from '@/components/patients/patient-form';
import { api } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Suspense } from 'react';

function CreatePatientContent() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const ad = searchParams.get('ad') || '';
    const soyad = searchParams.get('soyad') || '';

    const createMutation = useMutation({
        mutationFn: api.patients.create,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['patients'] });
            toast.success('Hasta başarıyla oluşturuldu');
            router.push(`/patients/${data.id}`);
        },
        onError: (error) => {
            console.error(error);
            toast.error(`Hata: ${error.message}`);
        },
    });

    const handleSubmit = async (data: any) => {
        // Prepare data for backend: convert empty strings to null
        const cleanData = Object.fromEntries(
            Object.entries(data).map(([key, value]) => {
                if (value === "") return [key, null];
                return [key, value];
            })
        );
        createMutation.mutate(cleanData as any);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 hidden">Yeni Hasta Kaydı</h1>
            <PatientForm
                onSubmit={handleSubmit}
                initialData={ad || soyad ? { ad, soyad } : undefined}
                isEditing={true}
                isSubmitting={createMutation.isPending}
            />
        </div>
    );
}

export default function CreatePatientPage() {
    return (
        <Suspense fallback={<div>Yükleniyor...</div>}>
            <CreatePatientContent />
        </Suspense>
    );
}
