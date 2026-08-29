import type { NextConfig } from "next";
import { execSync } from "child_process";

let gitSha = process.env.NEXT_PUBLIC_GIT_SHA || "";

if (!gitSha) {
  try {
    gitSha = execSync("git rev-parse --short HEAD").toString().trim();
  } catch (e) {
    gitSha = "dev";
  }
}

const nextConfig: any = {
  env: {
    NEXT_PUBLIC_GIT_SHA: gitSha,
  },
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "localhost:3001", ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [])],
      bodySizeLimit: '50mb'
    }
  },
  // For Next.js 16 compatibility with dev server origins
  allowedDevOrigins: [
    "localhost:3000",
    "http://localhost:3000",
    "localhost:3001",
    "http://localhost:3001",
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : []),
  ],

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.ALLOWED_ORIGIN_HEADER ?? "http://localhost:3000" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "Authorization,Content-Type,Accept,X-Requested-With" },
        ]
      },
      {
        // SEC: temel tıklama-hırsızlığı (clickjacking) ve MIME-sniffing
        // korumaları. Content-Security-Policy kasıtlı olarak eklenmedi —
        // uygulamanın 65+ route'u (PDF üretimi, inline stil, görsel
        // yükleme) canlı tarayıcıda tek tek test edilmeden eklenirse
        // sayfaları kırma riski taşır; ayrı bir doğrulama gerektirir.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ]
      }
    ]
  },

  rewrites: async () => {
    // In Docker, the backend is accessible at http://backend:8000
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8000';
    console.log('Next.js Runtime Rewrites: Using backendUrl =', backendUrl);
    return {
      // ai-scribe/analyze has its own API route handler with extended timeout
      beforeFiles: [],
      afterFiles: [
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
        {
          source: '/static/:path*',
          destination: `${backendUrl}/static/:path*`,
        },
      ],
      fallback: [],
    };
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
