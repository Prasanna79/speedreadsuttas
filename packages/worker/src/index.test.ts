import { describe, expect, it, beforeEach } from 'vitest';

import { buildTextPath } from '@palispeedread/shared';

import worker from './index';
import type { Env } from './lib/data';
import { resetRateLimitState } from './lib/rate-limit';

interface MockR2Object {
  text: () => Promise<string>;
}

function createMockBucket(records: Record<string, Record<string, string> | string>): R2Bucket {
  return {
    async get(key: string): Promise<MockR2Object | null> {
      const value = records[key];
      if (!value) {
        return null;
      }
      return {
        text: async () => (typeof value === 'string' ? value : JSON.stringify(value)),
      };
    },
  } as unknown as R2Bucket;
}

function createEnv(
  records: Record<string, Record<string, string> | string>,
  partial: Partial<Env> = {},
): Env {
  return {
    SUTTA_TEXT: createMockBucket(records),
    ALLOWED_ORIGINS: 'http://localhost:5173,https://reader.example.com',
    ...partial,
  };
}

describe('worker api', () => {
  beforeEach(() => {
    resetRateLimitState();
  });

  it('returns sutta metadata response', async () => {
    const env = createEnv({});
    const request = new Request('https://example.com/api/v1/sutta/mn1', {
      headers: {
        Origin: 'http://localhost:5173',
      },
    });

    const response = await worker.fetch(request, env);
    const payload = (await response.json()) as { uid: string; translations: unknown[] };

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=86400');
    expect(payload.uid).toBe('mn1');
    expect(payload.translations.length).toBeGreaterThan(0);
  });

  it('returns search index with stale-while-revalidate cache header', async () => {
    const env = createEnv({});
    const request = new Request('https://example.com/api/v1/search/index');

    const response = await worker.fetch(request, env);
    const payload = (await response.json()) as Array<{ uid: string }>;

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('stale-while-revalidate=604800');
    expect(payload.length).toBeGreaterThan(0);
    expect(payload.some((entry) => entry.uid === 'mn1')).toBe(true);
  });

  it('returns health response for readiness checks', async () => {
    const env = createEnv({});
    const response = await worker.fetch(new Request('https://example.com/api/v1/healthz'), env);
    const payload = (await response.json()) as { ok: boolean; timestamp: number };

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(payload.ok).toBe(true);
    expect(typeof payload.timestamp).toBe('number');
  });

  it('returns sorted text segments for a direct text file', async () => {
    const key = buildTextPath('mn1', 'en', 'sujato');
    const env = createEnv({
      [key]: {
        'mn1:10.1': 'later',
        'mn1:2.2': 'second',
        'mn1:2.1': 'first',
      },
    });

    const request = new Request('https://example.com/api/v1/sutta/mn1/text/en/sujato');
    const response = await worker.fetch(request, env);
    const payload = (await response.json()) as { segments: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(payload.segments.map((segment) => segment.id)).toEqual(['mn1:2.1', 'mn1:2.2', 'mn1:10.1']);
  });

  it('resolves AN range fallback when direct file is missing', async () => {
    const rangeKey = buildTextPath('an1.1-10', 'en', 'sujato');
    const env = createEnv({
      [rangeKey]: {
        'an1.2:1.1': 'ignored',
        'an1.3:1.2': 'second segment',
        'an1.3:1.1': 'first segment',
      },
    });

    const request = new Request('https://example.com/api/v1/sutta/an1.3/text/en/sujato');
    const response = await worker.fetch(request, env);
    const payload = (await response.json()) as { uid: string; segments: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(payload.uid).toBe('an1.3');
    expect(payload.segments.map((segment) => segment.id)).toEqual(['an1.3:1.1', 'an1.3:1.2']);
  });

  it('returns 404 json error for unknown uid', async () => {
    const env = createEnv({});
    const request = new Request('https://example.com/api/v1/sutta/unknown');

    const response = await worker.fetch(request, env);
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(payload.error).toBe('Sutta not found');
  });

  it('returns 404 for unsupported uid formats in text route', async () => {
    const env = createEnv({});
    const request = new Request('https://example.com/api/v1/sutta/kn1.1/text/pli/ms');

    const response = await worker.fetch(request, env);
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(payload.error).toBe('Sutta text not found');
  });

  it('returns 400 for malformed path values', async () => {
    const env = createEnv({});
    const request = new Request('https://example.com/api/v1/sutta/%E0%A4%A');

    const response = await worker.fetch(request, env);
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toContain('Malformed path parameter');
  });

  it('returns 500 for invalid upstream json', async () => {
    const key = buildTextPath('mn1', 'en', 'sujato');
    const env = createEnv({
      [key]: '{bad-json',
    });

    const request = new Request('https://example.com/api/v1/sutta/mn1/text/en/sujato');
    const response = await worker.fetch(request, env);

    expect(response.status).toBe(500);
  });

  it('applies rate limiting at 120 requests/min per ip', async () => {
    const env = createEnv({});
    const makeRequest = () =>
      new Request('https://example.com/api/v1/search/index', {
        headers: {
          'CF-Connecting-IP': '203.0.113.1',
        },
      });

    for (let i = 0; i < 120; i += 1) {
      const response = await worker.fetch(makeRequest(), env);
      expect(response.status).toBe(200);
    }

    const blocked = await worker.fetch(makeRequest(), env);
    const payload = (await blocked.json()) as { error: string };

    expect(blocked.status).toBe(429);
    expect(payload.error).toBe('Rate limit exceeded');
  });

  it('supports CORS preflight requests', async () => {
    const env = createEnv({});
    const request = new Request('https://example.com/api/v1/sutta/mn1', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://reader.example.com',
      },
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://reader.example.com');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });
});
