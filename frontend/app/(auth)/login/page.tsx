'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Mail, Lock, KeyRound } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);

    // Forgot password state
    const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotSuccess, setForgotSuccess] = useState(false);

    const { setAuth, setPermissions, clearSessionExpired } = useAuthStore();
    const router = useRouter();

    // İlk kurulum kontrolü — kullanıcı yoksa setup sayfasına yönlendir
    useEffect(() => {
        fetch('/api/v1/setup/check')
            .then(r => r.json())
            .then(d => { if (d.needs_setup) router.replace('/setup'); })
            .catch(() => {});
    }, [router]);

    // Load saved credentials on mount
    useEffect(() => {
        const savedEmail = localStorage.getItem('urolog_saved_email');
        const savedRemember = localStorage.getItem('urolog_remember_me') === 'true';

        if (savedRemember && savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
        // Eski şifre kaydı varsa temizle
        localStorage.removeItem('urolog_saved_password');
    }, []);

    // Clear session expired flag when login page is mounted
    useEffect(() => {
        clearSessionExpired();
    }, [clearSessionExpired]);

    useEffect(() => {
        if (blockedUntil) {
            const interval = setInterval(() => {
                const now = Date.now();
                const remaining = Math.max(0, Math.ceil((blockedUntil - now) / 1000));
                setTimeLeft(remaining);
                if (remaining <= 0) {
                    setBlockedUntil(null);
                    setFailedAttempts(0);
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [blockedUntil]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (blockedUntil) return;

        setLoading(true);

        try {
            const result = await api.auth.login(email, password);

            // Save or clear credentials based on rememberMe
            if (rememberMe) {
                localStorage.setItem('urolog_saved_email', email);
                localStorage.setItem('urolog_remember_me', 'true');
            } else {
                localStorage.removeItem('urolog_saved_email');
                localStorage.removeItem('urolog_remember_me');
            }
            // Never persist passwords to localStorage
            localStorage.removeItem('urolog_saved_password');

            setAuth(result.access_token);

            // Fetch RBAC permissions after token is stored
            try {
                const perms = await api.auth.getMyPermissions();
                setPermissions({
                    role: perms.role as 'ADMIN' | 'DOCTOR' | 'NURSE' | 'FRONTDESK',
                    modules: perms.modules,
                });
            } catch (permError) {
                console.warn('Permissions fetch failed, using defaults:', permError);
            }

            toast.success('Giriş başarılı!');
            router.push('/');
        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';

            // Trigger shake
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);

            // Access control logic
            const newAttempts = failedAttempts + 1;
            setFailedAttempts(newAttempts);

            if (newAttempts >= 3) {
                const blockTime = Date.now() + 30000; // 30 seconds
                setBlockedUntil(blockTime);
                setTimeLeft(30);
                toast.error('Çok fazla başarısız deneme. 30 saniye kilitlendi.');
            } else {
                toast.error(`Giriş başarısız: ${errorMessage}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!forgotEmail) {
            toast.error('Lütfen email adresinizi girin.');
            return;
        }

        // Basic email validation
        if (!forgotEmail.includes('@') || !forgotEmail.includes('.')) {
            toast.error('Lütfen geçerli bir email adresi girin.');
            return;
        }

        setForgotLoading(true);
        try {
            const result = await api.auth.forgotPassword(forgotEmail);
            setForgotSuccess(true);
            toast.success(result.message);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Bir hata oluştu';
            toast.error(errorMessage);
        } finally {
            setForgotLoading(false);
        }
    };

    const handleCloseForgotDialog = () => {
        setForgotPasswordOpen(false);
        setForgotEmail('');
        setForgotSuccess(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
            <style jsx global>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:24px_24px] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

            <Card className={`w-full max-w-md relative z-10 shadow-2xl border-slate-800 bg-slate-900/80 backdrop-blur transition-transform ${isShaking ? 'animate-shake' : ''}`}>
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            UroLog
                        </h1>
                    </div>
                    {blockedUntil && (
                        <CardDescription>
                            <span className="text-red-400">Sistem kilitlendi. Lütfen bekleyin.</span>
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300 flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Email Adresi
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="ornek@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-white"
                                required
                                disabled={!!blockedUntil}
                                disableAutoCapitalize
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300 flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                Şifre
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-white"
                                required
                                disabled={!!blockedUntil}
                                disableAutoCapitalize
                            />
                        </div>

                        {/* Remember Me Checkbox */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                                disabled={!!blockedUntil}
                            />
                            <Label htmlFor="rememberMe" className="text-slate-400 text-sm cursor-pointer">
                                Beni Hatırla
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            className={`w-full bg-gradient-to-r ${blockedUntil ? 'from-gray-600 to-gray-600' : 'from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'}`}
                            disabled={loading || !!blockedUntil}
                        >
                            {blockedUntil ? `Tekrar denemek için ${timeLeft}s bekleyin` : (loading ? 'Giriş yapılıyor...' : 'Giriş Yap')}
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={() => setForgotPasswordOpen(true)}
                            className="text-sm text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1.5 mx-auto"
                        >
                            <KeyRound className="h-3.5 w-3.5" />
                            Şifremi Unuttum
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* Forgot Password Modal */}
            <Dialog open={forgotPasswordOpen} onOpenChange={handleCloseForgotDialog}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-blue-400" />
                            Şifremi Sıfırla
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            {forgotSuccess
                                ? 'Şifre sıfırlama linki email adresinize gönderildi.'
                                : 'Kayıtlı email adresinizi girin, şifre sıfırlama linki gönderilecektir.'}
                        </DialogDescription>
                    </DialogHeader>

                    {forgotSuccess ? (
                        <div className="space-y-4 mt-4">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                                <p className="text-green-400 text-sm">
                                    ✓ Email gönderildi! Lütfen gelen kutunuzu kontrol edin.
                                </p>
                                <p className="text-slate-400 text-xs mt-2">
                                    Link 5 dakika içinde geçerliliğini yitirecektir.
                                </p>
                            </div>
                            <Button
                                onClick={handleCloseForgotDialog}
                                className="w-full bg-slate-700 hover:bg-slate-600"
                            >
                                Kapat
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="forgot-email" className="text-slate-300">Email Adresi</Label>
                                <Input
                                    id="forgot-email"
                                    type="email"
                                    placeholder="ornek@email.com"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    className="bg-slate-800 border-slate-700 text-white"
                                    onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
                                    disableAutoCapitalize
                                />
                            </div>
                            <Button
                                onClick={handleForgotPassword}
                                disabled={forgotLoading}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                                {forgotLoading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Linki Gönder'}
                            </Button>
                            <p className="text-xs text-slate-500 text-center">
                                Link 5 dakika içinde geçerliliğini yitirecektir.
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
