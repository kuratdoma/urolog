import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { ExaminationPDF } from '@/components/pdf/ExaminationPDF';
import { registerPDFFonts } from '@/lib/pdf-fonts';
import {
    buildExaminationComputedData,
    buildExaminationPdfBaseName,
} from '@/lib/pdf/examination-print-data';

/**
 * Muayene formunu SUNUCUDA PDF'e basar — yalnızca Android istemcisi (UroDroid) için.
 *
 * NEDEN VAR: Web'de PDF tarayıcıda `@react-pdf/renderer` ile üretiliyor
 * (`app/print/examination/[id]/page.tsx`). Telefonda bunun için Next.js sayfasının ve
 * react-pdf paketinin cihaza inip orada render edilmesi gerekiyordu; 2 GB RAM'li hedef
 * cihazlarda kabul edilemez. Burada aynı `ExaminationPDF` bileşeni Node'da çalıştırılır,
 * telefona yalnızca ~200 KB PDF iner. Belge bileşeni ve türev veri hesabı web ile
 * ORTAKTIR (`lib/pdf/examination-print-data.ts`) — iki farklı rapor çıkma riski yok.
 *
 * YOL SEÇİMİ: `/api` ALTINDA DEĞİL. nginx'te `location /api` doğrudan backend'e
 * gidiyor (nginx/conf.d/*.conf), yani `/api/...` altındaki bir Next route handler'a
 * dışarıdan ULAŞILAMAZ. `/mobile-print/...` `location /` kuralına düşer → frontend.
 * Bu sayede nginx'e hiç dokunmadan devreye girer.
 *
 * YETKİ: Burada RBAC KARARI VERİLMEZ. Çağıranın kendi Bearer token'ı backend'e aynen
 * iletilir; veriyi backend'in kendi yetki kapıları verir ya da vermez (401/403 olduğu
 * gibi aktarılır). Yetki mantığının ikizlenmesi KVKK riski olurdu.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000';

/** Android istemcisinin gönderdiği başlık. Yoksa uç YOKMUŞ gibi davranır. */
const CLIENT_HEADER = 'x-urodroid';

/**
 * Render CPU-yoğun ve Node tek iş parçacıklı: eşzamanlı render event loop'u bloklar ve
 * aynı süreçteki web SSR istekleri bekler. Sınır aşılınca kuyruğa alınmaz, 503 döner —
 * telefonda 30 saniye bekleyen bir ilerleme çubuğu, "sonra tekrar deneyin"den kötüdür.
 */
const MAX_CONCURRENT = Number(process.env.MOBILE_PDF_MAX_CONCURRENCY || 2);
let inFlight = 0;

/** Backend yavaşsa telefon sonsuza kadar beklemesin. */
const BACKEND_TIMEOUT_MS = 15000;

function disabled(): boolean {
    return process.env.MOBILE_PDF_ENABLED !== 'true';
}

/** Kapalı/başlıksız durumda 403 değil 404: ucun varlığı duyurulmaz. */
function notFound() {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
}

interface BackendResult {
    ok: boolean;
    /** ok=false iken tanımsızdır. */
    data?: any;
    /** Başarıda 200; ağ hatası/zaman aşımında 504. */
    status: number;
}

async function backendGet(path: string, authorization: string): Promise<BackendResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
    try {
        const response = await fetch(`${BACKEND_URL}${path}`, {
            method: 'GET',
            headers: { Authorization: authorization, Accept: 'application/json' },
            signal: controller.signal,
            cache: 'no-store',
        });
        if (!response.ok) return { ok: false, status: response.status };
        return { ok: true, data: await response.json(), status: 200 };
    } catch {
        return { ok: false, status: 504 };
    } finally {
        clearTimeout(timer);
    }
}

/**
 * `all` (varsayılan) | `none` | virgüllü id listesi.
 * Web sayfasında seçim localStorage'dan da okunabiliyor; sunucuda böyle bir bağlam yok,
 * bu yüzden varsayılan sayfanın "kayıt yoksa hepsi" davranışıyla aynı: TÜMÜ.
 */
function filterBySelection(items: any[], param: string | null): any[] {
    if (!Array.isArray(items) || items.length === 0) return [];
    if (param === 'none') return [];
    if (!param || param === 'all' || param === 'storage' || param === 'custom') return items;
    const wanted = new Set(param.split(',').map((s) => s.trim()).filter(Boolean));
    return items.filter((item) => wanted.has(String(item?.id)));
}

