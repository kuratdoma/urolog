"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, AlertTriangle, FileSpreadsheet, Loader2, Download, HardDrive, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ExcelJS from 'exceljs';
import { toast } from "sonner";
import { api } from "@/lib/api";

interface DefinitionItem {
    id: string;
    value: string;
}

interface Drug {
    name: string;
    barcode: string;
}

export function DrugsSettings() {
    const [drugsCount, setDrugsCount] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    // Initial Stats
    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            // Just get first page to see if connection works, ideally we would have a stats endpoint
            // For now let's just assume if we can fetch, we show "Available" or something.
            // Or better, search with empty string and high limit or just trust user.
            // Actually, we can't easily get total count without a specific count endpoint or response metadata.
            // Let's just say "Veritabanı kullanılıyor" or show a sample.
            const res = await api.system.get_drugs("", 0, 1);
            // If res is array, we don't know total. Let's assume > 0 if length > 0
            if (res.length > 0) setDrugsCount(999); // Placeholder or just "Active"
        } catch (e) {
            console.error(e);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const res = await api.system.upload_drugs(file);
            if (res.status === 'success') {
                toast.success(`${res.imported_count} adet ilaç başarıyla veritabanına aktarıldı.`);
                setDrugsCount(res.imported_count);
            } else {
                toast.error("Yükleme sırasında bir hata oluştu.");
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Yükleme başarısız: " + (e.message || "Bilinmeyen hata"));
        } finally {
            setLoading(false);
            e.target.value = "";
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                        <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">İlaç Veritabanı Yönetimi</h2>
                        <p className="text-sm text-slate-500">
                            Merkezi İlaç Veritabanı
                            {drugsCount > 0 && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Aktif</span>}
                        </p>
                    </div>
                </div>

                <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="font-bold">Dikkat</AlertTitle>
                    <AlertDescription className="text-xs mt-1">
                        Bu alandan yükleme yaptığınızda, <b>mevcut ilaç veritabanı tamamen silinecek</b> ve yüklediğiniz Excel dosyasındaki ilaçlar sisteme kaydedilecektir.
                        <br />
                        Excel dosyasında şu sütunlar bulunmalıdır: <b>İlaç Adı, Barkod, Etkin Madde</b>
                    </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Excel Upload */}
                    <div className="space-y-4 p-5 bg-slate-50/50 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">1</div>
                            <h3 className="text-sm font-bold text-slate-700">Excel Dosyası ile Veritabanını Güncelle</h3>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">Kendi hazırladığınız veya SKRS'den indirdiğiniz Excel dosyasını (.xlsx) yükleyin.</p>

                        <div className="relative group">
                            <input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileUpload}
                                disabled={loading}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <Button variant="outline" className="w-full h-14 border-dashed border-2 border-slate-300 text-slate-500 group-hover:text-indigo-600 group-hover:border-indigo-400 group-hover:bg-white transition-all shadow-sm" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Upload className="w-5 h-5 mr-2" />}
                                {loading ? "Veritabanına İşleniyor..." : "Dosya Seç (.csv, .xlsx) ve Yükle"}
                            </Button>
                        </div>
                    </div>

                    {/* Template Download */}
                    <div className="space-y-4 p-5 bg-blue-50/30 rounded-xl border border-blue-100 hover:border-blue-300 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">2</div>
                            <h3 className="text-sm font-bold text-blue-800">Örnek Şablon İndir</h3>
                        </div>
                        <p className="text-xs text-blue-600/70 mb-4">Veri yüklemesi için uygun formatta hazırlanmış örnek CSV dosyasını indirin.</p>

                        <div className="flex flex-col gap-2">
                            <Button onClick={async () => {
                                const workbook = new ExcelJS.Workbook();
                                const worksheet = workbook.addWorksheet("İlaç Listesi");

                                worksheet.columns = [
                                    { header: "İlaç Adı", key: "ilacAdi", width: 30 },
                                    { header: "Barkod", key: "barkod", width: 15 },
                                    { header: "Etkin Madde", key: "etkinMadde", width: 20 },
                                    { header: "ATC Kodu", key: "atcKodu", width: 12 },
                                    { header: "Firma", key: "firma", width: 25 },
                                    { header: "Fiyat", key: "fiyat", width: 10 },
                                    { header: "Reçete Tipi", key: "receteTipi", width: 12 }
                                ];

                                worksheet.addRow({ ilacAdi: "Örnek İlaç A 500mg", barkod: "8691234567890", etkinMadde: "Parasetamol", atcKodu: "N02BE01", firma: "İlaç Firması A.Ş.", fiyat: "50.00", receteTipi: "Normal" });
                                worksheet.addRow({ ilacAdi: "Örnek İlaç B 100mg", barkod: "8699876543210", etkinMadde: "İbuprofen", atcKodu: "M01AE01", firma: "İlaç Firması B.Ş.", fiyat: "75.50", receteTipi: "Kırmızı" });

                                // Style header row
                                worksheet.getRow(1).font = { bold: true };

                                const buffer = await workbook.xlsx.writeBuffer();
                                const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = "ilac_yukleme_sablonu.xlsx";
                                link.click();
                                URL.revokeObjectURL(url);
                            }} className="w-full h-10 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50">
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Excel Şablonu (.xlsx)
                            </Button>

                            <Button onClick={() => {
                                // Create CSV content directly with semicolon separator for better Excel compatibility in Turkey
                                const headers = ["İlaç Adı", "Barkod", "Etkin Madde", "ATC Kodu", "Firma", "Fiyat", "Reçete Tipi"];
                                const row1 = ["Örnek İlaç A 500mg", "8691234567890", "Parasetamol", "N02BE01", "İlaç Firması A.Ş.", "50.00", "Normal"];
                                const row2 = ["Örnek İlaç B 100mg", "8699876543210", "İbuprofen", "M01AE01", "İlaç Firması B.Ş.", "75.50", "Kırmızı"];

                                const csvContent = "\uFEFF" + [  // Add BOM for UTF-8 Excel compatibility
                                    headers.join(";"),
                                    row1.join(";"),
                                    row2.join(";")
                                ].join("\n");

                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement("a");
                                if (link.download !== undefined) {
                                    const url = URL.createObjectURL(blob);
                                    link.setAttribute("href", url);
                                    link.setAttribute("download", "ilac_yukleme_sablonu.csv");
                                    link.style.visibility = 'hidden';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }
                            }} className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200">
                                <Download className="w-4 h-4 mr-2" />
                                CSV Şablonu (.csv)
                            </Button>
                        </div>
                    </div>
                </div>

                <LocalFilesSection onImport={() => fetchStats()} />
            </div>
        </div>
    );
}

