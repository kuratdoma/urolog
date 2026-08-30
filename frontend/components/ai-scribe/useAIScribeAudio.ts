import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { api, AIScribeResponse, AIScribeTemplate } from "@/lib/api";
import { useSettingsStore } from "@/stores/settings-store";
import { useAIScribeStore } from "@/stores/ai-scribe-store";

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped' | 'analyzing' | 'done';

interface UseAIScribeAudioProps {
    onResult: (result: AIScribeResponse) => void;
    patientId?: string;
    onClosePopover: () => void;
}

export function useAIScribeAudio({ onResult, patientId, onClosePopover }: UseAIScribeAudioProps) {
    const { aiScribeMode } = useSettingsStore();
    const { setLatestResult, setIsProcessing } = useAIScribeStore();

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

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const templatesLoadedRef = useRef(false);

    useEffect(() => {
        const loadTemplates = async (retries = 3) => {
            if (templatesLoadedRef.current) return;
            templatesLoadedRef.current = true;

            try {
                const data = await api.aiScribe.getTemplates();
                setTemplates(data);
                if (data.length > 0 && !selectedTemplate) {
                    setSelectedTemplate(data[0].name);
                }
            } catch (err: any) {
                console.error("AI Scribe template fetch error:", err);
                if (retries > 0) {
                    setTimeout(() => {
                        templatesLoadedRef.current = false;
                        loadTemplates(retries - 1);
                    }, 2000);
                }
            }
        };

        loadTemplates();
    }, [selectedTemplate]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                if (recordingState === 'idle') {
                    startRecording();
                } else if (recordingState === 'recording') {
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

            let mimeType = 'audio/webm; codecs=opus';
            if (MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')) {
                mimeType = 'audio/ogg; codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/webm; codecs=opus')) {
                mimeType = 'audio/webm; codecs=opus';
            }

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 64000
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

    const saveToLocal = async (blob: Blob): Promise<boolean> => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const extension = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('webm') ? 'webm' : 'opus';
        const filename = `c3po-kayit-${timestamp}.${extension}`;

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
                    toast.warning('Kayıt iptal edildi. Lütfen dosyayı kaydedin.');
                    return false;
                }
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
        toast.success('Ses kaydı indirildi.');
        return true;
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
            onClosePopover();
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

    const saveRecording = async () => {
        if (!audioBlob || !isNewRecording) return;
        const saved = await saveToLocal(audioBlob);
        setIsLocalSaved(saved);
    };

    return {
        recordingState,
        recordingTime,
        formatTime,
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
        handleFileUpload,
        analyzeAudio,
        applyResult,
        resetState,
        saveRecording,
        audioFileName,
        isNewRecording,
        isLocalSaved,
        result,
        error,
        selectedPersona,
        setSelectedPersona,
        isPreviewOpen,
        setIsPreviewOpen,
        fileInputRef,
        audioBlob,
    };
}
