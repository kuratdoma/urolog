/**
 * Turkish character normalization mapping
 * Converts Turkish specific characters to ASCII equivalents
 * This allows matching "Kreatinin" = "KREATİNİN" = "KREATININ"
 */
const TURKISH_CHAR_MAP: Record<string, string> = {
    'İ': 'I', 'ı': 'i',
    'Ş': 'S', 'ş': 's',
    'Ğ': 'G', 'ğ': 'g',
    'Ü': 'U', 'ü': 'u',
    'Ö': 'O', 'ö': 'o',
    'Ç': 'C', 'ç': 'c',
};

/**
 * Normalize Turkish characters to ASCII equivalents.
 * @param text - Input text with potential Turkish characters
 * @returns Text with Turkish characters replaced by ASCII equivalents
 */
export const normalizeTurkish = (text: string): string => {
    if (!text) return text;
    let result = text;
    for (const [trChar, asciiChar] of Object.entries(TURKISH_CHAR_MAP)) {
        result = result.split(trChar).join(asciiChar);
    }
    return result;
};

/**
 * Standardize test name for consistent comparison and display.
 * - Converts to lowercase
 * - Normalizes Turkish characters
 * - Strips whitespace
 * - Removes extra spaces
 * @param name - Test name to normalize
 * @returns Normalized test name
 */
export const normalizeTestName = (name: string): string => {
    if (!name) return name;
    const normalized = normalizeTurkish(name.toLowerCase().trim());
    // Remove extra whitespace
    return normalized.replace(/\s+/g, ' ');
};

/**
 * Maps a raw test name to its canonical, properly formatted version.
 * Ensures that all variations of PSA, Testosterone, Urea, etc., are saved exactly the same way.
 * Unmapped names will be title-cased.
 * @param name - Raw test name
 * @returns Canonical, properly capitalized test name
 */
export const canonicalizeTestName = (name: string): string => {
    if (!name) return name;
    
    const n = normalizeTestName(name);

    // PSA Mappings
    if (n.includes('prostat') && (n.includes('ant') || n.includes('spec') || n.includes('spes'))) {
        if (n.includes('serbest') || n.includes('free') || n.includes('fpsa')) return "PSA (Serbest)";
        return "PSA (Total)";
    }
    if (n.includes('serbest') && n.includes('psa')) return "PSA (Serbest)";
    if (n.includes('free') && n.includes('psa')) return "PSA (Serbest)";
    if (n.includes('fpsa') || n.includes('spsa')) return "PSA (Serbest)";
    if (n.includes('total') && n.includes('psa')) return "PSA (Total)";
    if (n.includes('tpsa')) return "PSA (Total)";
    if (n === 'psa') return "PSA (Total)";

    // Testosterone Mappings
    if (n.includes('serbest') && (n.includes('testo') || n.includes('testosteron'))) return "Testosteron (Serbest)";
    if (n.includes('free') && (n.includes('testo') || n.includes('testosteron'))) return "Testosteron (Serbest)";
    if (n.includes('total') && (n.includes('testo') || n.includes('testosteron'))) return "Testosteron (Total)";
    if (['testosteron', 'testosterone'].includes(n)) return "Testosteron (Total)";

    // Common Urological Staples
    if (['crea', 'creatinine', 'kreatinin'].includes(n)) return "Kreatinin";
    if (['urea', 'bun', 'ure'].includes(n)) return "Üre";

    // Title-case other unmapped names
    return name.split(' ').map(word => {
        if (!word) return '';
        const first = word.charAt(0).toLocaleUpperCase('tr-TR');
        const rest = word.slice(1).toLocaleLowerCase('tr-TR');
        return first + rest;
    }).join(' ').replace(/\s+/g, ' ').trim();
};


/**
 * Compare two test names for equality, ignoring case and Turkish character variations
 * @param name1 - First test name
 * @param name2 - Second test name
 * @returns true if names match after normalization
 */
export const testNamesMatch = (name1: string, name2: string): boolean => {
    return normalizeTestName(name1) === normalizeTestName(name2);
};

export const formatLabDecimal = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null || val === '') return '-';
    const str = val.toString().trim();

    const normalized = str.replace(/,/g, '.');
    const num = parseFloat(normalized);

    if (!isNaN(num) && /^-?\d+([.,]\d+)?$/.test(str)) {
        return num.toFixed(2).replace('.', ',');
    }

    const prefixMatch = str.match(/^([<>=]+)\s*([-+]?\d+([.,]\d+)?)$/);
    if (prefixMatch) {
        const op = prefixMatch[1];
        const valNum = parseFloat(prefixMatch[2].replace(/,/g, '.'));
        if (!isNaN(valNum)) {
            return `${op} ${valNum.toFixed(2).replace('.', ',')}`;
        }
    }

    return str;
};