function LocalFilesSection({ onImport }: { onImport: () => void }) {
    const [loading, setLoading] = useState<string | null>(null);
    const { data: backups, refetch } = useQuery({
        queryKey: ['system-backups-drugs'],
        queryFn: () => api.system.get_backups(),
    });

    const drugFiles = backups?.filter((f: any) => f.name.endsWith('.csv') || f.name.endsWith('.xlsx')) || [];

    const handleImportLocal = async (filename: string) => {
        if (!confirm(`${filename} dosyasındaki veriler mevcut ilaç veritabanının ÜZERİNE YAZILACAKTIR. Onaylıyor musunuz?`)) return;
        
        setLoading(filename);
        try {
            // We need to add this endpoint to the backend
            const res = await api.system.import_local_drugs(filename);
            if (res.status === 'success') {
                toast.success(`${res.imported_count} adet ilaç başarıyla veritabanına aktarıldı.`);
                onImport();
            } else {
                toast.error("İçe aktarma sırasında bir hata oluştu.");
            }
        } catch (e: any) {
            console.error(e);
            toast.error("İçe aktarma başarısız: " + (e.detail || e.message || "Bilinmeyen hata"));
        } finally {
            setLoading(null);
        }
    };

    if (drugFiles.length === 0) return null;

    return (
        <div className="pt-6 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-400" />
                Sunucudaki Hazır Dosyalar (/data_import)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {drugFiles.map((file: any) => (
                    <div key={file.name} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                <FileSpreadsheet className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-slate-700 truncate max-w-[150px]">{file.name}</span>
                                <span className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
                            </div>
                        </div>
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            onClick={() => handleImportLocal(file.name)}
                            disabled={!!loading}
                        >
                            {loading === file.name ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                            Aktar
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
