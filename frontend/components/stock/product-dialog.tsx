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
import { StockProduct, StockProductCreate } from "@/lib/api";

const formSchema = z.object({
    urun_adi: z.string().min(2, "Ürün adı en az 2 karakter olmalıdır"),
    marka: z.string().optional(),
    urun_tipi: z.string().optional(),
    birim: z.string().optional(),
    birim_fiyat: z.coerce.number().min(0, "Fiyat 0'dan küçük olamaz"),
    min_stok: z.coerce.number().min(0, "Min stok 0'dan küçük olamaz"),
    barkod: z.string().optional(),
});

interface ProductDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product?: StockProduct; // Eğer verilirse düzenleme modu
    onSubmit: (values: StockProductCreate) => Promise<void>;
}

export function ProductDialog({
    open,
    onOpenChange,
    product,
    onSubmit,
}: ProductDialogProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            urun_adi: "",
            marka: "",
            urun_tipi: "Malzeme",
            birim: "Adet",
            birim_fiyat: 0,
            min_stok: 5,
            barkod: "",
        },
    });

    useEffect(() => {
        if (product) {
            form.reset({
                urun_adi: product.urun_adi,
                marka: product.marka || "",
                urun_tipi: product.urun_tipi || "Malzeme",
                birim: product.birim || "Adet",
                birim_fiyat: Number(product.birim_fiyat),
                min_stok: product.min_stok || 5,
                barkod: product.barkod || "",
            });
        } else {
            form.reset({
                urun_adi: "",
                marka: "",
                urun_tipi: "Malzeme",
                birim: "Adet",
                birim_fiyat: 0,
                min_stok: 5,
                barkod: "",
            });
        }
    }, [product, form, open]);

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        await onSubmit(values);
        onOpenChange(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] min-h-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {product ? "Stok Kartını Düzenle" : "Yeni Stok Kartı"}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="urun_adi"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ürün Adı</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Örn: Enjektör 10cc" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="marka"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Marka</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Marka" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="barkod"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Barkod</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Barkod No" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="urun_tipi"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tip</FormLabel>
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
                                                <SelectItem value="Malzeme">Malzeme</SelectItem>
                                                <SelectItem value="İlaç">İlaç</SelectItem>
                                                <SelectItem value="Sarf">Sarf</SelectItem>
                                                <SelectItem value="Demirbaş">Demirbaş</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="birim"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Birim</FormLabel>
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
                                                <SelectItem value="Adet">Adet</SelectItem>
                                                <SelectItem value="Kutu">Kutu</SelectItem>
                                                <SelectItem value="Paket">Paket</SelectItem>
                                                <SelectItem value="Lt">Lt</SelectItem>
                                                <SelectItem value="Kg">Kg</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="birim_fiyat"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Birim Fiyat (TL)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="min_stok"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Min. Stok</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit">Kaydet</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
