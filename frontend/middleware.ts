import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Generate a random nonce for this request
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  
  // Clone the request headers and inject the nonce so server components can access it
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  // Construct Content Security Policy
  const isDev = process.env.NODE_ENV === 'development'
  
  // Next.js Dev mode requires 'unsafe-eval' for Hot Module Replacement (HMR)
  // In production, we remove 'unsafe-eval' for strict security
  const scriptSrc = isDev 
    ? `'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'` 
    : `'self' 'unsafe-inline' 'wasm-unsafe-eval'`

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
    font-src 'self' data:;
    connect-src 'self' data: blob:;
    frame-src 'self' blob:;
    frame-ancestors 'self';
    worker-src 'self' blob:;
    object-src 'self' blob:;
  `.replace(/\s{2,}/g, ' ').trim()

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Apply the CSP to the response headers
  response.headers.set('Content-Security-Policy', cspHeader)
  
  return response
}

export const config = {
  // Apply middleware to all routes except API, static files, and Next.js internals
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
