import React, { useState } from "react";
import {
    Database, Activity, CreditCard, FileText, Users2, CalendarDays,
    Microscope, ClipboardList, Briefcase, FlaskConical, Building2,
    ShieldCheck, Pill, FileSignature, Stethoscope
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Alt Tanım Bileşenleri
import { DoctorsSettings } from "@/components/settings/doctors-settings";
import { DefinitionList } from "@/components/settings/definition-list";
import { AppointmentTypeSettings } from "@/components/settings/appointment-type-settings";
import { BiopsyTemplateSettings } from "@/components/settings/biopsy-template-settings";
import { PrescriptionTemplateSettings } from "@/components/settings/prescription-template-settings";
import { GeneralTemplateSettings } from "@/components/settings/general-template-settings";

export function DefinitionsSettingsTab() {
    const [activeCategory, setActiveCategory] = useState<string>('clinical');
    const [activeDefinition, setActiveDefinition] = useState<string>('doctors');

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-4">
                {/* Categories Sidebar */}
                <div className="w-full md:w-64 space-y-2">
                    <div className="px-3 py-2">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Tanım Grupları</h3>
                        <div className="space-y-1">
                            {[
                                { id: 'clinical', name: 'Klinik Tanımlar', icon: <Database className="w-4 h-4" /> },
                                { id: 'surgical', name: 'Operasyon Tanımları', icon: <Activity className="w-4 h-4" /> },
                                { id: 'financial', name: 'Finansal Tanımlar', icon: <CreditCard className="w-4 h-4" /> },
                                { id: 'templates', name: 'Şablon Yönetimi', icon: <FileText className="w-4 h-4" /> },
                            ].map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        setActiveCategory(cat.id);
                                        if (cat.id === 'clinical') setActiveDefinition('doctors');
                                        if (cat.id === 'surgical') setActiveDefinition('hastaneler');
                                        if (cat.id === 'financial') setActiveDefinition('institutions');
                                        if (cat.id === 'templates') setActiveDefinition('biopsy-templates');
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                                        activeCategory === cat.id
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                                            : "text-slate-600 hover:bg-slate-100"
                                    )}
                                >
                                    {cat.icon}
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Separator className="my-2" />
                    <div className="px-3 py-2">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Tanım Listeleri</h3>
                        <div className="space-y-1">
                            {activeCategory === 'clinical' && [
                                { id: 'doctors', name: 'Doktorlar & Ekip', icon: <Users2 className="w-4 h-4" /> },
                                { id: 'appointment-types', name: 'Randevu Türleri', icon: <CalendarDays className="w-4 h-4" /> },
                                { id: 'imaging', name: 'Tetkik Tanımları (Rad)', icon: <Microscope className="w-4 h-4" /> },
                                { id: 'followup', name: 'Takip Konuları', icon: <ClipboardList className="w-4 h-4" /> },
                                { id: 'anesthesia', name: 'Anestezi Tipleri', icon: <Activity className="w-4 h-4" /> },
                                { id: 'occupations', name: 'Meslek Listesi', icon: <Briefcase className="w-4 h-4" /> },
                                { id: 'urine-antibiogram', name: 'İdrar Antibiyogram Tanımı', icon: <FlaskConical className="w-4 h-4" /> },
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveDefinition(cat.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                                        activeDefinition === cat.id
                                            ? "bg-slate-900 text-white"
                                            : "text-slate-500 hover:bg-slate-200/50"
                                    )}
                                >
                                    {cat.icon}
                                    {cat.name}
                                </button>
                            ))}
                            {activeCategory === 'surgical' && [
                                { id: 'hastaneler', name: 'Hastane', icon: <Building2 className="w-4 h-4" /> },
                                { id: 'cerrahlar', name: 'Cerrah', icon: <Users2 className="w-4 h-4" /> },
                                { id: 'asistanlar', name: 'Asistan', icon: <Users2 className="w-4 h-4" /> },
                                { id: 'hemsireler', name: 'Hemşire', icon: <Users2 className="w-4 h-4" /> },
                                { id: 'anesteziPersonelleri', name: 'Anestezi', icon: <Users2 className="w-4 h-4" /> },
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveDefinition(cat.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                                        activeDefinition === cat.id
                                            ? "bg-slate-900 text-white"
                                            : "text-slate-500 hover:bg-slate-200/50"
                                    )}
                                >
                                    {cat.icon}
                                    {cat.name}
                                </button>
                            ))}
                            {activeCategory === 'financial' && [
                                { id: 'institutions', name: 'Kurumlar', icon: <Building2 className="w-4 h-4" /> },
                                { id: 'insurances', name: 'Özel Sigortalar', icon: <ShieldCheck className="w-4 h-4" /> },
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveDefinition(cat.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                                        activeDefinition === cat.id
                                            ? "bg-slate-900 text-white"
                                            : "text-slate-500 hover:bg-slate-200/50"
                                    )}
                                >
                                    {cat.icon}
                                    {cat.name}
                                </button>
                            ))}
                            {activeCategory === 'templates' && [
                                { id: 'biopsy-templates', name: 'TRUS Biyopsi Şablonu', icon: <ClipboardList className="w-4 h-4" /> },
                                { id: 'prescription-templates', name: 'Reçete Şablonları', icon: <Pill className="w-4 h-4" /> },
                                { id: 'operation-notes', name: 'Ameliyat Notu Şablonları', icon: <FileSignature className="w-4 h-4" /> },
                                { id: 'medical-interventions', name: 'Tıbbi Müdahale Şablonları', icon: <Stethoscope className="w-4 h-4" /> },
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveDefinition(cat.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                                        activeDefinition === cat.id
                                            ? "bg-slate-900 text-white"
                                            : "text-slate-500 hover:bg-slate-200/50"
                                    )}
                                >
                                    {cat.icon}
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 min-h-[640px] shadow-sm">
                    {activeDefinition === 'doctors' && <DoctorsSettings />}
                    {activeDefinition === 'hastaneler' && <DefinitionList title="Hastane" category="hastaneler" />}
                    {activeDefinition === 'cerrahlar' && <DefinitionList title="Cerrah" category="cerrahlar" />}
                    {activeDefinition === 'asistanlar' && <DefinitionList title="Asistan" category="asistanlar" />}
                    {activeDefinition === 'anesteziPersonelleri' && <DefinitionList title="Anestezi" category="anesteziPersonelleri" />}
                    {activeDefinition === 'hemsireler' && <DefinitionList title="Hemşire" category="hemsireler" />}
                    {activeDefinition === 'institutions' && <DefinitionList title="Kurum" category="kurumlar" />}
                    {activeDefinition === 'occupations' && <DefinitionList title="Meslek" category="meslekler" />}
                    {activeDefinition === 'insurances' && <DefinitionList title="Sigorta" category="sigortalar" />}
                    {activeDefinition === 'appointment-types' && <AppointmentTypeSettings />}
                    {activeDefinition === 'biopsy-templates' && <BiopsyTemplateSettings />}
                    {activeDefinition === 'imaging' && <DefinitionList title="Tetkik (Görüntüleme)" category="tetkikTanimlari" customGrup="RADYOLOJI" />}
                    {activeDefinition === 'urine-antibiogram' && <DefinitionList title="İdrar Antibiyogram Paneli" category="tetkikTanimlari" customGrup="IDRAR_ANTIBIYOGRAM" />}
                    {activeDefinition === 'anesthesia' && <DefinitionList title="Anestezi Tipi" category="anesteziTipleri" />}
                    {activeDefinition === 'followup' && <DefinitionList title="Takip Konusu" category="takipKonulari" />}
                    {activeDefinition === 'prescription-templates' && <PrescriptionTemplateSettings />}
                    {activeDefinition === 'operation-notes' && <GeneralTemplateSettings grup="operation_note" title="Ameliyat Notu Şablonları" description="Ameliyat notu girişinde kullanılacak şablonlar. 'Başlık | Not İçeriği' formatında yazılması önerilir." />}
                    {activeDefinition === 'medical-interventions' && <GeneralTemplateSettings grup="medical_intervention" title="Tıbbi Müdahale Şablonları" description="Tıbbi müdahale raporlarında kullanılacak hazır metin şablonları." />}
                </div>
            </div>
        </div>
    );
}
