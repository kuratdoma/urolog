import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300; // 5 minutes max for serverless
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8000';

    try {
        // Forward all headers except host
        const headers = new Headers();
        request.headers.forEach((value, key) => {
            if (key.toLowerCase() !== 'host') {
                headers.set(key, value);
            }
        });

        // Stream the request body directly to backend
        const body = await request.arrayBuffer();

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 270000); // 4.5 min timeout

        const backendResponse = await fetch(`${backendUrl}/api/v1/ai-scribe/analyze`, {
            method: 'POST',
            headers,
            body,
            signal: controller.signal,
        });

        clearTimeout(timeout);

        // Forward the backend response
        const responseBody = await backendResponse.text();
        return new NextResponse(responseBody, {
            status: backendResponse.status,
            headers: {
                'Content-Type': backendResponse.headers.get('Content-Type') || 'application/json',
            },
        });
    } catch (error: any) {
        if (error.name === 'AbortError') {
            return NextResponse.json(
                { detail: 'Analiz zaman aşımına uğradı. Lütfen daha kısa bir ses dosyası deneyin.' },
                { status: 504 }
            );
        }
        console.error('AI Scribe proxy error:', error);
        return NextResponse.json(
            { detail: 'Backend bağlantı hatası' },
            { status: 502 }
        );
    }
}
