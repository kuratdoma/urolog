import { describe, it, expect } from 'vitest';
import { validateTCKN } from './patient-form';

describe('Hasta Kayıt - TCKN Doğrulama Kuralı', () => {
    it('boş TCKN değeri geçerli sayılmalıdır (zorunlu olmayan alanlar için)', () => {
        expect(validateTCKN('')).toBe(true);
    });

    it('0 ile başlayan TCKN geçersiz olmalıdır', () => {
        expect(validateTCKN('01234567890')).toBe(false);
    });

    it('11 basamaktan az veya çok olan TCKN geçersiz olmalıdır', () => {
        expect(validateTCKN('1234567890')).toBe(false);
        expect(validateTCKN('123456789012')).toBe(false);
    });

    it('sayısal olmayan karakter içeren TCKN geçersiz olmalıdır', () => {
        expect(validateTCKN('12345a78901')).toBe(false);
        expect(validateTCKN('12345-78901')).toBe(false);
    });

    it('matematiksel algoritmayı (10. ve 11. basamak kuralı) sağlayan geçerli TCKN doğrulanmalıdır', () => {
        // Algoritmaya uyan sentetik geçerli TCKN örneği
        // Örnek: 10000000146
        // digits: 1,0,0,0,0, 0,0,0,1, 4, 6
        // sumOdd = 1 + 0 + 0 + 0 + 1 = 2
        // sumEven = 0 + 0 + 0 + 0 = 0
        // tenth = (2 * 7 - 0) % 10 = 14 % 10 = 4. digits[9] == 4 (doğru)
        // eleventh = (2 + 0 + 4) % 10 = 6. digits[10] == 6 (doğru)
        expect(validateTCKN('10000000146')).toBe(true);
    });

    it('matematiksel algoritmayı sağlamayan 11 basamaklı numara reddedilmelidir', () => {
        expect(validateTCKN('11111111111')).toBe(false);
        expect(validateTCKN('12345678901')).toBe(false);
    });
});
