import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, SystemUserCreate } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { Plus, Info, ShieldCheck, UserCircle, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserFormDialog } from "@/components/settings/UserFormDialog";

export function UsersSettingsTab() {
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((s) => s.user);

    const { data: users = [], isLoading: isLoadingUsers } = useQuery({
        queryKey: ['users'],
        queryFn: api.auth.getUsers,
    });

    const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);

    const [newUser, setNewUser] = useState({
        full_name: '',
        username: '',
        role: 'DOCTOR',
        password: '',
        email: '',
        is_active: true,
        is_superuser: false,
    });

    const resetUserForm = useCallback(() => {
        setNewUser({ full_name: '', username: '', role: 'DOCTOR', password: '', email: '', is_active: true, is_superuser: false });
        setConfirmPassword('');
        setEditingUserId(null);
    }, []);

    const createUserMutation = useMutation({
        mutationFn: (data: SystemUserCreate) => api.auth.createUser(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success("Yeni kullanıcı oluşturuldu.");
            setIsUserDialogOpen(false);
            resetUserForm();
        },
        onError: (error: any) => {
            toast.error(error?.message || "Kullanıcı oluşturulamadı.");
        }
    });

    const updateUserMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<SystemUserCreate> }) => api.auth.updateUser(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success("Kullanıcı güncellendi.");
            setIsUserDialogOpen(false);
            resetUserForm();
        },
        onError: (error: any) => {
            toast.error(error?.message || "Kullanıcı güncellenemedi.");
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: (id: string) => api.auth.deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success("Kullanıcı silindi.");
            setIsDeleteDialogOpen(false);
            setUserToDelete(null);
        },
        onError: (error: any) => {
            toast.error(error?.message || "Kullanıcı silinemedi.");
        }
    });

    const handleSaveUser = useCallback(() => {
        if (!newUser.full_name || !newUser.email) {
            toast.error("Lütfen ad soyad ve e-posta alanlarını doldurun.");
            return;
        }

        if (newUser.password !== confirmPassword) {
            toast.error("Şifreler eşleşmiyor.");
            return;
        }

        if (!editingUserId && !newUser.password) {
            toast.error("Lütfen bir şifre belirleyin.");
            return;
        }

        const userData: any = {
            full_name: newUser.full_name,
            email: newUser.email,
            role: newUser.role,
            is_active: newUser.is_active,
            is_superuser: newUser.role === 'ADMIN' || newUser.is_superuser,
        };

        if (newUser.password) {
            userData.password = newUser.password;
        }

        if (editingUserId) {
            updateUserMutation.mutate({ id: editingUserId, data: userData });
        } else {
            createUserMutation.mutate(userData);
        }
    }, [newUser, confirmPassword, editingUserId, updateUserMutation, createUserMutation]);

    const handleEditUser = useCallback((user: any) => {
        setEditingUserId(user.id);
        setNewUser({
            full_name: user.full_name || '',
            username: user.username || user.email || '',
            email: user.email || '',
            role: user.role || 'DOCTOR',
            password: '',
            is_active: user.is_active ?? true,
            is_superuser: user.is_superuser ?? false,
        });
        setConfirmPassword('');
        setIsUserDialogOpen(true);
    }, []);

    const handleDeleteUser = useCallback((id: string) => {
        setUserToDelete(id);
        setIsDeleteDialogOpen(true);
    }, []);

    return (
        <>
            <Card className="border-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                Kullanıcı Yönetimi
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600 rounded-full">
                                            <Info className="h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[450px] text-sm p-5 space-y-4" align="start">
                                        <div className="font-semibold text-slate-800 pb-2 border-b flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 text-blue-500" />
                                            Kullanıcı Yetki Seviyeleri (RBAC)
                                        </div>
                                        <div className="space-y-3">
                                            <div className="text-xs leading-relaxed"><span className="font-bold text-blue-600">ADMIN:</span> Sistemde tam yetkilidir. Modül kısıtlaması yoktur, tüm kullanıcıları yönetebilir ve yeni admin oluşturabilir.</div>
                                            <div className="text-xs leading-relaxed"><span className="font-bold text-emerald-600">DOCTOR:</span> Klinik, Lab, Görüntüleme vb. tıbbi işlemlerde tam yetkilidir. Kullanıcı ekleyebilir ancak yeni ADMIN oluşturamaz ve mevcut adminleri silemez.</div>
                                            <div className="text-xs leading-relaxed"><span className="font-bold text-indigo-600">NURSE:</span> Klinik verileri okuyabilir ve kısıtlı girişler yapabilir. Laboratuvar/Görüntüleme kısımlarına erişebilir ancak kullanıcı yönetemez.</div>
                                            <div className="text-xs leading-relaxed"><span className="font-bold text-orange-600">TECHNICIAN:</span> Sadece Laboratuvar ve Görüntüleme modüllerine tam yetkiyle veri girişi yapabilir. Diğer hasta verilerini değiştiremez.</div>
                                            <div className="text-xs leading-relaxed"><span className="font-bold text-purple-600">FRONTDESK:</span> Sekreter. Randevu, vezne ve hasta kaydı işlemlerinde tam yetkilidir. Tıbbi verilere sadece okuma amaçlı erişebilir.</div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </CardTitle>
                            <CardDescription>Doktor, sekreter ve diğer kullanıcı hesapları yönetimi</CardDescription>
                        </div>
                    </div>
                    <Button size="sm" onClick={() => { resetUserForm(); setIsUserDialogOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" /> Yeni Kullanıcı
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-100 overflow-hidden">
                        <div className="bg-slate-50/50 p-3 grid grid-cols-12 text-xs font-semibold text-slate-500 border-b border-slate-100">
                            <div className="col-span-4">KULLANICI</div>
                            <div className="col-span-4">E-POSTA</div>
                            <div className="col-span-2">ROL</div>
                            <div className="col-span-1 text-center">DURUM</div>
                            <div className="col-span-1 text-right">İŞLEMLER</div>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {isLoadingUsers ? (
                                <div className="p-8 text-center text-slate-400 text-sm">Kullanıcılar yükleniyor...</div>
                            ) : users.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">Kayıtlı kullanıcı bulunamadı.</div>
                            ) : (
                                users.map((user: any) => (
                                    <div key={user.id} className="p-3 grid grid-cols-12 items-center text-sm hover:bg-slate-50/50 transition-colors">
                                        <div className="col-span-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                                                {user.full_name?.charAt(0) || <UserCircle className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900 leading-none">{user.full_name || 'İsimsiz'}</div>
                                                <div className="text-[11px] text-slate-400 mt-1">@{user.username || user.email}</div>
                                            </div>
                                        </div>
                                        <div className="col-span-4 text-slate-600 text-xs">{user.email || '-'}</div>
                                        <div className="col-span-2">
                                            <span className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase",
                                                user.role === 'ADMIN' || user.is_superuser ? "bg-blue-50 text-blue-700 border border-blue-200" :
                                                user.role === 'DOCTOR' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                                user.role === 'NURSE' ? "bg-indigo-50 text-indigo-700 border border-indigo-200" :
                                                user.role === 'TECHNICIAN' ? "bg-orange-50 text-orange-700 border border-orange-200" :
                                                "bg-purple-50 text-purple-700 border border-purple-200"
                                            )}>
                                                {user.is_superuser ? 'ADMIN' : (user.role || 'USER')}
                                            </span>
                                        </div>
                                        <div className="col-span-1 text-center">
                                            <span className={cn(
                                                "inline-block w-2 h-2 rounded-full",
                                                user.is_active ? "bg-emerald-500" : "bg-red-500"
                                            )} title={user.is_active ? 'Aktif' : 'Pasif'} />
                                        </div>
                                        <div className="col-span-1 flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600" onClick={() => handleEditUser(user)}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            {currentUser?.id !== user.id && (
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => handleDeleteUser(user.id)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <UserFormDialog
                open={isUserDialogOpen}
                onOpenChange={(val) => { setIsUserDialogOpen(val); if (!val) resetUserForm(); }}
                editingUserId={editingUserId}
                newUser={newUser}
                setNewUser={setNewUser}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                onSave={handleSaveUser}
                isPending={createUserMutation.isPending || updateUserMutation.isPending}
                currentUserRole={currentUser?.role}
            />

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Kullanıcıyı Sil</DialogTitle>
                        <DialogDescription>Bu kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>İptal</Button>
                        <Button variant="destructive" onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete)} disabled={deleteUserMutation.isPending}>
                            {deleteUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
