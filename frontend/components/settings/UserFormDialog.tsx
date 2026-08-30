import React from "react";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingUserId: string | null;
    newUser: any;
    setNewUser: React.Dispatch<React.SetStateAction<any>>;
    confirmPassword: string;
    setConfirmPassword: (val: string) => void;
    onSave: () => void;
    isPending: boolean;
    currentUserRole?: string;
}

export function UserFormDialog({
    open,
    onOpenChange,
    editingUserId,
    newUser,
    setNewUser,
    confirmPassword,
    setConfirmPassword,
    onSave,
    isPending,
    currentUserRole
}: UserFormDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{editingUserId ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}</DialogTitle>
                    <DialogDescription>
                        Kullanıcı bilgilerini ve yetki seviyesini belirleyin.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Ad Soyad</Label>
                        <Input value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="Örn: Dr. Ali Veli" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>E-posta (Giriş Kimliği)</Label>
                            <Input
                                type="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value, username: e.target.value })}
                                placeholder="ornek@email.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Şifre {editingUserId && <span className="text-xs text-slate-400 font-normal">(Değiştirme: Boş Bırakın)</span>}</Label>
                            <Input
                                type="password"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                placeholder="******"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Şifre Tekrar</Label>
                        <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="******"
                            className={newUser.password && confirmPassword && newUser.password !== confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Kullanıcı Rolü</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {currentUserRole === 'ADMIN' && (
                                <div
                                    className={cn(
                                        "border rounded-lg p-3 cursor-pointer transition-all",
                                        newUser.role === 'ADMIN' ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                                    )}
                                    onClick={() => setNewUser({ ...newUser, role: 'ADMIN', is_superuser: true })}
                                >
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            checked={newUser.role === 'ADMIN'}
                                            onChange={() => setNewUser({ ...newUser, role: 'ADMIN', is_superuser: true })}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-xs font-bold text-blue-700">ADMIN (Yönetici)</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1 pl-6">Sistemde tam yetkilidir.</p>
                                </div>
                            )}

                            <div
                                className={cn(
                                    "border rounded-lg p-3 cursor-pointer transition-all",
                                    newUser.role === 'DOCTOR' ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                                )}
                                onClick={() => setNewUser({ ...newUser, role: 'DOCTOR', is_superuser: false })}
                            >
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        checked={newUser.role === 'DOCTOR'}
                                        onChange={() => setNewUser({ ...newUser, role: 'DOCTOR', is_superuser: false })}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-bold text-emerald-700">DOKTOR</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 pl-6">Klinik işlemlerde tam yetkilidir.</p>
                            </div>

                            <div
                                className={cn(
                                    "border rounded-lg p-3 cursor-pointer transition-all",
                                    newUser.role === 'NURSE' ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                                )}
                                onClick={() => setNewUser({ ...newUser, role: 'NURSE', is_superuser: false })}
                            >
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        checked={newUser.role === 'NURSE'}
                                        onChange={() => setNewUser({ ...newUser, role: 'NURSE', is_superuser: false })}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-bold text-indigo-700">HEMŞİRE</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 pl-6">Klinik verileri görebilir ve girebilir.</p>
                            </div>

                            <div
                                className={cn(
                                    "border rounded-lg p-3 cursor-pointer transition-all",
                                    newUser.role === 'TECHNICIAN' ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                                )}
                                onClick={() => setNewUser({ ...newUser, role: 'TECHNICIAN', is_superuser: false })}
                            >
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        checked={newUser.role === 'TECHNICIAN'}
                                        onChange={() => setNewUser({ ...newUser, role: 'TECHNICIAN', is_superuser: false })}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-bold text-orange-700">TEKNİSYEN</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 pl-6">Lab ve Görüntüleme girişleri.</p>
                            </div>

                            <div
                                className={cn(
                                    "border rounded-lg p-3 cursor-pointer transition-all",
                                    newUser.role === 'FRONTDESK' ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                                )}
                                onClick={() => setNewUser({ ...newUser, role: 'FRONTDESK', is_superuser: false })}
                            >
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        checked={newUser.role === 'FRONTDESK'}
                                        onChange={() => setNewUser({ ...newUser, role: 'FRONTDESK', is_superuser: false })}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-bold text-purple-700">SEKRETER</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 pl-6">Randevu ve hasta kabul işlemleri.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                        <div className="space-y-0.5">
                            <Label className="text-xs font-medium">Hesap Durumu</Label>
                            <p className="text-[10px] text-slate-500">Pasif kullanıcılar sisteme giriş yapamaz</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={cn("text-xs font-bold", newUser.is_active ? "text-emerald-600" : "text-red-600")}>
                                {newUser.is_active ? 'AKTİF' : 'PASİF'}
                            </span>
                            <Switch
                                checked={newUser.is_active}
                                onCheckedChange={(checked) => setNewUser({ ...newUser, is_active: checked })}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
                    <Button onClick={onSave} disabled={isPending}>
                        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
