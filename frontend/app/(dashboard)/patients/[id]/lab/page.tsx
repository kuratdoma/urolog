"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { 
    Calendar as CalendarIcon, 
    Printer, 
    Save, 
    Trash2, 
    ClipboardList, 
    BrainCircuit, 
    LineChart as LineChartIcon,
    Download,
    Activity
} from "lucide-react";
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer 
} from 'recharts';
import html2canvas from 'html2canvas';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DatePicker } from "@/components/ui/date-picker";

import { PatientHeader } from "@/components/clinical/patient-header";
import { LabAnalysisDialog } from "@/components/lab/LabAnalysisDialog";
import { 
    BiochemistrySection, 
    HemogramSection, 
    UrineSection, 
    SpermiogramSection, 
    TrusBiopsySection, 
    UroflowmetriSection 
} from "@/components/lab/sections";
import { useLabPage } from "@/hooks/lab/use-lab-page";

export default function LabPage() {
    const {
        patient,
        date, setDate,
        activeTab, setActiveTab,
        fastLabRows, handleFastLabChange, removeFastLabRow, handleFastLabKeyDown,
        hemoValues, setHemoValues,
        urineValues, setUrineValues,
        spermValues, setSpermValues,
        trusValues, setTrusValues,
        biopsyDate, setBiopsyDate,
        pathologyChecks, setPathologyChecks,
        tumorChecks, setTumorChecks,
        uroflowValues, setUroflowValues,
        uroflowFile, setUroflowFile,
        pdfPreviewUrl, setPdfPreviewUrl,
        filteredLabs,
        urineHistory,
        spermHistory,
        trusHistory,
        uroflowHistory,
        selectedHistoryIds,
        historySearch, setHistorySearch,
        sortConfig, toggleSort,
        trendModalOpen, setTrendModalOpen,
        selectedTrendTest, trendData, handleTrendClick, handleDownloadChart,
        ORDER_SETS, applyOrderSet,
        isLabAnalysisOpen, setIsLabAnalysisOpen, handleApplyLabAnalysis,
        isPasteDialogOpen, setIsPasteDialogOpen, pasteText, setPasteText,
        handlePasteAnalysis,
        saveMutation,
        deleteHistoryMutation,
        deleteUroflowmetriBatchMutation,
        deleteTrusBiopsyBatchMutation,
        toggleHistorySelection,
        toggleSelectAllHistory,
        handlePrint,
        trusTemplates
    } = useLabPage();

    const handleDownloadChartPng = async () => {
        const container = document.getElementById("trend-chart-container");
        if (!container) return;
        try {
            const canvas = await html2canvas(container, {
                backgroundColor: "#f8fafc",
                scale: 2
            });
            const imgData = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = `${selectedTrendTest ? selectedTrendTest.replace(/[^a-zA-Z0-9]/g, '_') : 'Grafik'}_Gelisim.png`;
            link.href = imgData;
            link.click();
        } catch (error) {
            console.error("PNG export error:", error);
        }
    };

    return (
        <div className="flex h-full flex-col gap-6 p-6 bg-slate-50/50 min-h-screen">
            <PatientHeader patient={patient ?? null} moduleName="Laboratuvar Sonuçları" />

            <div className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
                    <TabsList className="w-full justify-start h-12 bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                        <TabsTrigger value="biochemistry" className="flex-1 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none text-xs font-bold uppercase tracking-wide">
                            LABORATUVAR
                        </TabsTrigger>
                        <TabsTrigger value="uroflowmetri" className="flex-1 data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:shadow-none text-xs font-bold uppercase tracking-wide">
                            Üroflowmetri
                        </TabsTrigger>
                        <TabsTrigger value="urine" className="flex-1 data-[state=active]:bg-yellow-50 data-[state=active]:text-yellow-700 data-[state=active]:shadow-none text-xs font-bold uppercase tracking-wide">
                            İdrar Analizi
                        </TabsTrigger>
                        <TabsTrigger value="spermiogram" className="flex-1 data-[state=active]:bg-pink-50 data-[state=active]:text-pink-700 data-[state=active]:shadow-none text-xs font-bold uppercase tracking-wide">
                            Semen Analizi
                        </TabsTrigger>
                        <TabsTrigger value="trus_biopsy" className="flex-1 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none text-xs font-bold uppercase tracking-wide">
                            TRUS & Biyopsi
                        </TabsTrigger>
                    </TabsList>

                    <div className="bg-white rounded-xl border border-white p-3 shadow-sm flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">TARİH:</Label>
                                <DatePicker
                                    date={date ? format(date, 'yyyy-MM-dd') : ''}
                                    setDate={val => setDate(val ? new Date(val) : undefined)}
                                    className="w-[160px] border-slate-200 bg-slate-50 h-9 text-xs"
                                />
                            </div>

                            <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 gap-2 text-slate-600 border-slate-300 hover:bg-white hover:text-blue-600">
                                        <ClipboardList className="h-4 w-4" />
                                        <span className="text-xs font-bold uppercase">SONUÇ YAPIŞTIR</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle>Laboratuvar Sonuçlarını Yapıştır</DialogTitle>
                                        <DialogDescription>
                                            Kopyaladığınız ham metni buraya yapıştırın. Sistem otomatik olarak test adlarını ve sonuçları ayrıştıracaktır.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <Textarea
                                        placeholder="Örnek: Sodyum: 141..."
                                        className="h-[300px] font-mono text-sm mt-4"
                                        value={pasteText}
                                        onChange={(e) => setPasteText(e.target.value)}
                                    />
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsPasteDialogOpen(false)}>İptal</Button>
                                        <Button onClick={handlePasteAnalysis} className="bg-blue-600 text-white hover:bg-blue-700">Ayrıştır ve Aktar</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                onClick={() => setIsLabAnalysisOpen(true)}
                            >
                                <BrainCircuit className="h-4 w-4" />
                                <span className="text-xs font-bold uppercase">AKILLI ANALİZ</span>
                            </Button>

                            <LabAnalysisDialog
                                open={isLabAnalysisOpen}
                                onOpenChange={setIsLabAnalysisOpen}
                                onApply={handleApplyLabAnalysis}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => saveMutation.mutate()}
                                className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm min-w-[120px]"
                                disabled={saveMutation.isPending}
                            >
                                <Save className="h-4 w-4" />
                                {saveMutation.isPending ? 'Kaydediliyor...' : 'KAYDET'}
                            </Button>

                            {selectedHistoryIds.length > 0 && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            size="sm"
                                            className="h-9 bg-red-600 hover:bg-red-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                                            disabled={deleteHistoryMutation.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" /> ({selectedHistoryIds.length}) SİL
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {selectedHistoryIds.length} kayıt silinecektir. Bu işlem geri alınamaz.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>İptal</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => {
                                                if (activeTab === 'uroflowmetri') {
                                                    deleteUroflowmetriBatchMutation.mutate();
                                                } else if (activeTab === 'trus_biopsy') {
                                                    deleteTrusBiopsyBatchMutation.mutate();
                                                } else {
                                                    deleteHistoryMutation.mutate();
                                                }
                                            }} className="bg-red-600 hover:bg-red-700 text-white">Sil</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}

                            <div className="h-6 w-px bg-slate-200 mx-1"></div>

                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 w-9 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                                onClick={handlePrint}
                            >
                                <Printer className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <TabsContent value="biochemistry" className="mt-0 outline-none">
                        <BiochemistrySection
                            fastLabRows={fastLabRows}
                            onFastLabUpdate={handleFastLabChange}
                            onRemoveRow={removeFastLabRow}
                            onKeyDown={handleFastLabKeyDown}
                            orderSets={ORDER_SETS}
                            onApplyOrderSet={applyOrderSet as any}
                            historyData={filteredLabs}
                            historySearch={historySearch}
                            onHistorySearchChange={setHistorySearch}
                            sortConfig={sortConfig}
                            onToggleSort={toggleSort}
                            selectedHistoryIds={selectedHistoryIds}
                            onToggleHistorySelection={toggleHistorySelection}
                            onToggleSelectAllHistory={toggleSelectAllHistory}
                            onTrendClick={handleTrendClick}
                            globalDate={date}
                        />
                    </TabsContent>

                    <TabsContent value="hemogram" className="mt-0 outline-none">
                        <HemogramSection values={hemoValues} onChange={setHemoValues} />
                    </TabsContent>

                    <TabsContent value="urine" className="mt-0 outline-none">
                        <UrineSection
                            values={urineValues}
                            onChange={setUrineValues}
                            historyData={urineHistory}
                            sortConfig={sortConfig}
                            onToggleSort={toggleSort}
                            selectedHistoryIds={selectedHistoryIds}
                            onToggleHistorySelection={toggleHistorySelection}
                            onToggleSelectAllHistory={() => toggleSelectAllHistory(urineHistory.map((l: any) => l.id))}
                        />
                    </TabsContent>

                    <TabsContent value="trus_biopsy" className="mt-0 outline-none">
                        <TrusBiopsySection
                            patientId={String(patient?.id || '')}
                            values={trusValues}
                            onChange={setTrusValues}
                            biopsyDate={biopsyDate}
                            onBiopsyDateChange={setBiopsyDate}
                            pathologyChecks={pathologyChecks}
                            onPathologyChecksChange={setPathologyChecks}
                            tumorChecks={tumorChecks}
                            onTumorChecksChange={setTumorChecks}
                            historyData={trusHistory}
                            sortConfig={sortConfig}
                            onToggleSort={toggleSort}
                            trusTemplates={trusTemplates}
                            selectedHistoryIds={selectedHistoryIds}
                            onToggleHistorySelection={toggleHistorySelection}
                            onToggleSelectAllHistory={() => toggleSelectAllHistory(trusHistory.map((l: any) => l.id))}
                        />
                    </TabsContent>

                    <TabsContent value="spermiogram" className="mt-0 outline-none">
                        <SpermiogramSection
                            values={spermValues}
                            onChange={setSpermValues}
                            historyData={spermHistory}
                            sortConfig={sortConfig}
                            onToggleSort={toggleSort}
                            selectedHistoryIds={selectedHistoryIds}
                            onToggleHistorySelection={toggleHistorySelection}
                            onToggleSelectAllHistory={() => toggleSelectAllHistory(spermHistory.map((l: any) => l.id))}
                        />
                    </TabsContent>

                    <TabsContent value="uroflowmetri" className="mt-0 outline-none">
                        <UroflowmetriSection
                            values={uroflowValues}
                            onChange={setUroflowValues}
                            onFileChange={setUroflowFile}
                            historyData={uroflowHistory}
                            sortConfig={sortConfig}
                            onToggleSort={toggleSort}
                            selectedHistoryIds={selectedHistoryIds}
                            onToggleHistorySelection={toggleHistorySelection}
                            onToggleSelectAllHistory={() => toggleSelectAllHistory(uroflowHistory.map((l: any) => l.id))}
                            patientId={String(patient?.id || '')}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Trend Chart Dialog */}
            <Dialog open={trendModalOpen} onOpenChange={setTrendModalOpen}>
                <DialogContent className="max-w-6xl w-[90vw] max-h-[90vh]">
                    <DialogHeader>
                        <div className="flex flex-wrap items-center justify-between pr-8 gap-4">
                            <div>
                                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    <LineChartIcon className="h-5 w-5 text-blue-500" />
                                    {selectedTrendTest} Gelişim Grafiği
                                </DialogTitle>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="h-8 gap-2 border-slate-200 text-slate-600 hover:text-emerald-600" onClick={handleDownloadChartPng}>
                                    <Download className="h-4 w-4" /> PNG İNDİR
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 gap-2 border-slate-200 text-slate-600 hover:text-blue-600" onClick={handleDownloadChart}>
                                    <Download className="h-4 w-4" /> CSV İNDİR
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>
                    <div id="trend-chart-container" className="h-[600px] w-full mt-4 bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                        {trendData.length > 1 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontWeight: 500 }} />
                                    <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontWeight: 500 }} domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                        formatter={(value: any, name: any, props: any) => [
                                            <span className="font-bold text-blue-600" key="res">{props.payload.originalResult} {props.payload.unit}</span>,
                                            "Sonuç"
                                        ]}
                                    />
                                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5, fill: '#fff', stroke: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 8, strokeWidth: 0 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                                <Activity className="h-12 w-12 opacity-20" />
                                <p className="text-sm italic">Grafik için en az 2 sonuç gereklidir.</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* PDF Preview Dialog */}
            <Dialog open={!!pdfPreviewUrl} onOpenChange={(open) => !open && setPdfPreviewUrl(null)}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden gap-0">
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
                        <h3 className="font-bold text-sm text-slate-700">PDF Önizleme</h3>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-2" onClick={() => window.open(pdfPreviewUrl!, '_blank')}>
                                <Printer className="h-3 w-3" /> Yazdır / İndir
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 w-full bg-slate-100 p-0">
                        {pdfPreviewUrl && <iframe src={pdfPreviewUrl} className="w-full h-full border-none" title="PDF Preview" />}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}