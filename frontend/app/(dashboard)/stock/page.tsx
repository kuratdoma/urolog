"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Search, Archive, AlertTriangle, ArrowUpRight, ArrowDownRight,
    MoreHorizontal, History, ShoppingCart, Scale,
} from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    api, StockMovement, StockMovementCreate, StockProduct, StockProductCreate,
    StockPurchaseCreate,
} from "@/lib/api";

// Components
import { ProductDialog } from "@/components/stock/product-dialog";
import { MovementDialog } from "@/components/stock/movement-dialog";
import { PurchaseDialog } from "@/components/stock/purchase-dialog";

const currency = (value?: number | string | null) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
        Number(value ?? 0)
    );

const formatDate = (value?: string) =>
    value
        ? new Date(value).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })
        : "-";

/** API hatasından kullanıcıya gösterilecek mesajı çıkar (backend 400 detail'i taşır). */
const errorMessage = (error: unknown, fallback: string) => {
    const detail = (error as { detail?: string })?.detail;
    return detail || (error as Error)?.message || fallback;
};

const MOVEMENT_LABELS: Record<StockMovement["hareket_tipi"], string> = {
    GIRIS: "Giriş",
    CIKIS: "Çıkış",
    DUZELTME: "Düzeltme",
};

export default function StockPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isMovementOpen, setIsMovementOpen] = useState(false);
    const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<StockProduct | null>(null);
    // Hareket/alım sekmelerinde tek ürüne göre filtre
    const [historyProductId, setHistoryProductId] = useState<number | undefined>();
    const [activeTab, setActiveTab] = useState("products");

    const queryClient = useQueryClient();

    const refreshAll = () => {
        queryClient.invalidateQueries({ queryKey: ["stock-products"] });
        queryClient.invalidateQueries({ queryKey: ["stock-summary"] });
        queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
        queryClient.invalidateQueries({ queryKey: ["stock-purchases"] });
    };

    // Queries
    const { data: products, isLoading } = useQuery({
        queryKey: ["stock-products", searchTerm],
        queryFn: () => api.stock.getProducts({ search: searchTerm }),
    });

    const { data: summary } = useQuery({
        queryKey: ["stock-summary"],
        queryFn: () => api.stock.getSummary(),
    });

    const { data: movements, isLoading: movementsLoading } = useQuery({
        queryKey: ["stock-movements", historyProductId],
        queryFn: () => api.stock.getMovements({ productId: historyProductId, limit: 100 }),
        enabled: activeTab === "movements",
    });

    const { data: purchases, isLoading: purchasesLoading } = useQuery({
        queryKey: ["stock-purchases", historyProductId],
        queryFn: () => api.stock.getPurchases({ productId: historyProductId }),
        enabled: activeTab === "purchases",
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: StockProductCreate) => api.stock.createProduct(data),
        onSuccess: () => {
            refreshAll();
            toast.success("Ürün başarıyla oluşturuldu.");
            setIsCreateOpen(false);
        },
        onError: (error) => {
            toast.error(errorMessage(error, "Ürün oluşturulurken hata oluştu."));
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<StockProductCreate> }) =>
            api.stock.updateProduct(id, data),
        onSuccess: () => {
            refreshAll();
            toast.success("Ürün güncellendi.");
            setIsEditOpen(false);
            setSelectedProduct(null);
        },
        onError: (error) => {
            toast.error(errorMessage(error, "Güncelleme başarısız."));
        },
    });

    const movementMutation = useMutation({
        mutationFn: (data: StockMovementCreate) => api.stock.createMovement(data),
        onSuccess: () => {
            refreshAll();
            toast.success("Stok hareketi kaydedildi.");
            setIsMovementOpen(false);
            setSelectedProduct(null);
        },
        onError: (error) => {
            toast.error(errorMessage(error, "Stok hareketi eklenemedi."));
        },
    });

    const purchaseMutation = useMutation({
        mutationFn: (data: StockPurchaseCreate) => api.stock.createPurchase(data),
        onSuccess: () => {
            refreshAll();
            toast.success("Alım kaydedildi, stok güncellendi.");
            setIsPurchaseOpen(false);
        },
        onError: (error) => {
            toast.error(errorMessage(error, "Alım kaydedilemedi."));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.stock.deleteProduct(id),
        onSuccess: () => {
            refreshAll();
            toast.success("Ürün silindi.");
        },
        onError: (error) => {
            toast.error(errorMessage(error, "Ürün silinemedi."));
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

    const handlePurchase = (product?: StockProduct) => {
        setSelectedProduct(product ?? null);
        setIsPurchaseOpen(true);
    };

    const handleShowHistory = (product: StockProduct) => {
        setHistoryProductId(product.id);
        setActiveTab("movements");
    };

    const historyProductName = historyProductId
        ? products?.find((p) => p.id === historyProductId)?.urun_adi
        : undefined;

    const filterNotice = historyProductId ? (
        <div className="flex items-center gap-2 mb-4 text-sm">
            <Badge variant="secondary">
                Filtre: {historyProductName ?? `#${historyProductId}`}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setHistoryProductId(undefined)}>
                Filtreyi temizle
            </Button>
        </div>
    ) : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Stok Yönetimi</h1>
                    <p className="text-muted-foreground">
                        Stok takibi, ürün yönetimi ve raporlar.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handlePurchase()}>
                        <ShoppingCart className="mr-2 h-4 w-4" /> Alım Kaydet
                    </Button>
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Yeni Ürün
                    </Button>
                </div>
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
                        <Scale className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {currency(summary?.toplam_stok_degeri)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Ağırlıklı ortalama maliyet üzerinden
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Kritik Stok</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">
                            {summary?.dusuk_stoklu_urunler || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Min. seviye altındaki ürünler</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="products">Ürünler</TabsTrigger>
                    <TabsTrigger value="movements">Hareketler</TabsTrigger>
                    <TabsTrigger value="purchases">Alımlar</TabsTrigger>
                </TabsList>

                {/* --- ÜRÜNLER --- */}
                <TabsContent value="products">
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

                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ürün Adı</TableHead>
                                        <TableHead>Marka</TableHead>
                                        <TableHead>Tip</TableHead>
                                        <TableHead>Mevcut Stok</TableHead>
                                        <TableHead>Son Alış</TableHead>
                                        <TableHead>Ort. Maliyet</TableHead>
                                        <TableHead className="text-right">İşlemler</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-24">
                                                Yükleniyor...
                                            </TableCell>
                                        </TableRow>
                                    ) : products?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-24">
                                                Kayıt bulunamadı.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        products?.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">
                                                    <div>{item.urun_adi}</div>
                                                    {item.barkod && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {item.barkod}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>{item.marka || "-"}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{item.urun_tipi}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div
                                                        className={`font-bold ${item.mevcut_stok <= (item.min_stok || 0)
                                                            ? "text-red-500"
                                                            : "text-green-600"
                                                            }`}
                                                    >
                                                        {item.mevcut_stok} {item.birim}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{currency(item.birim_fiyat)}</TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {currency(item.ortalama_maliyet)}
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
                                                            <DropdownMenuItem onClick={() => handlePurchase(item)}>
                                                                <ShoppingCart className="mr-2 h-4 w-4" /> Alım Kaydet
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleShowHistory(item)}>
                                                                <History className="mr-2 h-4 w-4" /> Hareket Geçmişi
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
                </TabsContent>

                {/* --- HAREKETLER --- */}
                <TabsContent value="movements">
                    <Card className="p-4">
                        {filterNotice}
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tarih</TableHead>
                                        <TableHead>Ürün</TableHead>
                                        <TableHead>Tip</TableHead>
                                        <TableHead className="text-right">Değişim</TableHead>
                                        <TableHead>Kaynak</TableHead>
                                        <TableHead>Hasta</TableHead>
                                        <TableHead>Not</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {movementsLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-24">
                                                Yükleniyor...
                                            </TableCell>
                                        </TableRow>
                                    ) : movements?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-24">
                                                Hareket kaydı yok.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        movements?.map((m) => (
                                            <TableRow key={m.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    {formatDate(m.islem_tarihi)}
                                                </TableCell>
                                                <TableCell className="font-medium">{m.urun_adi || "-"}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {MOVEMENT_LABELS[m.hareket_tipi] ?? m.hareket_tipi}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span
                                                        className={`font-bold inline-flex items-center gap-1 ${m.miktar < 0 ? "text-red-500" : "text-green-600"
                                                            }`}
                                                    >
                                                        {m.miktar < 0 ? (
                                                            <ArrowDownRight className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowUpRight className="h-3 w-3" />
                                                        )}
                                                        {m.miktar > 0 ? `+${m.miktar}` : m.miktar}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{m.kaynak || "-"}</TableCell>
                                                <TableCell>{m.hasta_adi || "-"}</TableCell>
                                                <TableCell className="max-w-[240px] truncate">
                                                    {m.notlar || "-"}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>

                {/* --- ALIMLAR --- */}
                <TabsContent value="purchases">
                    <Card className="p-4">
                        {filterNotice}
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tarih</TableHead>
                                        <TableHead>Ürün</TableHead>
                                        <TableHead className="text-right">Miktar</TableHead>
                                        <TableHead className="text-right">Birim Fiyat</TableHead>
                                        <TableHead className="text-right">Toplam</TableHead>
                                        <TableHead>Fatura No</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchasesLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">
                                                Yükleniyor...
                                            </TableCell>
                                        </TableRow>
                                    ) : purchases?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">
                                                Alım kaydı yok.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        purchases?.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    {formatDate(p.alim_tarihi)}
                                                </TableCell>
                                                <TableCell className="font-medium">{p.urun_adi || "-"}</TableCell>
                                                <TableCell className="text-right">{p.miktar}</TableCell>
                                                <TableCell className="text-right">
                                                    {currency(p.birim_fiyat)}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">
                                                    {currency(p.toplam_tutar)}
                                                </TableCell>
                                                <TableCell>{p.fatura_no || "-"}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>

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

            <PurchaseDialog
                open={isPurchaseOpen}
                onOpenChange={setIsPurchaseOpen}
                products={products ?? []}
                defaultProductId={selectedProduct?.id}
                onSubmit={async (val) => { await purchaseMutation.mutateAsync(val); }}
            />

        </div>
    );
}
