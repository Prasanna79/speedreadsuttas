const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173'];

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};

export function getAllowedOrigins(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set(DEFAULT_ALLOWED_ORIGINS);
  }

  return new Set(
    raw
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function applyCorsHeaders(headers: Headers, origin: string | null, allowedOrigins: Set<string>): void {
  headers.set('Vary', 'Origin');
  if (origin && allowedOrigins.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
}

export function jsonResponse(
  payload: unknown,
  status: number,
  cacheControl: string,
  origin: string | null,
  allowedOrigins: Set<string>,
): Response {
  const headers = new Headers(SECURITY_HEADERS);
  headers.set('Cache-Control', cacheControl);
  applyCorsHeaders(headers, origin, allowedOrigins);

  return new Response(JSON.stringify(payload), {
    status,
    headers,
  });
}

export function errorResponse(
  message: string,
  status: number,
  origin: string | null,
  allowedOrigins: Set<string>,
): Response {
  return jsonResponse({ error: message }, status, 'no-store', origin, allowedOrigins);
}

export function preflightResponse(origin: string | null, allowedOrigins: Set<string>): Response {
  const headers = new Headers();
  applyCorsHeaders(headers, origin, allowedOrigins);
  headers.set('Cache-Control', 'no-store');
  return new Response(null, { status: 204, headers });
}
