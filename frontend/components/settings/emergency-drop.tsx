"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, ServerCrash } from "lucide-react";
import { cn } from "@/lib/utils";

const CONFIRMATION_PHRASE = "VERİTABANINI SİLMEK GERİ DÖNÜŞÜMSÜZDÜR";

export function EmergencyDropPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmText, setConfirmText] = useState("");
    const [status, setStatus] = useState<"idle" | "success" | "timeout">("idle");

    const isMatch = confirmText === CONFIRMATION_PHRASE;

    const dropMutation = useMutation({
        mutationFn: () => {
            // Setup a timeout to catch when the server dies and doesn't respond
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("SERVER_DIED")), 5000);
            });
            
            return Promise.race([
                authApi.emergencyDropDatabase(password, confirmText),
                timeoutPromise
            ]) as Promise<{ status: string }>;
        },
        onSuccess: () => {
            setStatus("success");
            toast.success("Veritabanı başarıyla silindi. Sistem tamamen durduruldu.");
        },
        onError: (error: any) => {
            if (error.message === "SERVER_DIED" || error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
                // If it fails to fetch or times out, it means we likely succeeded and the backend crashed as expected
                setStatus("timeout");
                toast.success("Sistem bağlantısı koptu. Veritabanı imha edilmiş olabilir.");
            } else {
                toast.error(error.message || "İşlem başarısız oldu. Lütfen şifrenizi kontrol edin.");
            }
        }
    });

    const handleExecute = () => {
        if (!password) {
            toast.error("Yönetici şifrenizi girmelisiniz.");
            return;
        }
        if (!isMatch) {
            toast.error("Onay cümlesi eşleşmiyor.");
            return;
        }

        dropMutation.mutate();
    };

    if (status === "success" || status === "timeout") {
        return (
            <div className="rounded-xl border border-red-800 bg-red-950/20 p-6 shadow-sm">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="rounded-full bg-red-900/50 p-4">
                        <ServerCrash className="h-12 w-12 text-red-500" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-red-500">Sistem Çöktü / Veritabanı Silindi</h3>
                        <p className="text-sm text-red-400 max-w-md">
                            Veritabanı kalıcı olarak silindi. Backend sunucusu artık çalışmıyor. 
                            Sistemi yeniden kurmanız veya yedekten dönmeniz gerekmektedir.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "rounded-xl border transition-all overflow-hidden",
            isOpen ? "border-red-800/50 shadow-md" : "border-red-200/50 hover:border-red-300"
        )}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between p-4 transition-colors",
                    isOpen ? "bg-red-950/10" : "bg-red-50/50 hover:bg-red-50"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full",
                        isOpen ? "bg-red-900 text-red-200" : "bg-red-100 text-red-600"
                    )}>
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                        <h3 className={cn("text-base font-bold", isOpen ? "text-red-600" : "text-red-700")}>
                            ⚠️ ACİL DURUM — VERİTABANI İMHA
                        </h3>
                        <p className={cn("text-xs mt-0.5", isOpen ? "text-red-500" : "text-red-500/70")}>
                            Geri dönüşümsüz silme ve sistemi durdurma işlemi.
                        </p>
                    </div>
                </div>
                {isOpen ? <ChevronUp className="h-5 w-5 text-red-500" /> : <ChevronDown className="h-5 w-5 text-red-400" />}
            </button>

            {isOpen && (
                <div className="p-6 bg-red-950/5 border-t border-red-800/20">
                    <div className="rounded-lg bg-red-100 p-4 border border-red-200 mb-6 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-red-900">DİKKAT: Bu işlem geri alınamaz.</h4>
                            <p className="text-xs text-red-800 leading-relaxed">
                                Bu işlem tüm klinik kayıtları, hastaları ve ayarları içeren <strong>veritabanınızı kalıcı olarak siler ve sistemi kilitler.</strong> Hiçbir yedek alınmayacaktır. İşlem tamamlandığında manuel müdahale gerekene kadar sunucu çalışmayacaktır.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-red-900 font-bold">Yönetici Şifreniz</Label>
                            <Input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                className="border-red-200 focus-visible:ring-red-500 bg-white"
                                placeholder="Güvenlik onayı için şifrenizi girin"
                            />
                        </div>

                        <div className="p-4 rounded-md border border-red-800/30 bg-red-950 text-red-100 space-y-3">
                            <p className="text-sm">
                                Devam etmek için aşağıdaki cümleyi tam olarak (büyük harflerle) boşluğa yazın: <br/>
                                <span className="font-mono font-bold text-white tracking-wider select-all block mt-2 p-2 bg-red-900/50 rounded inline-block">
                                    {CONFIRMATION_PHRASE}
                                </span>
                            </p>
                            <Input 
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                className={cn(
                                    "border-red-800 bg-red-900/50 text-white font-mono h-12 text-center tracking-wider transition-colors placeholder:text-red-800/70",
                                    isMatch && "border-green-500 bg-green-950/30 ring-1 ring-green-500"
                                )}
                                placeholder="Buraya yazın..."
                                autoComplete="off"
                            />
                        </div>

                        <Button 
                            className="w-full h-12 text-base font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all"
                            disabled={!isMatch || !password || dropMutation.isPending}
                            onClick={handleExecute}
                        >
                            {dropMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    İşleniyor... Sistemi kapatıyor
                                </>
                            ) : (
                                "🔴 VERİTABANINI SİL"
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
