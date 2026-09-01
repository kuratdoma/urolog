// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/mobile-print/examination/[id]/route';

/**
 * Android'e özel muayene PDF ucunun kapıları ve mutlu yolu.
 * Backend `fetch` ile taklit edilir; render GERÇEKTEN çalışır (font dosyadan yüklenir).
 */

const EXAM = {
    id: '42',
    hasta_id: '7',
    tarih: '2026-09-01T09:00:00',
    sikayet: 'Sık idrara çıkma',
    ipss_skor: '12',
    pollakiuri: '4',
    nokturi: '2',
    sistem_sorgu: '{"pollakiuri_text":"Var"}',
};
const PATIENT = { id: '7', ad: 'Ayşe', soyad: 'Yılmaz', tc_kimlik: '12345678901' };

function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

/** Varsayılan backend: her uç dolu yanıt verir. `overrides` ile tekil uç bozulur. */
function mockBackend(overrides: Record<string, Response> = {}) {
    return vi.fn(async (url: string | URL) => {
        const path = new URL(String(url)).pathname;
        if (overrides[path]) return overrides[path].clone();
        if (path === '/api/v1/clinical/muayeneler/42') return jsonResponse(EXAM);
        if (path === '/api/v1/patients/7') return jsonResponse(PATIENT);
        if (path === '/api/v1/settings') return jsonResponse([{ key: 'clinic_name', value: 'UroLOG' }]);
        if (path === '/api/v1/clinical/patients/7/labs') return jsonResponse([]);
        if (path === '/api/v1/clinical/patients/7/imagings') return jsonResponse([]);
        return jsonResponse({ detail: 'not found' }, 404);
    });
}

function request(headers: Record<string, string>) {
    return new NextRequest('http://localhost/mobile-print/examination/42', { headers });
}

const params = Promise.resolve({ id: '42' });
const ANDROID_HEADERS = { 'x-urodroid': '0.7.0', authorization: 'Bearer test-token' };

const originalFetch = globalThis.fetch;

beforeEach(() => {
    process.env.MOBILE_PDF_ENABLED = 'true';
    process.env.BACKEND_URL = 'http://backend-test:8000';
});

afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.MOBILE_PDF_ENABLED;
});

describe('mobil muayene PDF ucu — kapılar', () => {
    it('özellik kapalıyken 404 döner (403 değil: ucun varlığı duyurulmaz)', async () => {
        process.env.MOBILE_PDF_ENABLED = 'false';
        const res = await GET(request(ANDROID_HEADERS), { params });
        expect(res.status).toBe(404);
    });

    it('X-UroDroid başlığı yoksa 404 döner — web bu uca düşmez', async () => {
        const res = await GET(request({ authorization: 'Bearer test-token' }), { params });
        expect(res.status).toBe(404);
    });

    it('Bearer token yoksa 401 döner', async () => {
        const res = await GET(request({ 'x-urodroid': '0.7.0' }), { params });
        expect(res.status).toBe(401);
    });
});

describe('mobil muayene PDF ucu — backend hataları', () => {
    it('403 OLDUĞU GİBİ aktarılır (yetki kararı burada verilmez)', async () => {
        globalThis.fetch = mockBackend({
            '/api/v1/clinical/muayeneler/42': jsonResponse({ detail: 'yetkiniz yok' }, 403),
        }) as any;
        const res = await GET(request(ANDROID_HEADERS), { params });
        expect(res.status).toBe(403);
    });

    it('beklenmedik backend hatası 502 olur', async () => {
        globalThis.fetch = mockBackend({
            '/api/v1/clinical/muayeneler/42': jsonResponse({ detail: 'patladı' }, 500),
        }) as any;
        const res = await GET(request(ANDROID_HEADERS), { params });
        expect(res.status).toBe(502);
    });

    /** Lab/görüntüleme YARDIMCI kaynaktır: düşerse çıktı yine üretilmeli. */
    it('lab ucu düşse de PDF üretilir', async () => {
        globalThis.fetch = mockBackend({
            '/api/v1/clinical/patients/7/labs': jsonResponse({ detail: 'hata' }, 500),
        }) as any;
        const res = await GET(request(ANDROID_HEADERS), { params });
        expect(res.status).toBe(200);
    });
});

describe('mobil muayene PDF ucu — mutlu yol', () => {
    it('PDF üretir ve Türkçe dosya adını RFC 5987 ile gönderir', async () => {
        globalThis.fetch = mockBackend() as any;
        const res = await GET(request(ANDROID_HEADERS), { params });

        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('application/pdf');
        expect(res.headers.get('Cache-Control')).toContain('no-store');

        const disposition = res.headers.get('Content-Disposition') || '';
        expect(disposition).toContain("filename*=UTF-8''");
        expect(decodeURIComponent(disposition.split("filename*=UTF-8''")[1]))
            .toBe('AyşeYılmaz-2026-09-01-Muayene.pdf');

        const body = Buffer.from(await res.arrayBuffer());
        expect(body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
        expect(body.length).toBeGreaterThan(1000);
    }, 30000);
});
