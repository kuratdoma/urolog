'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function SetupPage() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        full_name: '',
        username: '',
        email: '',
        password: '',
        password_confirm: '',
    });

    useEffect(() => {
        fetch('/api/v1/setup/check')
            .then(r => r.json())
            .then(d => {
                if (!d.needs_setup) router.replace('/');
                else setChecking(false);
            })
            .catch(() => router.replace('/'));
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password !== form.password_confirm) {
            toast.error('Şifreler eşleşmiyor.');
            return;
        }
        if (form.password.length < 8) {
            toast.error('Şifre en az 8 karakter olmalıdır.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/v1/setup/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: form.email,
                    username: form.username,
                    full_name: form.full_name,
                    password: form.password,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                toast.error(err.detail || 'Kurulum başarısız.');
                return;
            }
            toast.success('Kurulum tamamlandı! Giriş yapabilirsiniz.');
            router.push('/login');
        } catch {
            toast.error('Sunucuya bağlanılamadı.');
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground text-sm animate-pulse">Kontrol ediliyor…</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">UroLOG</CardTitle>
                    <CardDescription>
                        İlk kurulum — yönetici hesabını oluşturun
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <Label>Ad Soyad</Label>
                            <Input
                                value={form.full_name}
                                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                                placeholder="Dr. Ad Soyad"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Kullanıcı Adı</Label>
                            <Input
                                value={form.username}
                                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                                placeholder="admin"
                                autoComplete="username"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>E-posta</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                placeholder="doktor@klinik.com"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Şifre</Label>
                            <Input
                                type="password"
                                value={form.password}
                                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                placeholder="En az 8 karakter"
                                autoComplete="new-password"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Şifre (Tekrar)</Label>
                            <Input
                                type="password"
                                value={form.password_confirm}
                                onChange={e => setForm(p => ({ ...p, password_confirm: e.target.value }))}
                                placeholder="Şifreyi tekrar girin"
                                autoComplete="new-password"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Oluşturuluyor…' : 'Kurulumu Tamamla'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
