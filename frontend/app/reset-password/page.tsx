'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { KeyRound, Lock, CheckCircle2, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Password strength indicators
    const passwordChecks = {
        length: newPassword.length >= 6,
        match: newPassword === confirmPassword && confirmPassword.length > 0,
    };

    const canSubmit = passwordChecks.length && passwordChecks.match && !loading;

    useEffect(() => {
        if (!token) {
            setError('Geçersiz veya eksik token. Lütfen email linkini tekrar kullanın.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            toast.error('Geçersiz token');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('Şifre en az 6 karakter olmalıdır.');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Şifreler eşleşmiyor.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await api.auth.resetPassword(token, newPassword);
            setSuccess(true);
            toast.success(result.message);

            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Bir hata oluştu';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:24px_24px] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

                <Card className="w-full max-w-md relative z-10 shadow-2xl border-slate-800 bg-slate-900/80 backdrop-blur">
                    <CardContent className="pt-8 pb-8 text-center">
                        <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Şifre Güncellendi!</h2>
                        <p className="text-slate-400 mb-6">
                            Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.
                        </p>
                        <p className="text-sm text-slate-500">
                            3 saniye içinde giriş sayfasına yönlendirileceksiniz...
                        </p>
                        <Button
                            onClick={() => router.push('/login')}
                            className="mt-4 w-full bg-gradient-to-r from-blue-600 to-cyan-600"
                        >
                            Giriş Sayfasına Git
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error && !token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:24px_24px] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

                <Card className="w-full max-w-md relative z-10 shadow-2xl border-slate-800 bg-slate-900/80 backdrop-blur">
                    <CardContent className="pt-8 pb-8 text-center">
                        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                            <XCircle className="h-8 w-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Geçersiz Link</h2>
                        <p className="text-slate-400 mb-6">
                            {error}
                        </p>
                        <Button
                            onClick={() => router.push('/login')}
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
                        >
                            Giriş Sayfasına Dön
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:24px_24px] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

            <Card className="w-full max-w-md relative z-10 shadow-2xl border-slate-800 bg-slate-900/80 backdrop-blur">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4">
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
                            <KeyRound className="h-8 w-8 text-blue-400" />
                        </div>
                    </div>
                    <CardTitle className="text-white text-2xl">Yeni Şifre Belirle</CardTitle>
                    <CardDescription className="text-slate-400">
                        Hesabınız için yeni bir şifre oluşturun.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password" className="text-slate-300 flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                Yeni Şifre
                            </Label>
                            <div className="relative">
                                <Input
                                    id="new-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="bg-slate-800 border-slate-700 text-white pr-10"
                                    required
                                    minLength={6}
                                    disableAutoCapitalize
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm-password" className="text-slate-300 flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                Şifre Tekrar
                            </Label>
                            <div className="relative">
                                <Input
                                    id="confirm-password"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="bg-slate-800 border-slate-700 text-white pr-10"
                                    required
                                    minLength={6}
                                    disableAutoCapitalize
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Password requirements */}
                        <div className="space-y-2 text-sm">
                            <div className={`flex items-center gap-2 ${passwordChecks.length ? 'text-green-400' : 'text-slate-500'}`}>
                                {passwordChecks.length ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-4 w-4 rounded-full border border-slate-600" />}
                                En az 6 karakter
                            </div>
                            <div className={`flex items-center gap-2 ${passwordChecks.match ? 'text-green-400' : 'text-slate-500'}`}>
                                {passwordChecks.match ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-4 w-4 rounded-full border border-slate-600" />}
                                Şifreler eşleşiyor
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                            disabled={!canSubmit}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Güncelleniyor...
                                </>
                            ) : (
                                'Şifreyi Güncelle'
                            )}
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={() => router.push('/login')}
                            className="text-sm text-slate-400 hover:text-slate-300"
                        >
                            ← Giriş sayfasına dön
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
