import { describe, it, expect } from 'vitest';
import { normalizeTurkish, normalizeTestName, canonicalizeTestName, formatLabDecimal } from './lab-utils';

describe('Laboratuvar Tetkik İsimleri & Değer Formatlama (lab-utils)', () => {
    it('Türkçe karakterleri ASCII eşleniklerine dönüştürmeli', () => {
        expect(normalizeTurkish('KREATİNİN')).toBe('KREATININ');
        expect(normalizeTurkish('şeker')).toBe('seker');
        expect(normalizeTurkish('ürik asit')).toBe('urik asit');
    });

    it('Farklı yazılışlardaki PSA varyantlarını kanonik PSA formatına dönüştürmeli', () => {
        expect(canonicalizeTestName('Total Prostat Spesifik Antijen')).toBe('PSA (Total)');
        expect(canonicalizeTestName('Serbest Prostat Spesifik Antijen')).toBe('PSA (Serbest)');
        expect(canonicalizeTestName('tpsa')).toBe('PSA (Total)');
        expect(canonicalizeTestName('fpsa')).toBe('PSA (Serbest)');
        expect(canonicalizeTestName('PSA Total')).toBe('PSA (Total)');
    });

    it('Testosteron, üre ve kreatinin varyantlarını kanonik formlarına dönüştürmeli', () => {
        expect(canonicalizeTestName('urea')).toBe('Üre');
        expect(canonicalizeTestName('creatinine')).toBe('Kreatinin');
        expect(canonicalizeTestName('serbest testosteron')).toBe('Testosteron (Serbest)');
        expect(canonicalizeTestName('total testosterone')).toBe('Testosteron (Total)');
    });

    it('Laboratuvar ondalık sayı formatlamasını doğru yapmalı (virgüllü ve 2 basamaklı)', () => {
        expect(formatLabDecimal(1.4)).toBe('1,40');
        expect(formatLabDecimal('2.5')).toBe('2,50');
        expect(formatLabDecimal('< 0.05')).toBe('< 0,05');
        expect(formatLabDecimal(null)).toBe('-');
        expect(formatLabDecimal('')).toBe('-');
    });
});
