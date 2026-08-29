import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300; // 5 minutes max
export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ patientId: string }> }
) {
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8000';
    const { patientId } = await params;

    try {
        // Forward all headers except host
        const headers = new Headers();
        request.headers.forEach((value, key) => {
            if (key.toLowerCase() !== 'host') {
                headers.set(key, value);
            }
        });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 270000); // 4.5 minutes

        const searchParams = request.nextUrl.searchParams.toString();
        const queryString = searchParams ? `?${searchParams}` : '';

        const backendResponse = await fetch(`${backendUrl}/api/v1/ai/hpv-briefing/${patientId}${queryString}`, {
            method: 'GET',
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeout);

        const responseBody = await backendResponse.text();
        return new NextResponse(responseBody, {
            status: backendResponse.status,
            headers: {
                'Content-Type': backendResponse.headers.get('Content-Type') || 'application/json',
            },
        });
    } catch (error) {
        const err = error as { name?: string };
        if (err.name === 'AbortError') {
            return NextResponse.json(
                { detail: 'AI Analizi zaman aşımına uğradı. Lütfen daha sonra tekrar deneyin.' },
                { status: 504 }
            );
        }
        console.error('HPV Briefing proxy error:', error);
        return NextResponse.json(
            { detail: 'Backend bağlantı hatası veya zaman aşımı' },
            { status: 502 }
        );
    }
}
