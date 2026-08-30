import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AIScribeResponse } from '@/lib/api';

interface AIScribeResultDisplayProps {
    result: AIScribeResponse;
}

export function AIScribeResultDisplay({ result }: AIScribeResultDisplayProps) {
    return (
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
                                        {result.tani2_icd && (
                                            <Badge variant="secondary" className="bg-slate-200 text-slate-700 h-5 text-[10px]">
                                                {result.tani2_icd}
                                            </Badge>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {result.tedavi && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Tedavi Planı</label>
                                <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-wrap">
                                    {result.tedavi}
                                </div>
                            </div>
                        )}

                        {result.sikayet && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Şikayet ve Öykü</label>
                                <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 space-y-1">
                                    <p><strong className="text-slate-900">Şikayet:</strong> {result.sikayet}</p>
                                    {result.oyku && <p><strong className="text-slate-900">Hikaye:</strong> {result.oyku}</p>}
                                </div>
                            </div>
                        )}

                        {/* Semptomlar */}
                        {(result.disuri || result.hematuri || result.pollakiuri || result.nokturi) && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Semptom Özeti</label>
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {result.disuri && (
                                        <Badge variant="outline" className="text-[10px] bg-slate-50">
                                            Dizüri: {result.disuri}
                                        </Badge>
                                    )}
                                    {result.hematuri && (
                                        <Badge variant="outline" className="text-[10px] bg-slate-50">
                                            Hematuri: {result.hematuri}
                                        </Badge>
                                    )}
                                    {result.pollakiuri && (
                                        <Badge variant="outline" className="text-[10px] bg-slate-50">
                                            Pollakiüri: {result.pollakiuri}
                                        </Badge>
                                    )}
                                    {result.nokturi && (
                                        <Badge variant="outline" className="text-[10px] bg-slate-50">
                                            Noktüri: {result.nokturi}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}

                        {result.oneriler && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Öneriler</label>
                                <div className="text-xs text-slate-700 bg-amber-50/50 p-2 rounded border border-amber-100">
                                    {result.oneriler}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
