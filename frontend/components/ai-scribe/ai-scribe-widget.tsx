"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Mic, Square, Loader2, CheckCircle, AlertCircle,
    Upload, X, Play, FileText, Save, Pause, PlayCircle, Download
} from "lucide-react";
import { toast } from "sonner";
import { api, AIScribeResponse, AIScribeTemplate } from "@/lib/api";
import { useSettingsStore } from "@/stores/settings-store";
import { useAIScribeStore } from "@/stores/ai-scribe-store";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { AIScribePreviewDialog } from "./AIScribePreviewDialog";

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped' | 'analyzing' | 'done';

interface AIScribeWidgetProps {
    onResult: (result: AIScribeResponse) => void;
    patientId?: string;
}

export function AIScribeWidget({ onResult, patientId }: AIScribeWidgetProps) {
    const { aiScribeMode } = useSettingsStore();
    const { setLatestResult, setIsProcessing } = useAIScribeStore();

    const [isOpen, setIsOpen] = useState(false);
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioFileName, setAudioFileName] = useState<string | null>(null);
    const [isNewRecording, setIsNewRecording] = useState(false);
    const [isLocalSaved, setIsLocalSaved] = useState(false);
    const [result, setResult] = useState<AIScribeResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [templates, setTemplates] = useState<AIScribeTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('Yeni Üroloji Hastası');
    const [selectedPersona, setSelectedPersona] = useState<string>('default');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [activePatientId, setActivePatientId] = useState<string | undefined>(undefined);

    const [popoverSize, setPopoverSize] = useState<{ width: number | string; height: number | string }>({
        width: '25vw',
        height: 'auto'
    });

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        
        const popoverElement = (e.target as HTMLElement).closest('.popover-resizable') as HTMLElement;
        if (!popoverElement) return;
        
        const startWidth = popoverElement.offsetWidth;
        const startHeight = popoverElement.offsetHeight;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = startX - moveEvent.clientX; // drag left increases width
            const deltaY = moveEvent.clientY - startY; // drag down increases height

            const newWidth = Math.max(350, startWidth + deltaX);
            const newHeight = Math.max(250, startHeight + deltaY);

            setPopoverSize({
                width: `${newWidth}px`,
                height: `${newHeight}px`
            });
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const templatesLoadedRef = useRef(false);

    // Load templates after hydration - with ref guard to prevent duplicate loads
    useEffect(() => {
        const loadTemplates = async (retries = 3) => {
            if (templatesLoadedRef.current) return;
            templatesLoadedRef.current = true;

            try {
                const templateList = await api.aiScribe.getTemplates();
                if (Array.isArray(templateList)) {
                    setTemplates(templateList);
                }
            } catch (e) {
                console.warn('Failed to load AI Scribe templates, retrying...', e);
                templatesLoadedRef.current = false; // Allow retry on error
                if (retries > 0) {
                    setTimeout(() => loadTemplates(retries - 1), 2500);
                }
            }
        };

        // Check if already hydrated with token
        const state = useAuthStore.getState();
        if (state._hasHydrated && state.token) {
            loadTemplates();
            return;
        }

        // Subscribe and wait for hydration
        const unsubscribe = useAuthStore.subscribe((state) => {
            if (state._hasHydrated && state.token && !templatesLoadedRef.current) {
                loadTemplates();
                unsubscribe();
            }
        });

        return () => unsubscribe();
    }, []);

    // Keyboard Shortcuts & BeforeUnload
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Alt + P -> Pause/Resume
            if (e.altKey && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                if (recordingState === 'recording') {
                    pauseRecording();
                } else if (recordingState === 'paused') {
                    resumeRecording();
                }
            }
            // Alt + S -> Start/Stop
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (recordingState === 'idle' || recordingState === 'stopped') {
                    startRecording();
                } else if (recordingState === 'recording' || recordingState === 'paused') {
                    stopRecording();
                }
            }
        };

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (recordingState === 'recording' || recordingState === 'paused') {
                e.preventDefault();
                e.returnValue = 'Devam eden bir ses kaydınız var. Sayfadan ayrılmak istediğinize emin misiniz?';
                return e.returnValue;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [recordingState]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            streamRef.current = stream;

            // Use OGG Opus at 64kbps for optimal quality/size ratio
            let mimeType = 'audio/webm; codecs=opus';
            if (MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')) {
                mimeType = 'audio/ogg; codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/webm; codecs=opus')) {
                mimeType = 'audio/webm; codecs=opus';
            }

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 64000 // 64 kbps Opus
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
                setAudioBlob(blob);
                setRecordingState('stopped');
                toast.info('Kayıt durduruldu. Şimdi analizi başlatabilirsiniz.');
            };

            mediaRecorder.start(1000);
            setRecordingState('recording');
            setRecordingTime(0);
            setIsNewRecording(true);
            setAudioFileName(null);
            setActivePatientId(patientId);
            setError(null);
            setResult(null);
            setIsLocalSaved(false);

            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Microphone access error:', err);
            toast.error('Mikrofon erişimi sağlanamadı.');
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && recordingState === 'recording') {
            mediaRecorderRef.current.pause();
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setRecordingState('paused');
            toast.info('Kayıt duraklatıldı.');
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && recordingState === 'paused') {
            mediaRecorderRef.current.resume();
            setRecordingState('recording');
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
            toast.info('Kayıt devam ediyor.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && (recordingState === 'recording' || recordingState === 'paused')) {
            mediaRecorderRef.current.stop();
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const validTypes = [
            'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/m4a', 'audio/ogg',
            'video/webm', 'video/mp4', 'video/ogg'
        ];
        if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|webm|m4a|mp4|ogg)$/i)) {
            toast.error('Desteklenmeyen dosya formatı.');
            return;
        }

        if (file.size > 100 * 1024 * 1024) {
            toast.error('Dosya boyutu çok büyük. Maksimum 100MB.');
            return;
        }

        setAudioBlob(file);
        setAudioFileName(file.name);
        setActivePatientId(patientId);
        setRecordingState('stopped');
        setIsNewRecording(false);
        setError(null);
        setResult(null);
        toast.success(`"${file.name}" yüklendi.`);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const analyzeAudio = async () => {
        if (!audioBlob) {
            toast.error('Önce ses kaydı yapın veya dosya yükleyin.');
            return;
        }

        setRecordingState('analyzing');
        setIsProcessing(true);
        setError(null);

        try {
            const response = await api.aiScribe.analyze(
                audioBlob,
                aiScribeMode,
                selectedTemplate === 'none' ? undefined : selectedTemplate,
                false,
                activePatientId || patientId,
                selectedPersona
            );

            setResult(response);
            setLatestResult(response);
            setRecordingState('done');
            toast.success(`C-3PO analizi tamamlandı! (${response.processing_time_seconds}s)`);

            // Otomatik Kayıt: Önce TXT, sonra Ses dosyası
            await saveTxtToLocal(response);
            if (audioBlob) {
                const saved = await saveToLocal(audioBlob);
                setIsLocalSaved(saved);
            }
        } catch (err: any) {
            const message = err.message || 'Analiz sırasında hata oluştu';
            setError(message);
            setRecordingState('stopped');
            toast.error(message);
        } finally {
            setIsProcessing(false);
        }
    };

    const applyResult = () => {
        if (result) {
            onResult(result);
            toast.success('C-3PO sonuçları forma aktarıldı.');
            resetState();
            setIsOpen(false);
        }
    };

    const resetState = () => {
        setRecordingState('idle');
        setRecordingTime(0);
        setAudioBlob(null);
        setAudioFileName(null);
        setIsNewRecording(false);
        setIsLocalSaved(false);
        setResult(null);
        setError(null);
        chunksRef.current = [];
    };

    const saveTxtToLocal = async (resultData: AIScribeResponse): Promise<boolean> => {
        if (!resultData) return false;

        let content = `C-3PO KLİNİK ANALİZ RAPORU\n`;
        content += `Tarih: ${new Date().toLocaleString('tr-TR')}\n`;
        content += `==========================================\n\n`;

        if (resultData.clinical_note) {
            content += `## KLİNİK NOT:\n${resultData.clinical_note}\n\n`;
        }

        content += `## DETAYLAR:\n`;
        if (resultData.sikayet) content += `- Şikayet: ${resultData.sikayet}\n`;
        if (resultData.tani1) content += `- Tanı: ${resultData.tani1} (${resultData.tani1_icd || ''})\n`;
        if (resultData.tani2) content += `- Tanı 2: ${resultData.tani2} (${resultData.tani2_icd || ''})\n`;
        if (resultData.tani3) content += `- Tanı 3: ${resultData.tani3} (${resultData.tani3_icd || ''})\n`;
        if (resultData.ayirici_tanilar) content += `- Ayırıcı Tanılar: ${resultData.ayirici_tanilar}\n`;
        if (resultData.oyku) content += `- Öykü: ${resultData.oyku}\n`;
        if (resultData.tedavi) content += `- Tedavi Planı: ${resultData.tedavi}\n`;
        if (resultData.oneriler) content += `- Öneriler: ${resultData.oneriler}\n`;
        if (resultData.tetkikler) content += `- Tetkik Önerileri: ${resultData.tetkikler}\n`;

        content += `\n## SEMPTOMLAR:\n`;
        content += `- Disüri: ${resultData.disuri || 'Yok'}\n`;
        content += `- Pollakiüri: ${resultData.pollakiuri || 'Yok'}\n`;
        content += `- Noktüri: ${resultData.nokturi || 'Yok'}\n`;
        content += `- Hematüri: ${resultData.hematuri || 'Yok'}\n`;
        content += `- Genital Akıntı: ${resultData.genital_akinti || 'Yok'}\n`;
        content += `- Kabızlık: ${resultData.kabizlik || 'Yok'}\n`;
        content += `- Taş Öyküsü: ${resultData.tas_oyku || 'Yok'}\n`;

        content += `\n## CİNSEL SAĞLIK:\n`;
        content += `- Erektil İşlev: ${resultData.erektil_islev || 'Belirtilmedi'}\n`;
        content += `- Ejakülasyon: ${resultData.ejakulasyon || 'Belirtilmedi'}\n`;

        content += `\n==========================================\n`;
        content += `Analiz Modu: ${resultData.mode_used}\n`;
        content += `İşlem Süresi: ${resultData.processing_time_seconds}s\n`;

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `c3po-analiz-${timestamp}.txt`;

        if ('showSaveFilePicker' in window) {
            try {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'Text Files',
                        accept: { 'text/plain': ['.txt'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                toast.success('Analiz TXT dosyası başarıyla kaydedildi.');
                return true;
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    toast.warning('TXT kaydı iptal edildi.');
                    return false;
                }
                console.error('File System Access API error:', err);
            }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Analiz TXT olarak indirildi.');
        return true;
    };

    const downloadTxt = () => {
        if (!result) return;
        saveTxtToLocal(result);
    };

    // Save recording to local filesystem - returns true if saved successfully
    const saveToLocal = async (blob: Blob): Promise<boolean> => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const extension = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('webm') ? 'webm' : 'opus';
        const filename = `c3po-kayit-${timestamp}.${extension}`;

        // Try File System Access API first (Chrome/Edge)
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'Audio Files',
                        accept: { [blob.type]: [`.${extension}`] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                toast.success('Ses kaydı başarıyla kaydedildi.');
                return true;
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    // User cancelled - this is not an error
                    toast.warning('Kayıt iptal edildi. Lütfen dosyayı kaydedin.');
                    return false;
                }
                console.error('File System Access API error:', err);
                // Fall through to blob download
            }
        }

        // Fallback: Blob download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Ses kaydı indirildi.');
        return true;
    };

    // Handle recording stop - save locally first, then enable analysis
    const handleRecordingStop = async (blob: Blob) => {
        if (!blob || blob.size < 1000) {
            toast.error('Kayıt çok kısa veya boş.');
            return;
        }

        // Save to local first
        const saved = await saveToLocal(blob);
        setIsLocalSaved(saved);

        if (saved) {
            toast.info('Şimdi analizi başlatabilirsiniz.');
        }
    };

    // Manual save button handler (for re-saving)
    const saveRecording = async () => {
        if (!audioBlob || !isNewRecording) return;
        const saved = await saveToLocal(audioBlob);
        setIsLocalSaved(saved);
    };

    // Button appearance based on state
    const getButtonAppearance = () => {
        switch (recordingState) {
            case 'recording':
                return { bg: 'bg-red-500 hover:bg-red-600', icon: <div className="w-2 h-2 rounded-full bg-white animate-pulse" /> };
            case 'paused':
                return { bg: 'bg-orange-500 hover:bg-orange-600', icon: <Pause className="h-4 w-4" /> };
            case 'analyzing':
                return { bg: 'bg-yellow-500 hover:bg-yellow-600', icon: <Loader2 className="h-4 w-4 animate-spin" /> };
            case 'done':
                return { bg: 'bg-green-500 hover:bg-green-600', icon: <CheckCircle className="h-4 w-4" /> };
            default:
                return { bg: 'bg-slate-500 hover:bg-slate-600', icon: <Mic className="h-4 w-4" /> };
        }
    };

    const buttonAppearance = getButtonAppearance();

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    size="sm"
                    className={cn(
                        "h-9 gap-2 font-bold text-xs text-white shadow-lg transition-all",
                        buttonAppearance.bg,
                        (recordingState === 'recording' || recordingState === 'paused') && "animate-pulse"
                    )}
                >
                    {buttonAppearance.icon}
                    <span>C-3PO</span>
                    {(recordingState === 'recording' || recordingState === 'paused') && (
                        <span className="font-mono text-[10px] ml-1">{formatTime(recordingTime)}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                className="popover-resizable overflow-hidden min-w-[350px] min-h-[250px] w-[60vw] max-w-[90vw] p-4 max-h-[80vh] shadow-2xl rounded-xl border border-slate-200 bg-white flex flex-col"
                style={{ width: popoverSize.width, height: popoverSize.height }}
                align="end"
            >
                {/* Custom Resize Handle - Bottom Left */}
                <div 
                    onMouseDown={handleResizeMouseDown}
                    className="absolute left-0 bottom-0 w-5 h-5 cursor-nesw-resize z-50 flex items-end justify-start p-1"
                    title="Yeniden Boyutlandır"
                >
                    <svg width="10" height="10" viewBox="0 0 10 10" className="text-slate-400 fill-current opacity-70 hover:opacity-100 transition-opacity">
                        <line x1="1" y1="9" x2="9" y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="5" y1="9" x2="9" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Mic className="h-4 w-4 text-yellow-500" />
                            <span className="font-bold text-sm">AI Scribe</span>
                        </div>
                        <select
                            value={selectedPersona}
                            onChange={(e) => setSelectedPersona(e.target.value)}
                            className="text-xs border rounded p-1"
                        >
                            <option value="default">Standart Mod</option>
                            <option value="c3po">C-3PO (Dr. Alp Modu)</option>
                        </select>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 flex-wrap items-center">
                        {recordingState === 'idle' && (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="gap-1"
                                >
                                    <Upload className="w-3 h-3" />
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="audio/*,.mp3,.wav,.webm,.m4a,.ogg"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                 <Button
                                     size="sm"
                                     onClick={startRecording}
                                     className="bg-white hover:bg-slate-50 text-blue-950 border border-slate-200 shadow-sm gap-1 w-[12%] min-w-[110px] ml-auto font-bold"
                                 >
                                     <Mic className="w-3 h-3 text-blue-900" />
                                     Başlat
                                 </Button>
                            </>
                        )}

                        {(recordingState === 'recording' || recordingState === 'paused') && (
                            <>
                                <Button
                                    size="sm"
                                    onClick={recordingState === 'recording' ? pauseRecording : resumeRecording}
                                    variant="outline"
                                    className="gap-1 flex-1 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                                >
                                    {recordingState === 'recording' ? (
                                        <><Pause className="w-3 h-3" /> Duraklat</>
                                    ) : (
                                        <><PlayCircle className="w-3 h-3" /> Devam Et</>
                                    )}
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={stopRecording}
                                    variant="destructive"
                                    className="gap-1 flex-1"
                                >
                                    <Square className="w-3 h-3" />
                                    Durdur ({formatTime(recordingTime)})
                                </Button>
                            </>
                        )}

                        {recordingState === 'stopped' && (
                            <>
                                <Button
                                    size="sm"
                                    onClick={analyzeAudio}
                                    disabled={isNewRecording && !isLocalSaved}
                                    className={cn(
                                        "gap-1 flex-1",
                                        isNewRecording && !isLocalSaved
                                            ? "bg-slate-300 cursor-not-allowed"
                                            : "bg-yellow-500 hover:bg-yellow-600"
                                    )}
                                    title={isNewRecording && !isLocalSaved ? "Önce lokal kayıt yapılmalı" : "Analiz Et"}
                                >
                                    <Play className="w-3 h-3" />
                                    Analiz Et
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={startRecording}
                                    className="gap-1"
                                    title="Yeniden Kaydet"
                                >
                                    <Mic className="w-3 h-3" />
                                </Button>
                                {isNewRecording && !isLocalSaved && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={saveRecording}
                                        className="gap-1 border-orange-400 text-orange-600 hover:bg-orange-50"
                                        title="Lokale Kaydet"
                                    >
                                        <Save className="w-3 h-3" />
                                    </Button>
                                )}
                                {isNewRecording && isLocalSaved && (
                                    <Badge className="bg-green-100 text-green-700 text-[10px] px-2">
                                        ✓ Kaydedildi
                                    </Badge>
                                )}
                            </>
                        )}

                        {recordingState === 'analyzing' && (
                            <div className="flex items-center gap-2 text-sm text-slate-500 w-full justify-center py-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Analiz ediliyor...</span>
                            </div>
                        )}

                        {recordingState === 'done' && result && (
                            <div className="flex gap-2 w-full">
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        if (selectedPersona === 'c3po') {
                                            setIsPreviewOpen(true);
                                        } else {
                                            applyResult();
                                        }
                                    }}
                                    className="bg-green-600 hover:bg-green-700 gap-1 flex-1"
                                >
                                    <FileText className="w-3 h-3" />
                                    Forma Uygula
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={resetState}
                                    title="Sıfırla"
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* File name display */}
                    {audioFileName && (
                        <div className="text-xs text-slate-500 truncate bg-slate-50 p-2 rounded">
                            📁 {audioFileName}
                        </div>
                    )}

                    {/* Error display */}
                    {error && (
                        <div className="bg-red-50 text-red-600 text-xs p-2 rounded flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{error}</span>
                        </div>
                    )}

                    {/* Result preview / Full Display */}
                    {result && recordingState === 'done' && (
                        <div className="space-y-4 pt-2">
                            <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                                {/* Success Header */}
                                <div className="bg-green-50 p-2.5 rounded border border-green-200">
                                    <div className="flex items-center justify-between text-green-700 font-bold text-sm mb-1">
                                        <div className="flex items-center gap-1">
                                            <CheckCircle className="w-4 h-4" />
                                            <span>Analiz Tamamlandı</span>
                                        </div>
                                        <span className="text-[10px] font-normal">{result.processing_time_seconds}s</span>
                                    </div>
                                </div>

                                {/* Detailed Content */}
                                <div className="space-y-3 px-1">
                                    {result.clinical_note && (
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Klinik Not</label>
                                            <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 whitespace-pre-wrap leading-relaxed">
                                                {result.clinical_note}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-3">
                                        {result.tani1 && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Tanı ve Kodlar</label>
                                                <div className="text-xs bg-blue-50 p-2 rounded border border-blue-100 text-blue-900 font-medium flex items-center justify-between">
                                                    <span>{result.tani1}</span>
                                                    {result.tani1_icd && (
                                                        <Badge variant="secondary" className="bg-blue-200 text-blue-900 h-5 text-[10px]">
                                                            {result.tani1_icd}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {result.tani2 && (
                                                    <div className="text-xs bg-slate-50 p-2 rounded border border-slate-100 text-slate-800 font-medium flex items-center justify-between">
                                                        <span>{result.tani2}</span>
                                                        {result.tani2_icd && <Badge variant="outline" className="h-5 text-[10px]">{result.tani2_icd}</Badge>}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {result.sikayet && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Şikayet</label>
                                                <p className="text-xs text-slate-600 px-1">{result.sikayet}</p>
                                            </div>
                                        )}

                                        {result.tedavi && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Tedavi Planı</label>
                                                <div className="text-xs bg-yellow-50/50 p-2 rounded border border-yellow-100 text-slate-700 italic">
                                                    {result.tedavi}
                                                </div>
                                            </div>
                                        )}

                                        {result.oneriler && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Öneriler</label>
                                                <p className="text-xs text-slate-600 px-1">{result.oneriler}</p>
                                            </div>
                                        )}

                                        {result.tetkikler && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Tetkik Önerileri</label>
                                                <p className="text-xs text-slate-600 px-1">{result.tetkikler}</p>
                                            </div>
                                        )}

                                        {(result.erektil_islev || result.ejakulasyon) && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Cinsel Sağlık</label>
                                                <div className="text-xs bg-pink-50/50 p-2 rounded border border-pink-100/50 space-y-1.5">
                                                    {result.erektil_islev && (
                                                        <div><span className="font-semibold text-pink-700">Sertleşme:</span> {result.erektil_islev}</div>
                                                    )}
                                                    {result.ejakulasyon && (
                                                        <div><span className="font-semibold text-pink-700">Ejakülasyon:</span> {result.ejakulasyon}</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {(result.disuri || result.pollakiuri || result.nokturi || result.hematuri || result.kabizlik) && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Semptom Özeti</label>
                                                <div className="text-[11px] grid grid-cols-2 gap-x-2 gap-y-1 bg-slate-50 p-2 rounded border border-slate-100">
                                                    {result.disuri && <div><span className="text-slate-400">Yanma:</span> {result.disuri}</div>}
                                                    {result.pollakiuri && <div><span className="text-slate-400">Sık İdrar:</span> {result.pollakiuri}</div>}
                                                    {result.nokturi && <div><span className="text-slate-400">Gece İdrar:</span> {result.nokturi}</div>}
                                                    {result.hematuri && <div><span className="text-slate-400">Hematüri:</span> {result.hematuri}</div>}
                                                    {result.kabizlik && <div><span className="text-slate-400">Kabızlık:</span> {result.kabizlik}</div>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Actions for Done State */}
                            <div className="flex gap-2 pt-2 border-t">
                                <Button
                                    size="sm"
                                    onClick={applyResult}
                                    className="bg-green-600 hover:bg-green-700 gap-1 flex-[2] font-bold"
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    Forma Aktar
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={downloadTxt}
                                    className="gap-1 flex-1 text-slate-600"
                                    title="TXT Olarak İndir"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    İndir
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={resetState}
                                    className="h-9 w-9 p-0 text-slate-400 hover:text-red-500"
                                    title="Sıfırla"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Template selection */}
                    {templates.length > 0 && (
                        <div className="pt-2 border-t">
                            <label className="text-[10px] font-medium text-slate-500 uppercase">Şablon</label>
                            <select
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                disabled={recordingState === 'recording' || recordingState === 'analyzing'}
                                className="w-full text-xs p-2 border rounded bg-slate-50 mt-1"
                            >
                                <option value="none">Varsayılan</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </PopoverContent>
            
            <AIScribePreviewDialog
                open={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                data={result}
                onApply={() => {
                    setIsPreviewOpen(false);
                    applyResult();
                }}
                onCancel={() => setIsPreviewOpen(false)}
            />
        </Popover>
    );
}
