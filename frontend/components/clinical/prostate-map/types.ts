/**
 * Prostat MRI PI-RADS Haritalama — Veri Tipleri
 * 
 * PI-RADS v2.1 standardına uygun prostat zon tanımları ve lezyon yapısı.
 * Kaynak: ACR PI-RADS Committee, 2019
 */

/** Prostat aksiyel kesit seviyeleri */
export type ProstatSlice = 'base' | 'mid' | 'apex';

/** Prostat anatomik zon kodları (PI-RADS sektör haritası) */
export type ProstatZoneCode =
  // Peripheral Zone
  | 'PZa'     // Peripheral Zone anterior
  | 'PZpl'    // Peripheral Zone posterolateral
  | 'PZpm'    // Peripheral Zone posteromedial
  // Transition Zone
  | 'TZa'     // Transition Zone anterior
  | 'TZp'     // Transition Zone posterior
  // Central Zone (Base only)
  | 'CZ'      // Central Zone
  // Anterior Fibromuscular Stroma
  | 'AFS'     // Anterior Fibromuscular Stroma
  // Seminal Vesicles (separate from slices)
  | 'SV';     // Seminal Vesicle

/** Lateralite — sağ/sol ayrımı */
export type Laterality = 'L' | 'R';

/** Tam zon kimliği: ZonKodu-Taraf-Kesit (e.g., "PZpl-R-Mid") */
export interface ZoneIdentifier {
  zone: ProstatZoneCode;
  side: Laterality;
  slice: ProstatSlice | 'sv';  // 'sv' for seminal vesicles
}

/** PI-RADS skor skalası */
export type PiradsScore = 1 | 2 | 3 | 4 | 5;

/** Tek lezyon kaydı */
export interface PiradsLesion {
  /** Benzersiz lezyon kimliği: "PZpl-R-Mid" formatında */
  zoneId: string;
  /** PI-RADS skoru (1-5) */
  pirads: PiradsScore;
  /** Lezyon boyutu (mm), örn: "12x8" */
  size_mm: string;
  /** Klinik not */
  notes: string;
}

/** PI-RADS skor renk paleti — klinik standart, mor/pembe yasak */
export const PIRADS_COLORS: Record<PiradsScore, { fill: string; label: string; description: string }> = {
  1: { fill: '#22c55e', label: 'PI-RADS 1', description: 'Çok düşük — klinik anlamlı kanser olasılığı yok' },
  2: { fill: '#84cc16', label: 'PI-RADS 2', description: 'Düşük — muhtemelen benign' },
  3: { fill: '#eab308', label: 'PI-RADS 3', description: 'Ara — belirsiz' },
  4: { fill: '#f97316', label: 'PI-RADS 4', description: 'Yüksek — muhtemelen malign' },
  5: { fill: '#ef4444', label: 'PI-RADS 5', description: 'Çok yüksek — yüksek olasılıkla malign' },
};

/** SVG'deki her tıklanabilir zon için tanım */
export interface ZoneDefinition {
  /** Zon kimliği: "PZpl-R-Mid" */
  id: string;
  /** Okunabilir etiket */
  label: string;
  /** Kısa anatomik açıklama */
  description: string;
  /** SVG path verisi (d attribute) */
  path: string;
  /** Hangi kesit grubunda */
  slice: ProstatSlice | 'sv';
  /** Zon kodu */
  zone: ProstatZoneCode;
  /** Taraf */
  side: Laterality;
  /** Varsayılan dolgu rengi (lezyonsuz durumda) */
  defaultFill: string;
}

/**
 * Zon kimliği oluştur
 */
export function makeZoneId(zone: ProstatZoneCode, side: Laterality, slice: ProstatSlice | 'sv'): string {
  return `${zone}-${side}-${slice.charAt(0).toUpperCase() + slice.slice(1)}`;
}

/**
 * Zon kimliğinden bileşenleri çıkar
 */
export function parseZoneId(id: string): ZoneIdentifier | null {
  const parts = id.split('-');
  if (parts.length !== 3) return null;
  return {
    zone: parts[0] as ProstatZoneCode,
    side: parts[1] as Laterality,
    slice: parts[2].toLowerCase() as ProstatSlice | 'sv',
  };
}
