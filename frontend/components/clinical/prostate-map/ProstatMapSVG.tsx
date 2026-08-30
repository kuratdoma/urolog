"use client";

import React, { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import * as Popover from "@radix-ui/react-popover";
import { Settings, Check, Copy, RotateCcw, Info } from "lucide-react";
import { PiradsLesion, PIRADS_COLORS } from "./types";
import { PiradsLesionPanel } from "./PiradsLesionPanel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** 
 * Zon etiketleri için yardımcı (ProstateMapWidget'tan taşındı veya paylaşıldı) 
 * Not: Bu etiketler panelde gösterilir.
 */
export const ZONE_LABELS: Record<string, string> = {
  // Base
  "AFS-L-Base": "AFS Sol (Base)", "AFS-R-Base": "AFS Sağ (Base)",
  "TZa-L-Base": "TZa Sol (Base)", "TZa-R-Base": "TZa Sağ (Base)",
  "TZp-L-Base": "TZp Sol (Base)", "TZp-R-Base": "TZp Sağ (Base)",
  "CZ-L-Base": "CZ Sol (Base)", "CZ-R-Base": "CZ Sağ (Base)",
  "PZa-L-Base": "PZa Sol (Base)", "PZa-R-Base": "PZa Sağ (Base)",
  "PZpl-L-Base": "PZpl Sol (Base)", "PZpl-R-Base": "PZpl Sağ (Base)",
  "PZpm-L-Base": "PZpm Sol (Base)", "PZpm-R-Base": "PZpm Sağ (Base)",
  // Mid
  "AFS-L-Mid": "AFS Sol (Mid)", "AFS-R-Mid": "AFS Sağ (Mid)",
  "TZa-L-Mid": "TZa Sol (Mid)", "TZa-R-Mid": "TZa Sağ (Mid)",
  "TZp-L-Mid": "TZp Sol (Mid)", "TZp-R-Mid": "TZp Sağ (Mid)",
  "PZa-L-Mid": "PZa Sol (Mid)", "PZa-R-Mid": "PZa Sağ (Mid)",
  "PZpl-L-Mid": "PZpl Sol (Mid)", "PZpl-R-Mid": "PZpl Sağ (Mid)",
  "PZpm-L-Mid": "PZpm Sol (Mid)", "PZpm-R-Mid": "PZpm Sağ (Mid)",
  // Apex
  "AFS-L-Apex": "AFS Sol (Apex)", "AFS-R-Apex": "AFS Sağ (Apex)",
  "TZa-L-Apex": "TZa Sol (Apex)", "TZa-R-Apex": "TZa Sağ (Apex)",
  "TZp-L-Apex": "TZp Sol (Apex)", "TZp-R-Apex": "TZp Sağ (Apex)",
  "PZa-L-Apex": "PZa Sol (Apex)", "PZa-R-Apex": "PZa Sağ (Apex)",
  "PZpl-L-Apex": "PZpl Sol (Apex)", "PZpl-R-Apex": "PZpl Sağ (Apex)",
  "PZpm-L-Apex": "PZpm Sol (Apex)", "PZpm-R-Apex": "PZpm Sağ (Apex)",
  // SV
  "SV-L-Sv": "Seminal Vezikül Sol", "SV-R-Sv": "Seminal Vezikül Sağ",
};

interface ProstatMapSVGProps {
  lesions: PiradsLesion[];
  selectedZoneId: string | null;
  onZoneClick: (zoneId: string) => void;
  onSave: (data: { pirads: any; size_mm: string; notes: string }) => void;
  onDelete: () => void;
  onClose: () => void;
  focusedLevel?: "Base" | "Mid" | "Apex" | "SV" | null;
}

/**
 * 1024x1024 Orijinal Görsel Üzerindeki Koordinat Haritası (Hotspots)
 * axial: Sağ taraftaki aksiyel dilimlerdeki metin/bölge merkezi
 * coronal: Sol taraftaki büyük genel prostat görünümündeki izdüşüm merkezi
 */
interface ZoneMapping {
  id: string;
  axial: { x: number; y: number };
  coronal: { x: number; y: number };
}

const ZONE_MAP: ZoneMapping[] = [
  // SEMINAL VESICLES
  { id: "SV-L-Sv", axial: { x: 729, y: 110 }, coronal: { x: 329, y: 200 } }, // Viewer Right
  { id: "SV-R-Sv", axial: { x: 559, y: 110 }, coronal: { x: 329, y: 200 } }, // Viewer Left

  // BASE LEVEL 
  { id: "AFS-L-Base", axial: { x: 681, y: 360 }, coronal: { x: 279, y: 419 } },
  { id: "AFS-R-Base", axial: { x: 581, y: 360 }, coronal: { x: 279, y: 419 } },
  { id: "TZa-L-Base", axial: { x: 689, y: 410 }, coronal: { x: 279, y: 419 } },
  { id: "TZa-R-Base", axial: { x: 570, y: 410 }, coronal: { x: 279, y: 419 } },
  { id: "TZp-L-Base", axial: { x: 689, y: 480 }, coronal: { x: 279, y: 419 } },
  { id: "TZp-R-Base", axial: { x: 570, y: 480 }, coronal: { x: 279, y: 419 } },
  { id: "CZ-L-Base",  axial: { x: 681, y: 540 }, coronal: { x: 279, y: 419 } },
  { id: "CZ-R-Base",  axial: { x: 581, y: 540 }, coronal: { x: 279, y: 419 } },
  { id: "PZa-L-Base", axial: { x: 760, y: 440 }, coronal: { x: 279, y: 419 } },
  { id: "PZa-R-Base", axial: { x: 500, y: 440 }, coronal: { x: 279, y: 419 } },
  { id: "PZpl-L-Base",axial: { x: 750, y: 530 }, coronal: { x: 279, y: 419 } },
  { id: "PZpl-R-Base",axial: { x: 510, y: 530 }, coronal: { x: 279, y: 419 } },

  // MID LEVEL 
  { id: "AFS-L-Mid",  axial: { x: 669, y: 710 }, coronal: { x: 240, y: 580 } },
  { id: "AFS-R-Mid",  axial: { x: 600, y: 710 }, coronal: { x: 240, y: 580 } },
  { id: "TZa-L-Mid",  axial: { x: 689, y: 760 }, coronal: { x: 240, y: 580 } },
  { id: "TZa-R-Mid",  axial: { x: 579, y: 760 }, coronal: { x: 240, y: 580 } },
  { id: "TZp-L-Mid",  axial: { x: 689, y: 829 }, coronal: { x: 240, y: 580 } },
  { id: "TZp-R-Mid",  axial: { x: 579, y: 829 }, coronal: { x: 240, y: 580 } },
  { id: "PZpm-L-Mid", axial: { x: 669, y: 880 }, coronal: { x: 240, y: 580 } },
  { id: "PZpm-R-Mid", axial: { x: 600, y: 880 }, coronal: { x: 240, y: 580 } },
  { id: "PZa-L-Mid",  axial: { x: 760, y: 780 }, coronal: { x: 240, y: 580 } },
  { id: "PZa-R-Mid",  axial: { x: 509, y: 780 }, coronal: { x: 240, y: 580 } },
  { id: "PZpl-L-Mid", axial: { x: 750, y: 869 }, coronal: { x: 240, y: 580 } },
  { id: "PZpl-R-Mid", axial: { x: 519, y: 869 }, coronal: { x: 240, y: 580 } },

  // APEX LEVEL 
  { id: "AFS-L-Apex", axial: { x: 660, y: 1240 }, coronal: { x: 209, y: 780 } },
  { id: "AFS-R-Apex", axial: { x: 610, y: 1240 }, coronal: { x: 209, y: 780 } },
  { id: "TZa-L-Apex", axial: { x: 669, y: 1280 }, coronal: { x: 209, y: 780 } },
  { id: "TZa-R-Apex", axial: { x: 600, y: 1280 }, coronal: { x: 209, y: 780 } },
  { id: "TZp-L-Apex", axial: { x: 669, y: 1320 }, coronal: { x: 209, y: 780 } },
  { id: "TZp-R-Apex", axial: { x: 600, y: 1320 }, coronal: { x: 209, y: 780 } },
  { id: "PZpm-L-Apex",axial: { x: 660, y: 1350 }, coronal: { x: 209, y: 780 } },
  { id: "PZpm-R-Apex",axial: { x: 610, y: 1350 }, coronal: { x: 209, y: 780 } },
  { id: "PZa-L-Apex", axial: { x: 729, y: 1290 }, coronal: { x: 209, y: 780 } },
  { id: "PZa-R-Apex", axial: { x: 539, y: 1290 }, coronal: { x: 209, y: 780 } },
  { id: "PZpl-L-Apex",axial: { x: 719, y: 1339 }, coronal: { x: 209, y: 780 } },
  { id: "PZpl-R-Apex",axial: { x: 550, y: 1339 }, coronal: { x: 209, y: 780 } },
];

export const ProstatMapSVG = React.memo(function ProstatMapSVG({
  lesions,
  selectedZoneId,
  onZoneClick,
  onSave,
  onDelete,
  onClose,
  focusedLevel = null,
}: ProstatMapSVGProps) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  
  // -- KALİBRASYON STATE --
  const [isCalibrationMode, setIsCalibrationMode] = useState(false);
  const [calibratingZoneId, setCalibratingZoneId] = useState<string | null>(null);
  const [localZoneMap, setLocalZoneMap] = useState<ZoneMapping[]>(ZONE_MAP);
  const [lastClickedCoords, setLastClickedCoords] = useState<{x: number, y: number} | null>(null);

  // SVG Tıklama Hesaplama
  const handleSVGClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isCalibrationMode && !calibratingZoneId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 1186 / rect.width;
    const scaleY = 1428 / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    setLastClickedCoords({ x, y });

    if (isCalibrationMode && calibratingZoneId) {
      setLocalZoneMap(prev => prev.map(z => {
        if (z.id === calibratingZoneId) {
          // Eğer sol tarafa (projeksiyon) tıklandıysa coronal, sağ tarafa tıklandıysa axial güncelle
          const isCoronalClick = x < 500; 
          return {
            ...z,
            [isCoronalClick ? "coronal" : "axial"]: { x, y }
          };
        }
        return z;
      }));
      toast.success(`${calibratingZoneId} güncellendi: ${x}, ${y}`);
    }
  }, [isCalibrationMode, calibratingZoneId]);

  const copyToClipboard = () => {
    const code = `const ZONE_MAP: ZoneMapping[] = ${JSON.stringify(localZoneMap, null, 2)};`;
    navigator.clipboard.writeText(code);
    toast.success("Yeni koordinat matrisi kopyalandı!");
  };

  const resetCalibration = () => {
    setLocalZoneMap(ZONE_MAP);
    toast.info("Koordinatlar sıfırlandı.");
  };

  const activeZoneData = useMemo(() => 
    localZoneMap.find(z => z.id === calibratingZoneId), 
    [localZoneMap, calibratingZoneId]
  );

  return (
    <div className="relative w-full max-w-[1200px] xl:max-w-none mx-auto rounded-2xl overflow-hidden bg-slate-50 shadow-2xl border border-slate-200 flex flex-col lg:flex-row shadow-indigo-100/20">
      
      {/* ⚠️ KALİBRASYON PANELİ ⚠️ */}
      {isCalibrationMode && (
        <div className="w-full lg:w-80 bg-white/80 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-slate-200 p-4 flex flex-col gap-4 overflow-y-auto max-h-[400px] lg:max-h-none z-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-500" />
              Kalibrasyon
            </h3>
            <button 
              onClick={() => setIsCalibrationMode(false)}
              className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 font-bold transition-colors"
            >
              Kapat
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-2">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              1. Listeden bölgeyi seçin.<br/>
              2. Haritada <b>tam merkeze</b> tıklayın.<br/>
              3. Tüm bölgeler bittiğinde kodu kopyalayın.
            </p>
          </div>

          <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
            {localZoneMap.map(z => (
              <button
                key={z.id}
                onClick={() => setCalibratingZoneId(z.id)}
                className={cn(
                  "text-left px-3 py-2 text-[11px] rounded-md transition-all flex items-center justify-between group",
                  calibratingZoneId === z.id 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 font-bold" 
                    : "hover:bg-slate-100 text-slate-600"
                )}
              >
                <div className="flex flex-col">
                  <span>{ZONE_LABELS[z.id] || z.id}</span>
                  <span className={cn("text-[9px] opacity-70", calibratingZoneId === z.id ? "text-indigo-100" : "text-slate-400")}>
                    {z.axial.x}, {z.axial.y}
                  </span>
                </div>
                {localZoneMap.find(orig => orig.id === z.id && (orig.axial.x !== ZONE_MAP.find(o => o.id === z.id)?.axial.x)) && (
                  <Check className="w-3 h-3 text-emerald-400" />
                )}
              </button>
            ))}
          </div>

          <div className="mt-auto pt-4 flex flex-col gap-2">
            <button 
              onClick={copyToClipboard}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 transition-all shadow-lg"
            >
              <Copy className="w-3.5 h-3.5" />
              GÜNCEL MATRİSİ KOPYALA
            </button>
            <button 
              onClick={resetCalibration}
              className="w-full py-2 bg-white text-slate-500 border border-slate-200 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              Sıfırla
            </button>
          </div>
        </div>
      )}

      {/* ANA HARİTA ALANI */}
      <div className="relative flex-1 overflow-hidden">
        <div className="relative w-full aspect-[1186/1428] lg:h-[75vh]">
          <Image 
            src="/images/clinical/PIRADS_MAP.png"
            alt="mpMRI Prostat Referans Haritası"
            fill
            className={cn("object-contain", isCalibrationMode ? "cursor-crosshair" : "")}
            unoptimized 
          />

          {/* Harita Üstü Butonlar */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-40">
             {!isCalibrationMode && (
               <button 
                 onClick={() => setIsCalibrationMode(true)}
                 className="p-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all group shadow-sm"
                 title="Kalibrasyon Modu"
               >
                 <Settings className="w-4 h-4 text-slate-500 group-hover:text-indigo-600" />
               </button>
             )}
          </div>

        {/* 
          Katman 2: Etkileşim ve İşaretleme Navigasyonu (Overlay)
          Görselin koordinatlarıyla 1186x1428'lik viewBox'u eşliyoruz.
        */}
        <svg 
          viewBox="0 0 1186 1428" 
          className="absolute inset-0 w-full h-full z-10"
          onClick={handleSVGClick}
        >
          {localZoneMap.map((zone) => {
            const hasLesion = lesions.find((l) => l.zoneId === zone.id);
            const isSelected = selectedZoneId === zone.id;
            const isHovered = hoveredZone === zone.id || calibratingZoneId === zone.id;
            const isFocused = focusedLevel && zone.id.includes(focusedLevel);
            const isBeingCalibrated = calibratingZoneId === zone.id;
            
            // Eğer vurgu dışındaysa biraz transparan yap
            const isDimmed = focusedLevel && !isFocused && !hasLesion;

            return (
              <g 
                key={zone.id} 
                className={cn(
                  "transition-opacity duration-300",
                  isDimmed ? "opacity-30" : "opacity-100",
                  isBeingCalibrated && "z-50"
                )}
              >
                {/* 1. HOTSPOT */}
                <Popover.Root 
                  open={isSelected && !isCalibrationMode} 
                  onOpenChange={(open) => !open && onClose()}
                >
                  <Popover.Trigger asChild>
                    <g>
                      <circle 
                        data-zone-id={zone.id}
                        cx={zone.axial.x} 
                        cy={zone.axial.y} 
                        r={zone.id.startsWith("CZ") || zone.id.startsWith("AFS") ? "24" : "34"} 
                        fill={isBeingCalibrated ? "rgba(244, 63, 94, 0.2)" : (isSelected ? "rgba(59, 130, 246, 0.2)" : (isHovered ? "rgba(59, 130, 246, 0.1)" : "transparent"))}
                        stroke={isBeingCalibrated ? "#f43f5e" : (isSelected ? "#3b82f6" : (isHovered ? "#93c5fd" : "transparent"))}
                        strokeWidth={isBeingCalibrated ? "6" : "4"}
                        strokeDasharray={isBeingCalibrated ? "none" : "6 6"}
                        className={cn(
                          "cursor-pointer transition-all duration-200 hover:scale-110 origin-center",
                          isBeingCalibrated && "animate-pulse"
                        )}
                        style={{ transformOrigin: `${zone.axial.x}px ${zone.axial.y}px` }}
                        onClick={(e) => {
                          if (!isCalibrationMode) {
                            onZoneClick(zone.id);
                          } else {
                            setCalibratingZoneId(zone.id);
                          }
                        }}
                        onMouseEnter={() => setHoveredZone(zone.id)}
                        onMouseLeave={() => setHoveredZone(null)}
                      />
                      {/* Kalibrasyon Crosshair Görselleştirme */}
                      {isBeingCalibrated && (
                        <>
                          <line x1={zone.axial.x - 50} y1={zone.axial.y} x2={zone.axial.x + 50} y2={zone.axial.y} stroke="#f43f5e" strokeWidth="2" />
                          <line x1={zone.axial.x} y1={zone.axial.y - 50} x2={zone.axial.x} y2={zone.axial.y + 50} stroke="#f43f5e" strokeWidth="2" />
                        </>
                      )}
                    </g>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content 
                      className="z-[100] animate-in fade-in zoom-in-95 duration-200" 
                      side="right" 
                      sideOffset={10}
                      align="center"
                    >
                      <PiradsLesionPanel
                        zoneId={zone.id}
                        zoneLabel={ZONE_LABELS[zone.id] || zone.id}
                        initialPirads={hasLesion?.pirads}
                        initialSize={hasLesion?.size_mm}
                        initialNotes={hasLesion?.notes}
                        isEditing={!!hasLesion}
                        onSave={onSave}
                        onDelete={onDelete}
                        onClose={onClose}
                      />
                      <Popover.Arrow className="fill-white" />
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>

                {/* 2. LEZYON MARKER */}
                {hasLesion && (
                  <g>
                    <circle 
                      cx={zone.axial.x} 
                      cy={zone.axial.y} 
                      r="26" 
                      fill={PIRADS_COLORS[hasLesion.pirads].fill} 
                      stroke="#ffffff"
                      strokeWidth="4"
                      className="drop-shadow-md"
                      pointerEvents="none"
                    />
                    <text 
                      x={zone.axial.x} 
                      y={zone.axial.y + 8} 
                      textAnchor="middle" 
                      fill="white" 
                      fontSize="22" 
                      fontWeight="900"
                      pointerEvents="none"
                    >
                      {hasLesion.pirads}
                    </text>

                    {/* Projeksiyon (Sol) Çizit üzerinde İşaret */}
                    <circle 
                      cx={zone.coronal.x} 
                      cy={zone.coronal.y} 
                      r="16" 
                      fill={PIRADS_COLORS[hasLesion.pirads].fill} 
                      stroke="#ffffff"
                      strokeWidth="3"
                      className="drop-shadow-md animate-pulse"
                      pointerEvents="none"
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  </div>
  );
});




