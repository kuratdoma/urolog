"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Archive, AlertTriangle, ArrowUpRight, ArrowDownRight, MoreHorizontal, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { api, StockProduct, StockProductCreate } from "@/lib/api";

// Components
import { ProductDialog } from "@/components/stock/product-dialog";
import { MovementDialog } from "@/components/stock/movement-dialog";

export default function StockPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isMovementOpen, setIsMovementOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<StockProduct | null>(null);

    const queryClient = useQueryClient();

    // Queries
    const { data: products, isLoading } = useQuery({
        queryKey: ["stock-products", searchTerm],
        queryFn: () => api.stock.getProducts({ search: searchTerm }),
    });

    const { data: summary } = useQuery({
        queryKey: ["stock-summary"],
        queryFn: () => api.stock.getSummary(),
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: StockProductCreate) => api.stock.createProduct(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stock-products"] });
            queryClient.invalidateQueries({ queryKey: ["stock-summary"] });
            toast.success("Ürün başarıyla oluşturuldu.");
            setIsCreateOpen(false);
        },
        onError: (error) => {
            toast.error("Ürün oluşturulurken hata oluştu.");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<StockProductCreate> }) =>
            api.stock.updateProduct(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stock-products"] });
            queryClient.invalidateQueries({ queryKey: ["stock-summary"] });
            toast.success("Ürün güncellendi.");
            setIsEditOpen(false);
            setSelectedProduct(null);
        },
        onError: () => {
            toast.error("Güncelleme başarısız.");
        },
    });

    const movementMutation = useMutation({
        mutationFn: (data: any) => api.stock.createMovement(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stock-products"] });
            queryClient.invalidateQueries({ queryKey: ["stock-summary"] });
            toast.success("Stok hareketi kaydedildi.");
            setIsMovementOpen(false);
            setSelectedProduct(null);
        },
        onError: () => {
            toast.error("Stok hareketi eklenemedi.");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.stock.deleteProduct(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stock-products"] });
            queryClient.invalidateQueries({ queryKey: ["stock-summary"] });
            toast.success("Ürün silindi.");
        },
    });

    const handleDelete = (id: number) => {
        if (confirm("Bu ürünü silmek istediğinize emin misiniz?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleEdit = (product: StockProduct) => {
        setSelectedProduct(product);
        setIsEditOpen(true);
    };

    const handleMovement = (product: StockProduct) => {
        setSelectedProduct(product);
        setIsMovementOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Stok Yönetimi</h1>
                    <p className="text-muted-foreground">
                        Stok takibi, ürün yönetimi ve raporlar.
                    </p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Yeni Ürün
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Toplam Ürün</CardTitle>
                        <Archive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary?.toplam_urun || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Toplam Stok Adedi</CardTitle>
                        <Archive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary?.toplam_stok_adedi || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Stok Değeri</CardTitle>
                        <span className="h-4 w-4 text-muted-foreground">₺</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(summary?.toplam_stok_degeri || 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Kritik Stok</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">{summary?.dusuk_stoklu_urunler || 0}</div>
                        <p className="text-xs text-muted-foreground">Min. seviye altındaki ürünler</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table & Filters */}
            <Card className="p-4">
                <div className="flex items-center mb-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Ürün adı, marka veya barkod ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ürün Adı</TableHead>
                                <TableHead>Marka</TableHead>
                                <TableHead>Tip</TableHead>
                                <TableHead>Mevcut Stok</TableHead>
                                <TableHead>Birim Fiyat</TableHead>
                                <TableHead className="text-right">İşlemler</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">
                                        Yükleniyor...
                                    </TableCell>
                                </TableRow>
                            ) : products?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">
                                        Kayıt bulunamadı.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products?.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            <div>{item.urun_adi}</div>
                                            {item.barkod && (
                                                <div className="text-xs text-muted-foreground">{item.barkod}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>{item.marka || "-"}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{item.urun_tipi}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className={`font-bold ${item.mevcut_stok <= (item.min_stok || 0) ? "text-red-500" : "text-green-600"}`}>
                                                {item.mevcut_stok} {item.birim}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(item.birim_fiyat || 0)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Menü aç</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleMovement(item)}>
                                                        <ArrowUpRight className="mr-2 h-4 w-4" /> Stok Hareketi Ekle
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleEdit(item)}>
                                                        Düzenle
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(item.id)}
                                                        className="text-red-600"
                                                    >
                                                        Sil
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Dialogs */}
            <ProductDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSubmit={async (val) => { await createMutation.mutateAsync(val); }}
            />

            <ProductDialog
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                product={selectedProduct!}
                onSubmit={async (val) => {
                    if (selectedProduct) {
                        await updateMutation.mutateAsync({ id: selectedProduct.id, data: val });
                    }
                }}
            />

            <MovementDialog
                open={isMovementOpen}
                onOpenChange={setIsMovementOpen}
                product={selectedProduct}
                onSubmit={async (val) => { await movementMutation.mutateAsync(val); }}
            />

        </div>
    );
}
