"use client";

import React from "react";
import {
    Settings,
    Users,
    Database,
    Building2,
    ShieldCheck,
    Zap,
    FileText,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Modüler Sekmeler
import { GeneralSettingsTab } from "@/components/settings/GeneralSettingsTab";
import { UsersSettingsTab } from "@/components/settings/UsersSettingsTab";
import { DefinitionsSettingsTab } from "@/components/settings/DefinitionsSettingsTab";
import { ConsentFormsSettings } from "@/components/settings/consent-forms-settings";
import { IntegrationsSettings } from "@/components/settings/integrations-settings";
import { AuditLogsSettings } from "@/components/settings/audit-logs";

export default function SettingsPage() {
    return (
        <div className="flex h-full flex-col gap-6 p-6 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        <Settings className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 leading-tight">Sistem Ayarları</h2>
                        <div className="text-xs text-slate-500">
                            Uygulama yapılandırması, kullanıcılar ve tanımlamalar
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1">
                <Tabs defaultValue="general" className="space-y-6">
                    <TabsList className="bg-white p-1 border border-slate-200 rounded-xl w-full justify-start h-12 overflow-x-auto flex-nowrap">
                        <TabsTrigger value="general" className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                            <Building2 className="h-4 w-4" /> Genel & Kurum
                        </TabsTrigger>
                        <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                            <Users className="h-4 w-4" /> Kullanıcılar & Yetki
                        </TabsTrigger>
                        <TabsTrigger value="definitions" className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                            <Database className="h-4 w-4" /> Tanımlar
                        </TabsTrigger>
                        <TabsTrigger value="consent-forms" className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                            <FileText className="h-4 w-4" /> Onam Formları
                        </TabsTrigger>
                        <TabsTrigger value="integrations" className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                            <Zap className="h-4 w-4" /> Entegrasyonlar
                        </TabsTrigger>
                        <TabsTrigger value="audit" className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                            <ShieldCheck className="h-4 w-4" /> Denetim Kayıtları
                        </TabsTrigger>
                    </TabsList>

                    {/* GENEL AYARLAR */}
                    <TabsContent value="general">
                        <GeneralSettingsTab />
                    </TabsContent>

                    {/* KULLANICILAR & YETKİ */}
                    <TabsContent value="users">
                        <UsersSettingsTab />
                    </TabsContent>

                    {/* TANIMLAR */}
                    <TabsContent value="definitions">
                        <DefinitionsSettingsTab />
                    </TabsContent>

                    {/* ONAM FORMLARI */}
                    <TabsContent value="consent-forms">
                        <ConsentFormsSettings />
                    </TabsContent>

                    {/* DENETİM KAYITLARI */}
                    <TabsContent value="audit">
                        <AuditLogsSettings />
                    </TabsContent>

                    {/* ENTEGRASYONLAR */}
                    <TabsContent value="integrations">
                        <IntegrationsSettings />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
