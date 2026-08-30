import React from 'react';
import { Search, X, Plus, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Patient } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface PatientSelectSearchProps {
    selectedPatient: { id: string; name: string } | null;
    setSelectedPatient: (patient: { id: string; name: string } | null) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchOpen: boolean;
    setSearchOpen: (open: boolean) => void;
    searchResults: Patient[];
    handlePatientSelect: (patient: Patient) => void;
    isBlockedMode: boolean;
    blockedCategory: string;
    isEditing: boolean;
    onCloseDialog: () => void;
}

export function PatientSelectSearch({
    selectedPatient,
    setSelectedPatient,
    searchQuery,
    setSearchQuery,
    searchOpen,
    setSearchOpen,
    searchResults,
    handlePatientSelect,
    isBlockedMode,
    blockedCategory,
    isEditing,
    onCloseDialog,
}: PatientSelectSearchProps) {
    const router = useRouter();

    if (isBlockedMode && blockedCategory !== 'Ameliyat') {
        return null;
    }

    return (
        <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
            <Label>{blockedCategory === 'Ameliyat' ? 'Hasta Seçimi (Ameliyat)' : 'Hasta'}</Label>
            {!selectedPatient ? (
                <div className="relative">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="İsim, TC No veya Telefon ile ara..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setSearchOpen(true);
                            }}
                            className="pl-9 h-11 bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm rounded-xl"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {searchOpen && searchQuery.length > 1 && (
                        <div className="absolute z-[100] mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            {searchResults.length === 0 ? (
                                <div className="p-4 text-center">
                                    <p className="text-sm text-slate-500 mb-3">Sonuç bulunamadı.</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full rounded-lg border-blue-100 text-blue-600 bg-blue-50 hover:bg-blue-100"
                                        onClick={() => {
                                            const parts = searchQuery.trim().split(' ');
                                            const soyad = parts.length > 1 ? parts.pop() : '';
                                            const ad = parts.join(' ');
                                            router.push(`/patients/create?ad=${encodeURIComponent(ad)}&soyad=${encodeURIComponent(soyad || '')}`);
                                            setSearchOpen(false);
                                            onCloseDialog();
                                        }}
                                    >
                                        <Plus className="mr-2 h-4 w-4" /> Yeni Hasta Oluştur
                                    </Button>
                                </div>
                            ) : (
                                <div className="max-h-[300px] overflow-y-auto p-1">
                                    {searchResults.map((patient: Patient) => (
                                        <button
                                            key={patient.id}
                                            onClick={() => handlePatientSelect(patient)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-left group"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold shrink-0">
                                                {patient.ad[0]?.toUpperCase()}
                                            </div>
                                            <div className="flex flex-col flex-1 truncate">
                                                <span className="font-bold text-slate-800 text-sm">{patient.ad} {patient.soyad}</span>
                                                <span className="text-xs text-slate-500">{patient.tc_kimlik || 'TC Belirtilmemiş'}</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-slate-300" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex items-center justify-between p-4 border border-blue-100 rounded-xl bg-blue-50/50 shadow-sm animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold italic">
                            {selectedPatient.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-black text-slate-900 leading-tight uppercase italic">{selectedPatient.name}</span>
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Seçili Hasta</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-blue-100 text-blue-400" onClick={() => {
                        if (isEditing) {
                            toast.info("Randevu düzenlenirken hasta değiştirilemez.");
                            return;
                        }
                        setSelectedPatient(null);
                    }}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
