"use client";

import React, { useState, useEffect } from "react";
import { PiradsScore, PIRADS_COLORS } from "./types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, Check, Trash2 } from "lucide-react";

interface PiradsLesionPanelProps {
  zoneId: string;
  zoneLabel: string;
  /** Mevcut PI-RADS skoru (düzenleme modunda) */
  initialPirads?: PiradsScore;
  initialSize?: string;
  initialNotes?: string;
  /** Mevcut bir lezyon düzenleniyorsa true */
  isEditing: boolean;
  onSave: (data: { pirads: PiradsScore; size_mm: string; notes: string }) => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * PI-RADS Lezyon Detay Paneli.
 * Zon tıklandığında açılır — skor, boyut, not girişi sağlar.
 */
export const PiradsLesionPanel = React.memo(function PiradsLesionPanel({
  zoneId,
  zoneLabel,
  initialPirads,
  initialSize = "",
  initialNotes = "",
  isEditing,
  onSave,
  onDelete,
  onClose,
}: PiradsLesionPanelProps) {
  const [pirads, setPirads] = useState<PiradsScore | null>(initialPirads ?? null);
  const [size, setSize] = useState(initialSize);
  const [notes, setNotes] = useState(initialNotes);

  // Zon değiştiğinde sıfırla
  useEffect(() => {
    setPirads(initialPirads ?? null);
    setSize(initialSize);
    setNotes(initialNotes);
  }, [zoneId, initialPirads, initialSize, initialNotes]);

  const handleSave = () => {
    if (!pirads) return;
    onSave({ pirads, size_mm: size, notes });
  };

  return (
    <div className="w-[260px] bg-white rounded-lg border border-slate-200 shadow-xl animate-in fade-in-50 zoom-in-95 duration-200 overflow-hidden">
      {/* Başlık */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lezyon Kaydı</p>
          <p className="text-xs font-bold text-slate-700 truncate">{zoneLabel}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all"
          aria-label="Kapat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* PI-RADS Skor Seçimi */}
      <div className="px-3 py-2.5">
        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
          PI-RADS Skoru
        </Label>
        <div className="flex gap-1">
          {([1, 2, 3, 4, 5] as PiradsScore[]).map((score) => {
            const isActive = pirads === score;
            const color = PIRADS_COLORS[score];
            return (
              <button
                key={score}
                onClick={() => setPirads(score)}
                className="flex-1 flex flex-col items-center py-1.5 rounded-md border-2 transition-all duration-150"
                style={{
                  borderColor: isActive ? color.fill : "transparent",
                  backgroundColor: isActive ? `${color.fill}15` : "#f8fafc",
                }}
                title={color.description}
              >
                <span
                  className="text-sm font-black"
                  style={{ color: isActive ? color.fill : "#94a3b8" }}
                >
                  {score}
                </span>
              </button>
            );
          })}
        </div>
        {pirads && (
          <p className="text-[9px] text-slate-400 mt-1 text-center italic">
            {PIRADS_COLORS[pirads].description}
          </p>
        )}
      </div>

      {/* Boyut + Not */}
      <div className="px-3 pb-2 space-y-2">
        <div>
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Boyut (mm)</Label>
          <Input
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="Örn: 12x8"
            className="h-7 text-xs bg-slate-50 mt-0.5"
          />
        </div>
        <div>
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Not</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Difüzyon kısıtlanması mevcut..."
            className="h-7 text-xs bg-slate-50 mt-0.5"
          />
        </div>
      </div>

      {/* Aksiyonlar */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border-t border-slate-100">
        <Button
          size="sm"
          className="flex-1 h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
          onClick={handleSave}
          disabled={!pirads}
        >
          <Check className="w-3 h-3" />
          {isEditing ? "Güncelle" : "Ekle"}
        </Button>
        {isEditing && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 gap-1"
            onClick={onDelete}
          >
            <Trash2 className="w-3 h-3" />
            Sil
          </Button>
        )}
      </div>
    </div>
  );
});
