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
import { StockMovementCreate, StockProduct } from "@/lib/api";

const formSchema = z
    .object({
        hareket_tipi: z.enum(["GIRIS", "CIKIS", "DUZELTME"]),
        // DUZELTME'de miktar "sayımda bulunan gerçek stok"tur ve 0 olabilir.
        miktar: z.coerce.number().int("Miktar tam sayı olmalıdır").min(0),
        kaynak: z.string().optional(),
        notlar: z.string().optional(),
    })
    .refine((v) => v.hareket_tipi === "DUZELTME" || v.miktar >= 1, {
        message: "Giriş ve çıkış için miktar en az 1 olmalıdır",
        path: ["miktar"],
    });

type FormValues = z.infer<typeof formSchema>;

interface MovementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: StockProduct | null;
    onSubmit: (values: StockMovementCreate) => Promise<void>;
}

const DEFAULTS: FormValues = {
    hareket_tipi: "CIKIS",
    miktar: 1,
    kaynak: "Manuel",
    notlar: "",
};

export function MovementDialog({
    open,
    onOpenChange,
    product,
    onSubmit,
}: MovementDialogProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: DEFAULTS,
    });

    useEffect(() => {
        if (open) form.reset(DEFAULTS);
    }, [open, form]);

    const hareketTipi = form.watch("hareket_tipi");
    const miktar = Number(form.watch("miktar")) || 0;
    const mevcut = product?.mevcut_stok ?? 0;

    // Kaydedildiğinde stok ne olacak? Kullanıcı göndermeden önce görsün.
    const sonucStok =
        hareketTipi === "DUZELTME"
            ? miktar
            : hareketTipi === "CIKIS"
                ? mevcut - miktar
                : mevcut + miktar;

    const yetersizStok = hareketTipi === "CIKIS" && sonucStok < 0;

    const handleSubmit = async (values: FormValues) => {
        if (!product || yetersizStok) return;
        await onSubmit({ urun_id: product.id, ...values });
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
                        <div className="p-4 bg-muted rounded-md mb-4 text-sm space-y-1">
                            <div className="flex justify-between">
                                <span>Mevcut Stok:</span>
                                <span className="font-bold">
                                    {mevcut} {product.birim}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>İşlem Sonrası:</span>
                                <span
                                    className={`font-bold ${yetersizStok ? "text-red-500" : "text-green-600"}`}
                                >
                                    {sonucStok} {product.birim}
                                </span>
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
                                        <FormLabel>
                                            {hareketTipi === "DUZELTME" ? "Sayılan Stok" : "Miktar"}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={hareketTipi === "DUZELTME" ? 0 : 1}
                                                {...field}
                                            />
                                        </FormControl>
                                        {hareketTipi === "DUZELTME" && (
                                            <FormDescription>
                                                Sayımda bulunan gerçek adet. Fark otomatik hesaplanır.
                                            </FormDescription>
                                        )}
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

                        {yetersizStok && (
                            <p className="text-sm text-red-500">
                                Yetersiz stok: en fazla {mevcut} {product.birim} çıkış yapılabilir.
                            </p>
                        )}

                        <DialogFooter>
                            <Button type="submit" disabled={yetersizStok}>
                                Kaydet
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
