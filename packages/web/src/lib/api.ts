import type { SearchIndexEntry, SuttaMeta } from '@palispeedread/shared';

export interface SuttaTextResponse {
  uid: string;
  lang: string;
  author: string;
  segments: Array<{ id: string; text: string }>;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function fetchJson<T>(pathname: string): Promise<T> {
  const response = await fetch(`${API_BASE}${pathname}`);
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: 'Request failed' }))) as {
      error?: string;
    };
    throw new Error(payload.error ?? 'Request failed');
  }
  return (await response.json()) as T;
}

export async function fetchSuttaMeta(uid: string): Promise<SuttaMeta> {
  return fetchJson<SuttaMeta>(`/api/v1/sutta/${encodeURIComponent(uid)}`);
}

export async function fetchSuttaText(
  uid: string,
  lang: string,
  author: string,
): Promise<SuttaTextResponse> {
  return fetchJson<SuttaTextResponse>(
    `/api/v1/sutta/${encodeURIComponent(uid)}/text/${encodeURIComponent(lang)}/${encodeURIComponent(author)}`,
  );
}

export async function fetchSearchIndex(): Promise<SearchIndexEntry[]> {
  return fetchJson<SearchIndexEntry[]>('/api/v1/search/index');
}
