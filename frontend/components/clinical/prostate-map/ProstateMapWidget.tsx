"use client";
import React, { useState, useCallback, useMemo } from "react";

import { ProstatMapSVG, ZONE_LABELS } from "./ProstatMapSVG";
import { PiradsLesion, PiradsScore, PIRADS_COLORS } from "./types";
import { Trash2, Target } from "lucide-react";

interface ProstateMapWidgetProps {
  /** Mevcut lezyonlar */
  lesions: PiradsLesion[];
  /** Lezyon listesi değiştiğinde çağrılır */
  onLesionsChange: (lesions: PiradsLesion[]) => void;
  /** Kompakt mod — TRUS biyopsi entegrasyonu için */
  compact?: boolean;
}



/**
 * Prostat MRI Haritalama Widget'ı.
 * 
 * Anatomik harita + lezyon paneli + lezyon listesi tablosu.
 * Imaging ve TRUS Biyopsi sayfalarına gömülebilir.
 */
export const ProstateMapWidget = React.memo(function ProstateMapWidget({
  lesions,
  onLesionsChange,
  compact = false,
}: ProstateMapWidgetProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [focusedLevel, setFocusedLevel] = useState<"Base" | "Mid" | "Apex" | "SV" | null>(null);

  // Seçili zonda lezyon var mı?
  const existingLesion = useMemo(() => {
    if (!selectedZoneId) return null;
    return lesions.find(l => l.zoneId === selectedZoneId) || null;
  }, [selectedZoneId, lesions]);

  const handleZoneClick = useCallback((zoneId: string) => {
    // Sol panelden gelen seviye odaklama tetikleyicileri
    if (zoneId.endsWith("_FOCUS")) {
      const level = zoneId.split("_")[0] as any;
      setFocusedLevel(prev => prev === level ? null : level);
      setSelectedZoneId(null); // Odaklanırken spesifik seçimi temizle
      return;
    }

    // Sağ panelden spesifik zon seçimi
    setSelectedZoneId(prev => (prev === zoneId ? null : zoneId));

    // Seçilen zonun hangi seviyede olduğunu anla ve otomatik odakla
    if (zoneId.includes("-Base")) setFocusedLevel("Base");
    else if (zoneId.includes("-Mid")) setFocusedLevel("Mid");
    else if (zoneId.includes("-Apex")) setFocusedLevel("Apex");
    else if (zoneId.includes("-Sv")) setFocusedLevel(null);
  }, []);

  const handleSave = useCallback((data: { pirads: PiradsScore; size_mm: string; notes: string }) => {
    if (!selectedZoneId) return;

    const updated = lesions.filter(l => l.zoneId !== selectedZoneId);
    updated.push({
      zoneId: selectedZoneId,
      pirads: data.pirads,
      size_mm: data.size_mm,
      notes: data.notes,
    });
    onLesionsChange(updated);
    setSelectedZoneId(null);
  }, [selectedZoneId, lesions, onLesionsChange]);

  const handleDelete = useCallback(() => {
    if (!selectedZoneId) return;
    onLesionsChange(lesions.filter(l => l.zoneId !== selectedZoneId));
    setSelectedZoneId(null);
  }, [selectedZoneId, lesions, onLesionsChange]);

  const handleDeleteFromTable = useCallback((zoneId: string) => {
    onLesionsChange(lesions.filter(l => l.zoneId !== zoneId));
    if (selectedZoneId === zoneId) setSelectedZoneId(null);
  }, [lesions, onLesionsChange, selectedZoneId]);

  const handleClose = useCallback(() => {
    setSelectedZoneId(null);
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Başlık */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
        <Target className="w-4 h-4 text-indigo-500" />
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          mpMRI Prostat Haritası — PI-RADS Lezyon İşaretleme
        </h3>
        {lesions.length > 0 && (
          <span className="ml-auto bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {lesions.length} lezyon
          </span>
        )}
      </div>

      {/* İçerik: Harita (Popover ile) */}
      <div className="p-4 overflow-hidden">
        <div className="w-full min-w-0 overflow-hidden pb-4">
          <ProstatMapSVG
            lesions={lesions}
            selectedZoneId={selectedZoneId}
            onZoneClick={handleZoneClick}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={handleClose}
            focusedLevel={focusedLevel}
          />
        </div>
      </div>

      {/* Alt: Lezyon Listesi Tablosu */}
      {lesions.length > 0 && (
        <div className="border-t border-slate-100">
          <div className="px-4 py-1.5 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            İşaretlenen Lezyonlar
          </div>
          <div className="divide-y divide-slate-50">
            {lesions.map((lesion) => (
              <div
                key={lesion.zoneId}
                className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors group"
              >
                {/* PI-RADS Badge */}
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white font-black text-xs shrink-0"
                  style={{ backgroundColor: PIRADS_COLORS[lesion.pirads].fill }}
                >
                  {lesion.pirads}
                </div>
                {/* Zon bilgisi */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate">
                    {ZONE_LABELS[lesion.zoneId] || lesion.zoneId}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    {lesion.size_mm && <span className="font-mono">{lesion.size_mm} mm</span>}
                    {lesion.notes && <span className="truncate italic">— {lesion.notes}</span>}
                  </div>
                </div>
                {/* Silme */}
                <button
                  onClick={() => handleDeleteFromTable(lesion.zoneId)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                  aria-label="Lezyonu sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PI-RADS Renk Skalası */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 border-t border-slate-100">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">PI-RADS:</span>
        {([1, 2, 3, 4, 5] as PiradsScore[]).map((score) => (
          <div key={score} className="flex items-center gap-0.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: PIRADS_COLORS[score].fill }}
            />
            <span className="text-[9px] font-bold text-slate-500">{score}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
