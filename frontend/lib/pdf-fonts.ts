import { Font } from '@react-pdf/renderer';
import { format, parseISO, isValid } from 'date-fns';

/**
 * Registers Roboto font with @react-pdf/renderer once.
 * Ensures Turkish characters are properly supported in PDF exports.
 */
export const registerPDFFonts = () => {
    // Only register once
    if (typeof window !== 'undefined' && (window as any).__pdf_fonts_registered__) {
        return;
    }

    try {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        Font.register({
            family: 'Roboto',
            fonts: [
                { src: `${origin}/fonts/Roboto-Regular.ttf`, fontWeight: 'normal' },
                { src: `${origin}/fonts/Roboto-Bold.ttf`, fontWeight: 'bold' },
                { src: `${origin}/fonts/Roboto-Italic.ttf`, fontWeight: 'normal', fontStyle: 'italic' },
                { src: `${origin}/fonts/Roboto-BoldItalic.ttf`, fontWeight: 'bold', fontStyle: 'italic' },
            ],
        });
        if (typeof window !== 'undefined') {
            (window as any).__pdf_fonts_registered__ = true;
        }
        console.log("PDF Fonts (Roboto) registered successfully with origin:", origin);
    } catch (error) {
        console.error("PDF Font registration failed:", error);
    }
};

/**
 * Safe date parsing and formatting to prevent client-side RangeError.
 */
export const formatSafeDate = (dateStr: string | null | undefined, formatStr: string = "dd.MM.yyyy"): string => {
    if (!dateStr || dateStr.trim() === "" || dateStr === "None") return "-";
    try {
        const parsed = parseISO(dateStr);
        if (isValid(parsed)) {
            return format(parsed, formatStr);
        }
    } catch (e) {
        console.error("Failed to parse and format date:", dateStr, e);
    }
    return "-";
};

/**
 * Turkish-aware uppercase transformation.
 * Standard toUpperCase() fails with 'i' -> 'İ' and 'I' -> 'I' logic in non-Turkish locales.
 */
export const trUpper = (text: string | null | undefined): string => {
    if (!text) return "";

    return text
        .replace(/i/g, "İ")
        .replace(/ı/g, "I")
        .toUpperCase();
};
