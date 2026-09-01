import { Font } from '@react-pdf/renderer';
import { format, parseISO, isValid } from 'date-fns';

/**
 * Registers Roboto font with @react-pdf/renderer once.
 * Ensures Turkish characters are properly supported in PDF exports.
 */
let fontsRegistered = false;

export const registerPDFFonts = () => {
    // Modül seviyesi bayrak SUNUCUDA da korur. Eski sürümde yalnızca `window` bayrağı
    // vardı; Node'da her PDF bileşeni kendi modül yüklemesinde tekrar kayıt yapıyordu ve
    // `FontFamily.register` kaynakları ÜZERİNE YAZMAZ, listeye EKLER (bkz.
    // @react-pdf/font FontFamily.register) — ilk kayıt kazanır, gerisi ölü kayıt olur.
    if (fontsRegistered) return;
    if (typeof window !== 'undefined' && (window as any).__pdf_fonts_registered__) {
        fontsRegistered = true;
        return;
    }

    try {
        const isServer = typeof window === 'undefined';

        // Sunucuda font DOSYADAN okunur: `fontkit.open(path)` yolu doğrudan destekler
        // (URL olmayan src dosya sistemine düşer). Eski davranış `http://localhost:3000`
        // adresine kendi kendine HTTP isteği atmaktı — Docker'da çalışsa bile port/origin
        // değiştiği anda Türkçe glifler kutuya döner. `public/` standalone imajına
        // kopyalanıyor (frontend/Dockerfile), bu yüzden cwd altında bulunur.
        // NOT: `path`/`fs` import EDİLMEZ — bu modül istemci paketine de giriyor.
        let base = `${process.cwd()}/public/fonts`;
        if (isServer) {
            try {
                // Dynamically resolve directory if running from repo root or subfolder
                const fs = eval('require')('fs');
                const path = eval('require')('path');
                const candidates = [
                    path.join(process.cwd(), 'public', 'fonts'),
                    path.join(process.cwd(), 'frontend', 'public', 'fonts'),
                    '/app/public/fonts',
                ];
                for (const cand of candidates) {
                    if (fs.existsSync(path.join(cand, 'Roboto-Regular.ttf'))) {
                        base = cand;
                        break;
                    }
                }
            } catch {
                base = `${process.cwd()}/public/fonts`;
            }
        } else {
            base = `${window.location.origin}/fonts`;
        }

        Font.register({
            family: 'Roboto',
            fonts: [
                { src: `${base}/Roboto-Regular.ttf`, fontWeight: 'normal' },
                { src: `${base}/Roboto-Bold.ttf`, fontWeight: 'bold' },
                { src: `${base}/Roboto-Italic.ttf`, fontWeight: 'normal', fontStyle: 'italic' },
                { src: `${base}/Roboto-BoldItalic.ttf`, fontWeight: 'bold', fontStyle: 'italic' },
            ],
        });

        fontsRegistered = true;
        if (typeof window !== 'undefined') {
            (window as any).__pdf_fonts_registered__ = true;
        }
    } catch (error) {
        console.error("PDF Font registration failed:", error);
    }
};

/**
 * Safe date parsing and formatting to prevent client-side RangeError.
 */
export const formatSafeDate = (dateVal: any, formatStr: string = "dd.MM.yyyy"): string => {
    if (dateVal === null || dateVal === undefined || dateVal === "None" || dateVal === "null" || dateVal === "undefined") return "-";
    try {
        if (dateVal instanceof Date) {
            return isValid(dateVal) ? format(dateVal, formatStr) : "-";
        }
        const str = String(dateVal).trim();
        if (!str || str === "" || str === "None" || str === "null" || str === "undefined") return "-";
        const parsed = parseISO(str);
        if (isValid(parsed)) {
            return format(parsed, formatStr);
        }
    } catch (e) {
        console.error("Failed to parse and format date:", dateVal, e);
    }
    return "-";
};

/**
 * Turkish-aware uppercase transformation.
 * Standard toUpperCase() fails with 'i' -> 'İ' and 'I' -> 'I' logic in non-Turkish locales.
 */
export const trUpper = (text: any): string => {
    if (text === null || text === undefined) return "";
    return String(text)
        .replace(/i/g, "İ")
        .replace(/ı/g, "I")
        .toUpperCase();
};