/** Content-Disposition ASCII olmalı; Türkçe ad için RFC 5987 `filename*` eklenir. */
function contentDisposition(baseName: string): string {
    const fileName = `${baseName}.pdf`;
    const ascii = fileName
        .replace(/[İIı]/g, 'I')
        .replace(/[ŞşĞğÜüÖöÇç]/g, (c) => 'SsGgUuOoCc'['ŞşĞğÜüÖöÇç'.indexOf(c)])
        .replace(/[^\x20-\x7E]/g, '_')
        .replace(/["\\]/g, '_');
    return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    if (disabled()) return notFound();

    const clientVersion = request.headers.get(CLIENT_HEADER);
    if (!clientVersion) return notFound();

    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
        return NextResponse.json({ detail: 'Kimlik doğrulanamadı.' }, { status: 401 });
    }

    if (inFlight >= MAX_CONCURRENT) {
        return NextResponse.json(
            { detail: 'Sunucu şu anda başka bir çıktı üretiyor. Lütfen tekrar deneyin.' },
            { status: 503, headers: { 'Retry-After': '5' } },
        );
    }

    const { id } = await params;
    inFlight += 1;
    const startedAt = Date.now();

    try {
        const exam = await backendGet(`/api/v1/clinical/muayeneler/${id}`, authorization);
        if (!exam.ok) {
            // 401/403/404 olduğu gibi aktarılır; gerisi backend erişim sorunudur.
            const status = [401, 403, 404, 504].includes(exam.status) ? exam.status : 502;
            return NextResponse.json({ detail: 'Muayene alınamadı.' }, { status });
        }

        const patientId = exam.data?.hasta_id;
        if (!patientId) {
            return NextResponse.json({ detail: 'Muayene bir hastaya bağlı değil.' }, { status: 404 });
        }

        const [patient, settings, labs, imagings] = await Promise.all([
            backendGet(`/api/v1/patients/${patientId}`, authorization),
            backendGet('/api/v1/settings', authorization),
            backendGet(`/api/v1/clinical/patients/${patientId}/labs`, authorization),
            backendGet(`/api/v1/clinical/patients/${patientId}/imagings`, authorization),
        ]);

        if (!patient.ok) {
            const status = [401, 403, 404, 504].includes(patient.status) ? patient.status : 502;
            return NextResponse.json({ detail: 'Hasta bilgisi alınamadı.' }, { status });
        }

        // Ayarlar/lab/görüntüleme YARDIMCI kaynaklar: web sayfası da bunları
        // `.catch(() => [])` ile geçiyor. Biri düşerse çıktı üretilir, o bölüm boş kalır.
        const settingsList: any[] = settings.ok && Array.isArray(settings.data) ? settings.data : [];
        const settingsMap: Record<string, string> = settingsList.length > 0
            ? settingsList.reduce((acc: Record<string, string>, curr: any) => {
                acc[curr.key] = curr.value || '';
                return acc;
            }, {})
            : {};

        const searchParams = request.nextUrl.searchParams;
        const selectedLabs = filterBySelection(
            labs.ok && Array.isArray(labs.data) ? labs.data : [],
            searchParams.get('labs'),
        );
        const selectedImaging = filterBySelection(
            imagings.ok && Array.isArray(imagings.data) ? imagings.data : [],
            searchParams.get('imaging'),
        );

        registerPDFFonts();

        const buffer = await renderToBuffer(
            React.createElement(ExaminationPDF, {
                exam: exam.data,
                patient: patient.data,
                settings: settingsMap,
                computedData: buildExaminationComputedData(exam.data),
                selectedLabs,
                selectedImaging,
            }) as any,
        );

        // PHI: PDF diske YAZILMAZ, önbelleğe alınmaz. Kayıt satırında hasta adı/TC yok.
        console.log(
            `[mobile-print] examination=${id} client=${clientVersion} bytes=${buffer.length} ms=${Date.now() - startedAt}`,
        );

        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Length': String(buffer.length),
                'Content-Disposition': contentDisposition(
                    buildExaminationPdfBaseName(exam.data, patient.data),
                ),
                'Cache-Control': 'no-store, no-cache, must-revalidate, private',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (error: any) {
        console.error('[mobile-print] render failed', error);
        return NextResponse.json({ detail: 'PDF üretilemedi.', error: String(error?.message || error), stack: error?.stack }, { status: 500 });
    } finally {
        inFlight -= 1;
    }
}