export const formatRefRange = (ref: string | undefined | null, unit?: string | null): string => {
    if (!ref || ref.trim() === '') return '';
    const s = ref.trim();

    // 1. Pre-process leading comma decimals like " ,27 - 4,2" -> " 0.27 - 4.2"
    const sNorm = s.replace(/(^|[^\d.,])\s*,(\d+)/g, '$1 0.$2');

    // 2. Numeric Range format: e.g. "0 - 129", "0.27 - 4.2", "0,27 - 4,2"
    const rangeMatch = sNorm.match(/(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)/);
    if (rangeMatch) {
        const f1 = parseFloat(rangeMatch[1].replace(',', '.'));
        const f2 = parseFloat(rangeMatch[2].replace(',', '.'));
        if (!isNaN(f1) && !isNaN(f2)) {
            const uStr = unit && unit.trim() ? ` ${unit.trim()}` : '';
            return `(${f1.toFixed(2)} - ${f2.toFixed(2)}${uStr})`.replace(/\./g, ',');
        }
    }

    // 3. Numeric Operator format: e.g. "< 248", ">= 90", ">130"
    const opMatch = sNorm.match(/([<>=]+)\s*(\d+(?:[.,]\d+)?)/);
    if (opMatch) {
        const op = opMatch[1];
        const f = parseFloat(opMatch[2].replace(',', '.'));
        if (!isNaN(f)) {
            const uStr = unit && unit.trim() ? ` ${unit.trim()}` : '';
            return `(${op} ${f.toFixed(2)}${uStr})`.replace(/\./g, ',');
        }
    }

    // 4. Non-numeric text reference cleanup (strip leading prefixes like *H, *N, *L, -, etc.)
    let cleanText = s.replace(/^(?:\*[A-Z]+|\*|-|\s)+/, '').trim();
    if (cleanText.startsWith('(') && cleanText.endsWith(')')) {
        cleanText = cleanText.slice(1, -1).trim();
    }
    if (!cleanText || cleanText === '-') return '';

    const uStr = unit && unit.trim() && !cleanText.toLowerCase().includes(unit.trim().toLowerCase()) ? ` ${unit.trim()}` : '';
    return `(${cleanText}${uStr})`;
};

export const isResultAbnormal = (value: string | undefined | null, reference: string | undefined | null): boolean => {
    if (!value || !reference) return false;

    // Clean strings and replace all commas with dots for numeric parsing
    const valStr = value.toString().trim().replace(/,/g, '.');
    const refStr = reference.toString().trim().replace(/,/g, '.');

    // Extract numeric value
    // Matches numbers like '12', '12.5', '-12.5'
    const valMatch = valStr.match(/[-+]?\d*\.?\d+/);
    if (!valMatch) return false;
    const val = parseFloat(valMatch[0]);

    try {
        // Range format: "10 - 20" or "10-20"
        if (refStr.includes('-')) {
            const parts = refStr.split('-').map(p => p.trim());
            if (parts.length === 2) {
                const lowMatch = parts[0].match(/[-+]?\d*\.?\d+/);
                const highMatch = parts[1].match(/[-+]?\d*\.?\d+/);

                if (lowMatch && highMatch) {
                    const low = parseFloat(lowMatch[0]);
                    const high = parseFloat(highMatch[0]);
                    return val < low || val > high;
                }
            }
        }

        if (refStr.startsWith('<')) {
            const numMatch = refStr.match(/[-+]?\d*\.?\d+/);
            if (numMatch) {
                const limit = parseFloat(numMatch[0]);
                if (refStr.includes('=')) {
                    return val > limit;
                }
                return val >= limit;
            }
        }

        if (refStr.startsWith('>')) {
            const numMatch = refStr.match(/[-+]?\d*\.?\d+/);
            if (numMatch) {
                const limit = parseFloat(numMatch[0]);
                if (refStr.includes('=')) {
                    return val < limit;
                }
                return val <= limit;
            }
        }

    } catch (e) {
        return false;
    }

    return false;
};

/**
 * Calculate prostate volume: V = d1 × d2 × d3 × 0.524 (ellipsoid formula)
 * Input values are in mm, result is returned in cc (cm3) as a fixed string.
 */
export const calculateProstatVolume = (w: string, h: string, l: string): string => {
    const width = parseFloat(w);
    const height = parseFloat(h);
    const length = parseFloat(l);
    if (isNaN(width) || isNaN(height) || isNaN(length) || width <= 0 || height <= 0 || length <= 0) {
        return '';
    }
    // Convert mm to cm: divide each by 10, then multiply by 0.524
    const volume = (width / 10) * (height / 10) * (length / 10) * 0.524;
    return volume.toFixed(1);
};
