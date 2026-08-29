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
import { StockProduct } from "@/lib/api";

const formSchema = z.object({
    hareket_tipi: z.enum(["GIRIS", "CIKIS", "DUZELTME"]),
    miktar: z.coerce.number().min(1, "Miktar en az 1 olmalıdır"),
    kaynak: z.string().optional(),
    notlar: z.string().optional(),
});

interface MovementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: StockProduct | null;
    onSubmit: (values: any) => Promise<void>;
}

export function MovementDialog({
    open,
    onOpenChange,
    product,
    onSubmit,
}: MovementDialogProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            hareket_tipi: "CIKIS",
            miktar: 1,
            kaynak: "Manuel",
            notlar: "",
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                hareket_tipi: "CIKIS",
                miktar: 1,
                kaynak: "Manuel",
                notlar: "",
            });
        }
    }, [open, form]);

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!product) return;

        // API şemasına uygun hale getir
        const payload = {
            urun_id: product.id,
            ...values
        };

        await onSubmit(payload);
        onOpenChange(false);
    };

    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Stok Hareketi: {product.urun_adi}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="p-4 bg-muted rounded-md mb-4 text-sm">
                            <div className="flex justify-between">
                                <span>Mevcut Stok:</span>
                                <span className="font-bold">{product.mevcut_stok} {product.birim}</span>
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="hareket_tipi"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>İşlem Tipi</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seçiniz" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="GIRIS">Stok Girişi (+)</SelectItem>
                                            <SelectItem value="CIKIS">Stok Çıkışı (-)</SelectItem>
                                            <SelectItem value="DUZELTME">Düzeltme (Sayım)</SelectItem>
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
                                            <Input type="number" min="1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="kaynak"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kaynak / Neden</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seçiniz" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Manuel">Manuel İşlem</SelectItem>
                                                <SelectItem value="Zayi">Zayi / Hasar</SelectItem>
                                                <SelectItem value="Satis">Satış</SelectItem>
                                                <SelectItem value="Iade">İade</SelectItem>
                                                <SelectItem value="Sayim">Sayım Farkı</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

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
