import { apiFetch } from "./api";

export interface ICDItem {
  kodu: string;
  adi: string;
}

/**
 * Backend üzerinden asenkron ICD Kod araması yapar.
 * @param query Arama metni
 * @param signal İsteği iptal etmek için AbortSignal (yazmaya devam eden
 *   kullanıcının eski isteklerinin geç dönüp yenisini ezmesini engeller)
 */
export const searchStaticICD = async (
  query: string,
  signal?: AbortSignal
): Promise<ICDItem[]> => {
    try {
        const result = await apiFetch<ICDItem[]>(
            `/api/v1/definitions/icd-search?q=${encodeURIComponent(query)}&limit=20`,
            { signal }
        );
        return result || [];
    } catch (e) {
        // İptal edilen istek hata değil — sessizce boş dön.
        if (e instanceof DOMException && e.name === "AbortError") return [];
        console.error("ICD arama hatası:", e);
        return [];
    }
};

/**
 * Spesifik bir ICD kodunun adını backend'den sorgular.
 * Kod bulunamazsa null döner — kodun kendisini "ad" gibi döndürmek çağıranın
 * geçersiz bir kodu doğrulanmış sanmasına yol açıyordu.
 */
export const lookupICDName = async (
  code: string,
  signal?: AbortSignal
): Promise<string | null> => {
  try {
      const result = await apiFetch<{ code: string; name: string | null; found: boolean }>(
          `/api/v1/definitions/icd-lookup?code=${encodeURIComponent(code)}`,
          { signal }
      );
      return result?.name ?? null;
  } catch {
      return null;
  }
};

/**
 * Birden fazla ICD kodunun adını TEK istekte çözümler (ör. bir liste/tablo
 * satır başına ayrı istek atmak yerine). Bulunamayan kodlar `null` döner;
 * gösterim tarafındaki fallback (kodu yazmak) çağıranın sorumluluğunda.
 */
export const lookupICDNamesBatch = async (
  codes: string[]
): Promise<Record<string, string | null>> => {
  const uniqueCodes = Array.from(new Set(codes.filter(Boolean)));
  if (uniqueCodes.length === 0) return {};
  try {
      const result = await apiFetch<Record<string, string | null>>(
          `/api/v1/definitions/icd-lookup-batch`,
          { method: "POST", body: JSON.stringify(uniqueCodes) }
      );
      return result || {};
  } catch {
      // İstek başarısız: hiçbir kod çözümlenemedi.
      return Object.fromEntries(uniqueCodes.map((c) => [c, null]));
  }
};
