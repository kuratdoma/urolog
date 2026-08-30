"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Loader2, ShieldAlert, Key, ChevronDown, ChevronRight, User, Clock, MapPin, Monitor, FileText, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmergencyDropPanel } from "./emergency-drop";

// Action type mapping for Turkish display
const actionLabels: Record<string, { label: string; color: string }> = {
    "USER_LOGIN": { label: "Giriş Yapıldı", color: "bg-green-50 text-green-700 ring-green-600/20" },
    "USER_LOGIN_FAILED": { label: "Başarısız Giriş", color: "bg-red-50 text-red-700 ring-red-600/20" },
    "USER_PASSWORD_CHANGE": { label: "Şifre Değiştirildi", color: "bg-amber-50 text-amber-700 ring-amber-600/20" },
    "PATIENT_CREATE": { label: "Hasta Oluşturuldu", color: "bg-blue-50 text-blue-700 ring-blue-600/20" },
    "PATIENT_UPDATE": { label: "Hasta Güncellendi", color: "bg-cyan-50 text-cyan-700 ring-cyan-600/20" },
    "PATIENT_DELETE": { label: "Hasta Silindi", color: "bg-red-50 text-red-700 ring-red-600/20" },
    "EXAMINATION_CREATE": { label: "Muayene Oluşturuldu", color: "bg-indigo-50 text-indigo-700 ring-indigo-600/20" },
    "EXAMINATION_UPDATE": { label: "Muayene Güncellendi", color: "bg-violet-50 text-violet-700 ring-violet-600/20" },
    "EXAMINATION_DELETE": { label: "Muayene Silindi", color: "bg-red-50 text-red-700 ring-red-600/20" },
    "OPERATION_CREATE": { label: "Ameliyat Oluşturuldu", color: "bg-purple-50 text-purple-700 ring-purple-600/20" },
    "OPERATION_UPDATE": { label: "Ameliyat Güncellendi", color: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20" },
    "OPERATION_DELETE": { label: "Ameliyat Silindi", color: "bg-red-50 text-red-700 ring-red-600/20" },
    "PAYMENT_CREATE": { label: "Ödeme Alındı", color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
    "TRANSACTION_CREATE": { label: "İşlem Girildi", color: "bg-teal-50 text-teal-700 ring-teal-600/20" },
    "STOCK_ADD": { label: "Stok Girişi", color: "bg-lime-50 text-lime-700 ring-lime-600/20" },
    "STOCK_CONSUME": { label: "Stok Tüketimi", color: "bg-orange-50 text-orange-700 ring-orange-600/20" },
    "EMERGENCY_DATABASE_DROP": { label: "⚠️ DB İMHA", color: "bg-red-100 text-red-900 ring-red-800/30 font-bold" },
};

function getActionDisplay(action: string) {
    return actionLabels[action] || { label: action, color: "bg-slate-50 text-slate-700 ring-slate-600/20" };
}

// Format details for display
function formatDetails(details: any): { key: string; value: string }[] {
    if (!details) return [];

    const items: { key: string; value: string }[] = [];

    const labelMap: Record<string, string> = {
        "username": "Kullanıcı Adı",
        "error": "Hata",
        "ad": "Ad",
        "soyad": "Soyad",
        "tc": "TC Kimlik",
        "tc_kimlik": "TC Kimlik",
        "updated_fields": "Güncellenen Alanlar",
        "deleted_patient_name": "Silinen Hasta",
        "amount": "Tutar",
        "product_name": "Ürün",
        "quantity": "Miktar"
    };

    for (const [key, value] of Object.entries(details)) {
        const label = labelMap[key] || key;
        let displayValue: string;

        if (typeof value === "object") {
            displayValue = JSON.stringify(value, null, 2);
        } else {
            displayValue = String(value);
        }

        items.push({ key: label, value: displayValue });
    }

    return items;
}

export function AuditLogsSettings() {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [password, setPassword] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [page, setPage] = useState(0);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const pageSize = 50;

    const { data: logs, isLoading } = useQuery({
        queryKey: ['audit-logs', page],
        queryFn: () => api.audit.list({ skip: page * pageSize, limit: pageSize }),
        enabled: isUnlocked,
    });

    const toggleRowExpand = (id: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const handleUnlock = async () => {
        if (!password) return;
        setIsVerifying(true);
        try {
            const result = await api.auth.verifyPassword(password);

            if (!result.is_superuser) {
                toast.error("Bu alana sadece yöneticiler erişebilir.");
                setIsVerifying(false);
                return;
            }

            setIsUnlocked(true);
            toast.success("Erişim izni verildi.");
        } catch (e) {
            console.error(e);
            toast.error("Şifre hatalı veya yetkisiz işlem.");
        } finally {
            setIsVerifying(false);
        }
    };

    if (!isUnlocked) {
        return (
            <Card className="border-red-100 bg-red-50/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                        <ShieldAlert className="h-5 w-5" />
                        Güvenli Alan Erişimi
                    </CardTitle>
                    <CardDescription>
                        Denetim kayıtlarını (Audit Logs) görüntülemek için lütfen yönetici şifrenizi doğrulayın.
                    </CardDescription>
                </CardHeader>
                <CardContent className="max-w-md space-y-4">
                    <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            type="password"
                            placeholder="Yönetici Şifreniz"
                            className="pl-9"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleUnlock()}
                            disableAutoCapitalize
                        />
                    </div>
                    <Button onClick={handleUnlock} disabled={isVerifying} className="w-full bg-red-600 hover:bg-red-700">
                        {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isVerifying ? "Doğrulanıyor..." : "Doğrula ve Giriş Yap"}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-blue-600" />
                            Sistem Denetim Kayıtları
                        </CardTitle>
                        <CardDescription>Sistemdeki kritik işlemlerin log kayıtları. Satıra tıklayarak detayları görüntüleyebilirsiniz.</CardDescription>
                    </div>
                    <div className="text-xs text-slate-400">
                        Sayfa: {page + 1}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead className="w-[30px]"></TableHead>
                                    <TableHead className="w-[160px]">Tarih</TableHead>
                                    <TableHead className="w-[120px]">Kullanıcı</TableHead>
                                    <TableHead className="w-[180px]">İşlem</TableHead>
                                    <TableHead className="w-[180px]">Kaynak</TableHead>
                                    <TableHead className="w-[100px]">IP</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs && logs.length > 0 ? logs.map((log) => {
                                    const isExpanded = expandedRows.has(log.id);
                                    const actionDisplay = getActionDisplay(log.action);
                                    const detailItems = formatDetails(log.details);

                                    return (
                                        <>
                                            <TableRow
                                                key={log.id}
                                                className={cn(
                                                    "hover:bg-slate-50 cursor-pointer transition-colors",
                                                    isExpanded && "bg-slate-50"
                                                )}
                                                onClick={() => toggleRowExpand(log.id)}
                                            >
                                                <TableCell className="py-2">
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-xs text-slate-600 py-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="h-3 w-3 text-slate-400" />
                                                        {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: tr })}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="h-3 w-3 text-slate-400" />
                                                        <span className="text-xs font-medium text-slate-700">{log.username || "Sistem"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <span className={cn(
                                                        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                                                        actionDisplay.color
                                                    )}>
                                                        {actionDisplay.label}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-600 py-2">
                                                    {log.resource_type && (
                                                        <span className="flex items-center gap-1">
                                                            <FileText className="h-3 w-3 text-slate-400" />
                                                            <span className="capitalize">{log.resource_type}</span>
                                                            {log.resource_id && (
                                                                <span className="text-slate-400 font-mono text-[10px]">
                                                                    #{log.resource_id.substring(0, 8)}
                                                                </span>
                                                            )}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-400 py-2">
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {log.ip_address || "-"}
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {/* Expanded Details Row */}
                                            {isExpanded && (
                                                <TableRow key={`${log.id}-details`} className="bg-slate-50/50">
                                                    <TableCell colSpan={6} className="py-3">
                                                        <div className="pl-8 space-y-3">
                                                            {/* Detail Items */}
                                                            {detailItems.length > 0 && (
                                                                <div className="bg-white rounded-lg border p-3">
                                                                    <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                                                                        <Activity className="h-3.5 w-3.5 text-blue-500" />
                                                                        İşlem Detayları
                                                                    </h4>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        {detailItems.map((item, idx) => (
                                                                            <div key={idx} className="text-xs">
                                                                                <span className="text-slate-500">{item.key}:</span>{" "}
                                                                                <span className="font-medium text-slate-700">
                                                                                    {item.value.length > 100 ? (
                                                                                        <pre className="mt-1 p-2 bg-slate-100 rounded text-[10px] overflow-auto max-h-24">
                                                                                            {item.value}
                                                                                        </pre>
                                                                                    ) : item.value}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Technical Info */}
                                                            <div className="flex gap-4 text-[10px] text-slate-400">
                                                                {log.user_agent && (
                                                                    <div className="flex items-center gap-1">
                                                                        <Monitor className="h-3 w-3" />
                                                                        <span className="truncate max-w-[300px]" title={log.user_agent}>
                                                                            {log.user_agent}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <span className="font-mono">ID: {log.id}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                            Kayıt bulunamadı.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <div className="flex items-center justify-between py-4">
                    <div className="text-xs text-slate-400">
                        Toplam {logs?.length || 0} kayıt (Bu sayfada)
                    </div>
                    <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Önceki</Button>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!logs || logs.length < pageSize}>Sonraki</Button>
                    </div>
                </div>
            </CardContent>
            
            {/* Acil Durum - Veritabanı Sil Bölümü */}
            {isUnlocked && (
                <CardContent className="border-t border-slate-100 pt-6">
                    <EmergencyDropPanel />
                </CardContent>
            )}
        </Card>
    );
}
