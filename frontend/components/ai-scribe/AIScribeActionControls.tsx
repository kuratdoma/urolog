import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Mic, Square, Loader2, Upload, X, Play, FileText, Save, Pause, PlayCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AIScribeActionControlsProps {
    audio: any;
}

export function AIScribeActionControls({ audio }: AIScribeActionControlsProps) {
    return (
        <div className="flex gap-2 flex-wrap items-center">
            {audio.recordingState === 'idle' && (
                <>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => audio.fileInputRef.current?.click()}
                        className="gap-1"
                    >
                        <Upload className="w-3 h-3" />
                    </Button>
                    <input
                        ref={audio.fileInputRef}
                        type="file"
                        accept="audio/*,.mp3,.wav,.webm,.m4a,.ogg"
                        onChange={audio.handleFileUpload}
                        className="hidden"
                    />
                    <Button
                        size="sm"
                        onClick={audio.startRecording}
                        className="bg-white hover:bg-slate-50 text-blue-950 border border-slate-200 shadow-sm gap-1 w-[12%] min-w-[110px] ml-auto font-bold"
                    >
                        <Mic className="w-3 h-3 text-blue-900" />
                        Başlat
                    </Button>
                </>
            )}

            {(audio.recordingState === 'recording' || audio.recordingState === 'paused') && (
                <>
                    <Button
                        size="sm"
                        onClick={audio.recordingState === 'recording' ? audio.pauseRecording : audio.resumeRecording}
                        variant="outline"
                        className="gap-1 flex-1 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                    >
                        {audio.recordingState === 'recording' ? (
                            <><Pause className="w-3 h-3" /> Duraklat</>
                        ) : (
                            <><PlayCircle className="w-3 h-3" /> Devam Et</>
                        )}
                    </Button>
                    <Button
                        size="sm"
                        onClick={audio.stopRecording}
                        variant="destructive"
                        className="gap-1 flex-1"
                    >
                        <Square className="w-3 h-3" />
                        Durdur ({audio.formatTime(audio.recordingTime)})
                    </Button>
                </>
            )}

            {audio.recordingState === 'stopped' && (
                <>
                    <Button
                        size="sm"
                        onClick={audio.analyzeAudio}
                        disabled={audio.isNewRecording && !audio.isLocalSaved}
                        className={cn(
                            "gap-1 flex-1",
                            audio.isNewRecording && !audio.isLocalSaved
                                ? "bg-slate-300 cursor-not-allowed"
                                : "bg-yellow-500 hover:bg-yellow-600"
                        )}
                        title={audio.isNewRecording && !audio.isLocalSaved ? "Önce lokal kayıt yapılmalı" : "Analiz Et"}
                    >
                        <Play className="w-3 h-3" />
                        Analiz Et
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={audio.startRecording}
                        className="gap-1"
                        title="Yeniden Kaydet"
                    >
                        <Mic className="w-3 h-3" />
                    </Button>
                    {audio.isNewRecording && !audio.isLocalSaved && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={audio.saveRecording}
                            className="gap-1 border-orange-400 text-orange-600 hover:bg-orange-50"
                            title="Lokale Kaydet"
                        >
                            <Save className="w-3 h-3" />
                        </Button>
                    )}
                    {audio.isNewRecording && audio.isLocalSaved && (
                        <Badge className="bg-green-100 text-green-700 text-[10px] px-2">
                            ✓ Kaydedildi
                        </Badge>
                    )}
                </>
            )}

            {audio.recordingState === 'analyzing' && (
                <div className="flex items-center gap-2 text-sm text-slate-500 w-full justify-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analiz ediliyor...</span>
                </div>
            )}

            {audio.recordingState === 'done' && audio.result && (
                <div className="flex gap-2 w-full">
                    <Button
                        size="sm"
                        onClick={() => {
                            if (audio.selectedPersona === 'c3po') {
                                audio.setIsPreviewOpen(true);
                            } else {
                                audio.applyResult();
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
                        onClick={audio.resetState}
                        title="Sıfırla"
                    >
                        <X className="w-3 h-3" />
                    </Button>
                </div>
            )}
        </div>
    );
}
