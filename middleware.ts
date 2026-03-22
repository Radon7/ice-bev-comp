import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';

function getAllowedOrigin(requestOrigin: string | null): string {
  if (ALLOWED_ORIGINS === '*') return '*';

  const allowed = ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  if (requestOrigin && allowed.includes(requestOrigin)) {
    return requestOrigin;
  }
  return '';
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigin = getAllowedOrigin(origin);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'X-API-Key, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Add CORS headers to actual response
  const response = NextResponse.next();
  if (allowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    response.headers.set('Access-Control-Allow-Headers', 'X-API-Key, Content-Type');
  }

  return response;
}

export const config = {
  matcher: ['/api/prices', '/api/electricity-prices'],
};
