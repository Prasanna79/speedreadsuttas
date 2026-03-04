const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;

const state = new Map<string, { windowStart: number; count: number }>();

export function checkRateLimit(ip: string, now = Date.now()): boolean {
  const key = ip || 'unknown';
  const current = state.get(key);

  if (!current || now - current.windowStart >= WINDOW_MS) {
    state.set(key, { windowStart: now, count: 1 });
    return true;
  }

  if (current.count >= MAX_REQUESTS) {
    return false;
  }

  state.set(key, {
    windowStart: current.windowStart,
    count: current.count + 1,
  });

  return true;
}

export function resetRateLimitState(): void {
  state.clear();
}
