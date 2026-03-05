import { BadRequestError, NotFoundError } from './lib/errors';
import { errorResponse, getAllowedOrigins, jsonResponse, preflightResponse } from './lib/http';
import { checkRateLimit } from './lib/rate-limit';
import type { Env } from './lib/data';
import { handleSearchIndex } from './routes/search';
import { handleSuttaMeta } from './routes/meta';
import { handleSuttaText } from './routes/text';

const CACHE_SUTTA = 'public, s-maxage=86400';
const CACHE_SEARCH = 'public, s-maxage=86400, stale-while-revalidate=604800';
const CACHE_HEALTH = 'no-store';

const SUTTA_META_PATTERN = /^\/api\/v1\/sutta\/([^/]+)$/u;
const SUTTA_TEXT_PATTERN = /^\/api\/v1\/sutta\/([^/]+)\/text\/([^/]+)\/([^/]+)$/u;

const decodePathValue = (raw: string): string => {
  try {
    return decodeURIComponent(raw);
  } catch {
    throw new BadRequestError('Malformed path parameter');
  }
};

const extractIp = (request: Request): string => {
  const direct = request.headers.get('CF-Connecting-IP');
  if (direct) {
    return direct;
  }
  const forwarded = request.headers.get('X-Forwarded-For');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const allowedOrigins = getAllowedOrigins(env.ALLOWED_ORIGINS);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/v1/')) {
      return preflightResponse(origin, allowedOrigins);
    }

    if (!checkRateLimit(extractIp(request))) {
      return errorResponse('Rate limit exceeded', 429, origin, allowedOrigins);
    }

    if (request.method !== 'GET') {
      return errorResponse('Not found', 404, origin, allowedOrigins);
    }

    try {
      if (url.pathname === '/api/v1/healthz') {
        return jsonResponse({ ok: true, timestamp: Date.now() }, 200, CACHE_HEALTH, origin, allowedOrigins);
      }

      if (url.pathname === '/api/v1/search/index') {
        const payload = await handleSearchIndex();
        return jsonResponse(payload, 200, CACHE_SEARCH, origin, allowedOrigins);
      }

      const metaMatch = url.pathname.match(SUTTA_META_PATTERN);
      if (metaMatch) {
        const uid = decodePathValue(metaMatch[1]);
        const payload = await handleSuttaMeta(uid);
        return jsonResponse(payload, 200, CACHE_SUTTA, origin, allowedOrigins);
      }

      const textMatch = url.pathname.match(SUTTA_TEXT_PATTERN);
      if (textMatch) {
        const uid = decodePathValue(textMatch[1]);
        const lang = decodePathValue(textMatch[2]);
        const author = decodePathValue(textMatch[3]);
        const payload = await handleSuttaText(env, uid, lang, author);
        return jsonResponse(payload, 200, CACHE_SUTTA, origin, allowedOrigins);
      }

      return errorResponse('Not found', 404, origin, allowedOrigins);
    } catch (error) {
      if (error instanceof BadRequestError) {
        return errorResponse(error.message, 400, origin, allowedOrigins);
      }
      if (error instanceof NotFoundError) {
        return errorResponse(error.message, 404, origin, allowedOrigins);
      }
      return errorResponse('Internal server error', 500, origin, allowedOrigins);
    }
  },
};
