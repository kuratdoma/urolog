'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Loader2, Activity, Users, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/auth-store';

const formSchema = z.object({
    tarih: z.string().optional(),
    ameliyat: z.string().min(2, 'Ameliyat adı girilmelidir'),
    pre_op_tani: z.string().optional(),
    post_op_tani: z.string().optional(),

    ekip: z.string().optional(),
    hemsire: z.string().optional(),
    anestezi_ekip: z.string().optional(),
    anestezi_tur: z.string().optional(),

    notlar: z.string().optional(),
    patoloji: z.string().optional(),
    post_op: z.string().optional(),
    video_url: z.string().optional(),
});

interface CreateOperationDialogProps {
    patientId: string;
}

export function CreateOperationDialog({ patientId }: CreateOperationDialogProps) {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            tarih: format(new Date(), 'yyyy-MM-dd'),
            ameliyat: '',
            pre_op_tani: '', post_op_tani: '',
            ekip: user?.full_name || '', hemsire: '', anestezi_ekip: '', anestezi_tur: '',
            notlar: '', patoloji: '', post_op: '', video_url: '',
        },
    });

    const createOpMutation = useMutation({
        mutationFn: (values: z.infer<typeof formSchema>) =>
            api.clinical.createOperation({ ...values, hasta_id: patientId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['operations', patientId] }); // Assuming queryKey usage
            toast.success('Operasyon kaydı oluşturuldu');
            setOpen(false);
            form.reset();
        },
        onError: (error) => {
            toast.error('Operasyon oluşturulurken hata oluştu');
            console.error(error);
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        const data = Object.fromEntries(
            Object.entries(values).map(([key, value]) => [key, value === '' ? undefined : value])
        );
        createOpMutation.mutate(data as any);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Operasyon
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Yeni Operasyon Kaydı</DialogTitle>
                    <DialogDescription>
                        Operasyon detaylarını giriniz.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <Tabs defaultValue="genel" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="genel">
                                    <Activity className="mr-2 h-4 w-4" /> Genel
                                </TabsTrigger>
                                <TabsTrigger value="ekip">
                                    <Users className="mr-2 h-4 w-4" /> Ekip & Anestezi
                                </TabsTrigger>
                                <TabsTrigger value="detay">
                                    <FileText className="mr-2 h-4 w-4" /> Detaylar
                                </TabsTrigger>
                            </TabsList>

                            {/* Tab 1: Genel */}
                            <TabsContent value="genel" className="space-y-4 pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="tarih" render={({ field }) => (
                                        <FormItem><FormLabel>Tarih</FormLabel><FormControl><DatePicker date={field.value} setDate={field.onChange} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="ameliyat" render={({ field }) => (
                                        <FormItem><FormLabel>Ameliyat Adı/Kodu</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="pre_op_tani" render={({ field }) => (
                                    <FormItem><FormLabel>Pre-Op Tanı</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="post_op_tani" render={({ field }) => (
                                    <FormItem><FormLabel>Post-Op Tanı</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </TabsContent>

                            {/* Tab 2: Ekip */}
                            <TabsContent value="ekip" className="space-y-4 pt-4">
                                <FormField control={form.control} name="ekip" render={({ field }) => (
                                    <FormItem><FormLabel>Cerrahi Ekip</FormLabel><FormControl><Input placeholder="Cerrah, Asistan..." {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="hemsire" render={({ field }) => (
                                    <FormItem><FormLabel>Hemşire</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="anestezi_ekip" render={({ field }) => (
                                        <FormItem><FormLabel>Anestezi Ekibi</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="anestezi_tur" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Anestezi Türü</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="GENEL">Genel</SelectItem>
                                                    <SelectItem value="SPINAL">Spinal</SelectItem>
                                                    <SelectItem value="LOKAL">Lokal</SelectItem>
                                                    <SelectItem value="SEDATE">Sedasyon</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>
                            </TabsContent>

                            {/* Tab 3: Detay */}
                            <TabsContent value="detay" className="space-y-4 pt-4">
                                <FormField control={form.control} name="notlar" render={({ field }) => (
                                    <FormItem><FormLabel>Ameliyat Notları</FormLabel><FormControl><Textarea className="h-32" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="patoloji" render={({ field }) => (
                                    <FormItem><FormLabel>Patoloji Durumu/Sonucu</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="post_op" render={({ field }) => (
                                    <FormItem><FormLabel>Post-Op Takip Notları</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="video_url" render={({ field }) => (
                                    <FormItem><FormLabel>Video URL / Kayıt Yolu</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </TabsContent>
                        </Tabs>

                        <div className="flex justify-end pt-4 border-t">
                            <Button type="submit" disabled={createOpMutation.isPending} className="bg-red-600 hover:bg-red-700">
                                {createOpMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Operasyonu Kaydet
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
