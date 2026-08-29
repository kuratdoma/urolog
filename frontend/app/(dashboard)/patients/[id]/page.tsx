'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Muayene } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Stethoscope, Activity, FlaskConical, FileText, CreditCard, History, FileSignature, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { CreateOperationDialog } from '@/components/clinical/create-operation-dialog';
import { useParams, useRouter } from 'next/navigation';
import { PatientForm } from '@/components/patients/patient-form';
import { PatientTimeline } from '@/components/patients/patient-timeline';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DeletePatientDialog } from '@/components/patients/delete-patient-dialog';
import { usePatientStore } from '@/stores/patient-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useState, useEffect, useMemo } from 'react';
import { ConsentFormDialog } from '@/components/patients/consent-form-dialog';
import { HPVBriefingPanel } from '@/components/clinical/HPVBriefingPanel';


export default function PatientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [consentDialogOpen, setConsentDialogOpen] = useState(false);
    const [isKvkkPrinting, setIsKvkkPrinting] = useState(false);
    const { aiHpvBriefingEnabled } = useSettingsStore();
    const patientId = String(params.id);

    const handleKvkkClick = async () => {
        setIsKvkkPrinting(true);
        try {
            await api.consentForms.preview('kvkk-onam-formu', patientId);
            toast.success('KVKK Onam Formu yeni sekmede açıldı');
        } catch (error: any) {
            toast.error(error.message || 'KVKK Onam Formu oluşturulamadı');
        } finally {
            setIsKvkkPrinting(false);
        }
    };
    const queryClient = useQueryClient();
    const { setActivePatient } = usePatientStore();

    const { data: patient, isLoading: patientLoading } = useQuery({
        queryKey: ['patient', patientId],
        queryFn: () => api.patients.get(patientId),
    });

    useEffect(() => {
        if (patient) {
            setActivePatient(patient);
        }
    }, [patient, setActivePatient]);

    const { data: muayeneler, isLoading: muayeneLoading } = useQuery({
        queryKey: ['muayeneler', patientId],
        queryFn: () => api.clinical.getMuayeneler(patientId),
    });

    const { data: operations, isLoading: opLoading } = useQuery({
        queryKey: ['operations', patientId],
        queryFn: () => api.clinical.getOperations(patientId),
    });

    const deleteMutation = useMutation({
        mutationFn: () => api.patients.delete(patientId),
        onSuccess: () => {
            setDeleteDialogOpen(false); // Close dialog
            toast.success('Hasta silindi');
            router.push('/patients');
        },
        onError: () => {
            toast.error('Hasta silinemedi');
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.patients.update(patientId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
            queryClient.invalidateQueries({ queryKey: ['patients'] });
            toast.success('Hasta bilgileri güncellendi');
        },
        onError: () => {
            toast.error('Güncelleme sırasında hata oluştu');
        }
    });

    const handleUpdate = async (data: any) => {
        // Clean up empty strings to null for backend
        const cleanData = Object.fromEntries(
            Object.entries(data).map(([key, value]) => {
                if (value === "") return [key, null];
                return [key, value];
            })
        );
        updateMutation.mutate(cleanData);
    };

    if (patientLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-[600px] w-full" />
            </div>
        );
    }

    if (!patient) {
        return <div>Hasta bulunamadı</div>;
    }

    return (
        <div className="flex gap-6 h-[calc(100vh-theme(spacing.8))]">
            {/* Main Content - Left Side */}
            <div className="flex-1 space-y-6 overflow-auto pr-2">
                {/* Breadcrumb / Back */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Link href="/patients" className="hover:text-slate-900 flex items-center gap-1">
                            <ArrowLeft className="h-4 w-4" />
                            Hasta Listesi
                        </Link>
                        <span>/</span>
                        <span className="font-medium text-slate-900">{patient.ad} {patient.soyad}</span>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleKvkkClick}
                            disabled={isKvkkPrinting}
                            className="flex items-center gap-1.5"
                            id="kvkk-form-btn"
                        >
                            {isKvkkPrinting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <FileText className="h-4 w-4" />
                            )}
                            KVKK
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConsentDialogOpen(true)}
                            className="flex items-center gap-1.5"
                            id="consent-form-open-btn"
                        >
                            <FileSignature className="h-4 w-4" />
                            Onam Formu
                        </Button>
                    </div>
                </div>


                {/* HPV/Kondilom Briefing — sadece ilgili tanısı olan hastalar için ve ayar açıksa */}
                {aiHpvBriefingEnabled && muayeneler && muayeneler.length > 0 && (() => {
                    const hpvKeywords = ['kondilom', 'hpv', 'siğil', 'sigil', 'condyloma', 'b07', 'a63'];
                    const hasHPV = muayeneler.some((m: Muayene) => {
                        const fields = [m.tani1, m.tani2, m.tani3, m.tani4, m.tani5, m.tani1_kodu, m.tani2_kodu, m.tani3_kodu, m.sikayet, m.tedavi].filter(Boolean);
                        return fields.some((f: string) => hpvKeywords.some(k => f.toLowerCase().includes(k)));
                    });
                    return hasHPV ? <HPVBriefingPanel patientId={patientId} /> : null;
                })()}

                {/* Patient Form (Kimlik Bilgileri) */}
                <PatientForm
                    initialData={patient}
                    onSubmit={handleUpdate}
                    isEditing={false}
                    onDelete={() => setDeleteDialogOpen(true)}
                    patientId={patientId}
                />
            </div>

            {/* Right Sidebar - Transaction History */}
            <aside className="w-[260px] bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col shrink-0 h-full overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-gradient-to-r from-slate-50 to-white">
                    <History className="w-4 h-4 text-slate-500" />
                    <h3 className="font-bold text-sm text-slate-800">İşlem Geçmişi</h3>
                </div>
                <div className="flex-1 overflow-y-auto pr-1 [.custom-scrollbar]:scrollbar-thin [.custom-scrollbar]:scrollbar-thumb-slate-300 custom-scrollbar">
                    <PatientTimeline patientId={patientId} />
                </div>
            </aside>

            <DeletePatientDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={() => deleteMutation.mutate()}
                isDeleting={deleteMutation.isPending}
            />

            <ConsentFormDialog
                open={consentDialogOpen}
                onOpenChange={setConsentDialogOpen}
                patientId={patientId}
                patientName={`${patient.ad} ${patient.soyad}`}
                patientDoctor={patient.doktor}
            />
        </div>
    );
}
