import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const TWO_DIGIT_COUNTRY_CODES = new Set([
  '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43', '44', '45', '46', '47', '48', '49',
  '51', '52', '53', '54', '55', '56', '57', '58', '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86',
  '90', '91', '92', '93', '94', '95', '98'
]);

export function formatPhoneNumber(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed === '+') return "+";

  const hasPlus = value.startsWith('+') || value.startsWith('00');
  const cleanValue = value.startsWith('00') ? '+' + value.substring(2) : value;

  let countryCode = '90';
  let restDigits = '';

  if (hasPlus) {
    const matchWithSpace = cleanValue.match(/^\+(\d{1,4})[\s.-]+(.*)$/);
    if (matchWithSpace) {
      countryCode = matchWithSpace[1];
      restDigits = matchWithSpace[2].replace(/\D/g, '');
    } else {
      const allDigits = cleanValue.substring(1).replace(/\D/g, '');
      if (allDigits.length === 0) {
        return "+";
      }

      if (allDigits.startsWith('1') || allDigits.startsWith('7')) {
        countryCode = allDigits.substring(0, 1);
        restDigits = allDigits.substring(1);
      } else if (allDigits.length === 1) {
        return `+${allDigits}`;
      } else if (TWO_DIGIT_COUNTRY_CODES.has(allDigits.substring(0, 2))) {
        countryCode = allDigits.substring(0, 2);
        restDigits = allDigits.substring(2);
      } else if (allDigits.length === 2) {
        return `+${allDigits}`;
      } else {
        countryCode = allDigits.substring(0, 3);
        restDigits = allDigits.substring(3);
      }
    }
  } else {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('90')) {
      digits = digits.substring(2);
    }
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }
    countryCode = '90';
    restDigits = digits;
  }

  if (restDigits.length === 0) {
    if (value.endsWith(' ') || value.includes(' ')) {
      return `+${countryCode} `;
    }
    return `+${countryCode}`;
  }

  if (countryCode === '90') {
    const d = restDigits.substring(0, 10);
    let formatted = '+90 ';
    if (d.length > 0) formatted += d.substring(0, 3);
    if (d.length > 3) formatted += ' ' + d.substring(3, 6);
    if (d.length > 6) formatted += ' ' + d.substring(6, 8);
    if (d.length > 8) formatted += ' ' + d.substring(8, 10);
    return formatted.trimEnd();
  }

  if (countryCode === '1') {
    const d = restDigits.substring(0, 10);
    let formatted = '+1 ';
    if (d.length > 0) formatted += d.substring(0, 3);
    if (d.length > 3) formatted += ' ' + d.substring(3, 6);
    if (d.length > 6) formatted += ' ' + d.substring(6, 10);
    return formatted.trimEnd();
  }

  const d = restDigits.substring(0, 12);
  let formatted = `+${countryCode} `;
  if (d.length <= 3) {
    formatted += d;
  } else if (d.length <= 6) {
    formatted += d.substring(0, 3) + ' ' + d.substring(3);
  } else if (d.length <= 9) {
    formatted += d.substring(0, 3) + ' ' + d.substring(3, 6) + ' ' + d.substring(6);
  } else {
    formatted += d.substring(0, 3) + ' ' + d.substring(3, 6) + ' ' + d.substring(6, 9) + ' ' + d.substring(9, 12);
  }

  return formatted.trimEnd();
}

/** Turkish-aware sentence case while preserving common abbreviations in uppercase */
export const formatToSentenceCasePreservingAbbreviations = (text: string | null | undefined): string => {
  if (!text) return "";
  
  const abbreviations = [
    "PSA", "HPV", "MR", "BT", "USG", "MRG", "TUR-P", "TUR-M", "TURP", "TURM", 
    "ESWL", "URS", "RIRS", "PIRADS", "PI-RADS", "ICD", "IVP", "DMSA", "MAG3", "DTPA"
  ];

  // Split text into sentences by .!? followed by whitespace
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  const formattedSentences = sentences.map(sentence => {
    if (!sentence.trim()) return sentence;
    
    // Split sentence into words and retain punctuation/whitespace
    const words = sentence.split(/(\s+|[.,!?;:()]+)/);
    
    const formattedWords = words.map((word, index) => {
      if (/^(\s+|[.,!?;:()]+)$/.test(word)) return word;
      
      // Clean word from suffixes for lookup
      const cleanWord = word.replace(/['’].*$/, "").toUpperCase();
      
      const isAbbrev = abbreviations.some(abbr => abbr.toUpperCase() === cleanWord);
      if (isAbbrev) {
        const suffixIndex = word.indexOf("'") !== -1 ? word.indexOf("'") : word.indexOf("’");
        if (suffixIndex !== -1) {
          const abbrevPart = word.substring(0, suffixIndex).toUpperCase();
          const suffixPart = word.substring(suffixIndex).toLocaleLowerCase("tr-TR");
          return abbrevPart + suffixPart;
        }
        return word.toUpperCase();
      }
      
      const lowerWord = word.toLocaleLowerCase("tr-TR");
      
      // Check if this is the first word of the sentence
      let isFirstWord = true;
      for (let i = 0; i < index; i++) {
        if (!/^(\s+|[.,!?;:()]+)$/.test(words[i])) {
          isFirstWord = false;
          break;
        }
      }
      
      if (isFirstWord) {
        return lowerWord.charAt(0).toLocaleUpperCase("tr-TR") + lowerWord.slice(1);
      }
      
      return lowerWord;
    });
    
    return formattedWords.join("");
  });
  
  return formattedSentences.join(" ");
};
