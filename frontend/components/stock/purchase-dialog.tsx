import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StockProduct, StockPurchaseCreate } from "@/lib/api";

const formSchema = z.object({
    urun_id: z.coerce.number().int().min(1, "Ürün seçiniz"),
    miktar: z.coerce
        .number()
        .int("Miktar tam sayı olmalıdır")
        .min(1, "Miktar en az 1 olmalıdır"),
    birim_fiyat: z.coerce.number().min(0, "Birim fiyat negatif olamaz"),
    fatura_no: z.string().optional(),
    notlar: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    products: StockProduct[];
    /** Önceden seçili ürün (ürün satırından açıldığında) */
    defaultProductId?: number;
    onSubmit: (values: StockPurchaseCreate) => Promise<void>;
}

const currency = (value: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);

export function PurchaseDialog({
    open,
    onOpenChange,
    products,
    defaultProductId,
    onSubmit,
}: PurchaseDialogProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            urun_id: defaultProductId ?? 0,
            miktar: 1,
            birim_fiyat: 0,
            fatura_no: "",
            notlar: "",
        },
    });

    useEffect(() => {
        if (!open) return;
        const secili = products.find((p) => p.id === defaultProductId);
        form.reset({
            urun_id: defaultProductId ?? 0,
            miktar: 1,
            // Son alış fiyatını başlangıç değeri olarak öner
            birim_fiyat: Number(secili?.birim_fiyat ?? 0),
            fatura_no: "",
            notlar: "",
        });
    }, [open, defaultProductId, products, form]);

    const miktar = Number(form.watch("miktar")) || 0;
    const birimFiyat = Number(form.watch("birim_fiyat")) || 0;
    const toplam = miktar * birimFiyat;

    const handleSubmit = async (values: FormValues) => {
        await onSubmit(values);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Yeni Stok Alımı</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="urun_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ürün</FormLabel>
                                    <Select
                                        onValueChange={(v) => field.onChange(Number(v))}
                                        value={field.value ? String(field.value) : undefined}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Ürün seçiniz" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {products.map((p) => (
                                                <SelectItem key={p.id} value={String(p.id)}>
                                                    {p.urun_adi}
                                                    {p.marka ? ` — ${p.marka}` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="miktar"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Miktar</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="birim_fiyat"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Birim Fiyat</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" min={0} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="p-3 bg-muted rounded-md text-sm flex justify-between">
                            <span>Toplam Tutar:</span>
                            <span className="font-bold">{currency(toplam)}</span>
                        </div>

                        <FormField
                            control={form.control}
                            name="fatura_no"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fatura No</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Opsiyonel" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Alım, stok girişi olarak hareket geçmişine de yazılır.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notlar"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notlar</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Açıklama giriniz..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit">Kaydet</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
