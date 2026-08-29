import { apiFetch } from "./api";

export interface ICDItem {
  kodu: string;
  adi: string;
}

/**
 * Backend üzerinden asenkron ICD Kod araması yapar
 * @param query Arama metni
 */
export const searchStaticICD = async (query: string): Promise<ICDItem[]> => {
    try {
        const result = await apiFetch<ICDItem[]>(`/api/v1/definitions/icd-search?q=${encodeURIComponent(query)}&limit=20`);
        return result || [];
    } catch (e) {
        console.error("ICD arama hatası:", e);
        return [];
    }
};

/**
 * Spesifik bir ICD kodunun adını backend'den sorgular
 * @param code ICD Kodu (örn: A00, N40)
 */
export const lookupICDName = async (code: string): Promise<string> => {
  try {
      const result = await apiFetch<{code: string, name: string}>(`/api/v1/definitions/icd-lookup?code=${encodeURIComponent(code)}`);
      return result?.name || code;
  } catch(e) {
      return code;
  }
};

/**
 * Birden fazla ICD kodunun adını TEK istekte çözümler (ör. bir liste/tablo
 * satır başına ayrı istek atmak yerine). Bulunamayan kodlar kendi değerini
 * döner (lookupICDName ile aynı fallback davranışı).
 */
export const lookupICDNamesBatch = async (
  codes: string[]
): Promise<Record<string, string>> => {
  const uniqueCodes = Array.from(new Set(codes.filter(Boolean)));
  if (uniqueCodes.length === 0) return {};
  try {
      const result = await apiFetch<Record<string, string>>(
          `/api/v1/definitions/icd-lookup-batch`,
          { method: "POST", body: JSON.stringify(uniqueCodes) }
      );
      return result || {};
  } catch (e) {
      // Fallback: her kod kendi değerini göstersin
      return Object.fromEntries(uniqueCodes.map((c) => [c, c]));
  }
};
