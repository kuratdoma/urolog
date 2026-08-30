'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { PatientSelectSearch } from './PatientSelectSearch';
import { AppointmentDateTimeSection } from './AppointmentDateTimeSection';
import { AppointmentServiceDoctorSection } from './AppointmentServiceDoctorSection';
import { useAppointmentForm } from './useAppointmentForm';

interface CreateAppointmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    patientId?: string;
    patientName?: string;
    appointment?: any;
    existingAppointments?: any[];
    initialStart?: Date;
    initialEnd?: Date;
}

export function CreateAppointmentDialog(props: CreateAppointmentDialogProps) {
    const { isOpen, onClose, appointment } = props;
    const form = useAppointmentForm(props);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] overflow-visible">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-8">
                        <DialogTitle>
                            {appointment
                                ? 'Randevuyu Düzenle'
                                : (form.isBlockedMode ? 'Randevu Kapat / Bloke Et' : 'Yeni Randevu Oluştur')}
                        </DialogTitle>
                        {!appointment && (
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button
                                    onClick={() => form.setIsBlockedMode(false)}
                                    className={cn(
                                        "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                        !form.isBlockedMode ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Randevu
                                </button>
                                <button
                                    onClick={() => form.setIsBlockedMode(true)}
                                    className={cn(
                                        "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                        form.isBlockedMode ? "bg-white shadow-sm text-red-600" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Bloke Et
                                </button>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    {form.isBlockedMode && (
                        <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                            <Label>Bloke Gerekçesi</Label>
                            <Select value={form.blockedCategory} onValueChange={form.setBlockedCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Gerekçe seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Ameliyat">Ameliyat</SelectItem>
                                    <SelectItem value="Toplantı">Toplantı</SelectItem>
                                    <SelectItem value="Firma Görüşmesi">Firma Görüşmesi</SelectItem>
                                    <SelectItem value="Kongre">Kongre</SelectItem>
                                    <SelectItem value="İzin">İzin</SelectItem>
                                    <SelectItem value="Eğitim">Eğitim</SelectItem>
                                    <SelectItem value="Hasta Vizit (Yatan Hasta)">Hasta Vizit (Yatan Hasta)</SelectItem>
                                    <SelectItem value="Akademik Çalışma">Akademik Çalışma</SelectItem>
                                    <SelectItem value="Hastalık/Rapor">Hastalık/Rapor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <PatientSelectSearch
                        selectedPatient={form.selectedPatient}
                        setSelectedPatient={form.setSelectedPatient}
                        searchQuery={form.searchQuery}
                        setSearchQuery={form.setSearchQuery}
                        searchOpen={form.searchOpen}
                        setSearchOpen={form.setSearchOpen}
                        searchResults={form.searchResults}
                        handlePatientSelect={form.handlePatientSelect}
                        isBlockedMode={form.isBlockedMode}
                        blockedCategory={form.blockedCategory}
                        isEditing={!!appointment}
                        onCloseDialog={onClose}
                    />

                    <AppointmentServiceDoctorSection
                        isBlockedMode={form.isBlockedMode}
                        services={form.services}
                        selectedServiceId={form.selectedServiceId}
                        handleServiceSelect={form.handleServiceSelect}
                        doctors={form.doctors}
                        selectedDoctorName={form.selectedDoctorName}
                        handleDoctorSelect={form.handleDoctorSelect}
                    />

                    <AppointmentDateTimeSection
                        startDate={form.startDate}
                        setStartDate={form.setStartDate}
                        endDate={form.endDate}
                        setEndDate={form.setEndDate}
                        isBlockedMode={form.isBlockedMode}
                        isAllDay={form.isAllDay}
                        setIsAllDay={form.setIsAllDay}
                        handleDateChange={form.handleDateChange}
                        handleTimeChange={form.handleTimeChange}
                    />

                    {form.collisionWarning && (
                        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg animate-in slide-in-from-top-1">
                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-amber-800">
                                    {form.collisionWarning.status === 'blocked' ? 'Saat Bloke Edilmiş' : 'Çakışma Tespit Edildi'}
                                </span>
                                <span className="text-xs text-amber-700">
                                    Seçili saatte <b>{form.collisionWarning.title}</b> {form.collisionWarning.status === 'blocked' ? 'mevcut' : 'ile çakışıyor'}.
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label>{form.isBlockedMode ? 'Kapatma Gerekçesi' : 'Notlar'}</Label>
                        <Textarea
                            placeholder={form.isBlockedMode ? "Neden randevu verilmeyecek? (Kongre, İzin vb.)" : "Randevu notları..."}
                            className={cn("h-20", form.isBlockedMode && "border-red-100 bg-red-50/20 focus:ring-red-500/20")}
                            value={form.notes}
                            onChange={(e) => form.setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>İptal</Button>
                    <Button
                        onClick={form.handleSubmit}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]"
                        disabled={form.isPending}
                    >
                        {form.isPending
                            ? 'İşleniyor...'
                            : (appointment ? 'Güncelle' : (form.isBlockedMode ? 'Bloke Et' : 'Randevu Oluştur'))}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
