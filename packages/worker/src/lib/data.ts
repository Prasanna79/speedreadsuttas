import path from 'node:path';

import {
  buildAnRangeCandidates,
  buildTextPath,
  compareSegmentIds,
  parseUid,
  type SearchIndexEntry,
  type SuttaMeta,
  type TranslationOption,
} from '@palispeedread/shared';

import searchIndexRaw from '../data/search-index.json';
import translationManifestRaw from '../data/translation-manifest.json';
import { NotFoundError } from './errors';

export interface Env {
  SUTTA_TEXT: R2Bucket;
  BILARA_DATA_DIR?: string;
  ALLOWED_ORIGINS?: string;
}

export interface Segment {
  id: string;
  text: string;
}

const searchIndex = searchIndexRaw as SearchIndexEntry[];
const translationManifest = translationManifestRaw as Record<string, TranslationOption[]>;
const searchIndexByUid = new Map(searchIndex.map((entry) => [entry.uid, entry]));

const toPosixPath = (value: string): string => value.split(path.sep).join('/');

function normalizeUid(uid: string): string {
  return uid.trim().toLowerCase();
}

async function readJsonFromR2(env: Env, key: string): Promise<Record<string, string> | null> {
  const object = await env.SUTTA_TEXT.get(key);
  if (!object) {
    return null;
  }

  const raw = await object.text();
  return JSON.parse(raw) as Record<string, string>;
}

async function readJsonFromLocal(env: Env, key: string): Promise<Record<string, string> | null> {
  if (!env.BILARA_DATA_DIR) {
    return null;
  }

  try {
    const fs = await import('node:fs/promises');
    const absolutePath = path.join(env.BILARA_DATA_DIR, key);
    const raw = await fs.readFile(absolutePath, 'utf8');
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
}

async function loadTextJson(env: Env, key: string): Promise<Record<string, string> | null> {
  const fromR2 = await readJsonFromR2(env, key);
  if (fromR2) {
    return fromR2;
  }

  return readJsonFromLocal(env, key);
}

function sortSegments(segments: Record<string, string>): Segment[] {
  return Object.entries(segments)
    .sort(([left], [right]) => compareSegmentIds(left, right))
    .map(([id, text]) => ({ id, text }));
}

export function getSearchIndex(): SearchIndexEntry[] {
  return searchIndex;
}

export function getSuttaMeta(uid: string): SuttaMeta {
  const normalizedUid = normalizeUid(uid);
  const translations = translationManifest[normalizedUid];

  if (!translations) {
    throw new NotFoundError('Sutta not found');
  }

  const entry = searchIndexByUid.get(normalizedUid);

  return {
    uid: normalizedUid,
    collection: entry?.c ?? parseUid(normalizedUid).collection,
    title: entry?.p ?? entry?.t ?? normalizedUid,
    translations,
  };
}

export async function getSuttaText(
  env: Env,
  uid: string,
  lang: string,
  author: string,
): Promise<{ uid: string; lang: string; author: string; segments: Segment[] }> {
  const normalizedUid = normalizeUid(uid);
  const normalizedLang = lang.trim().toLowerCase();
  const normalizedAuthor = author.trim().toLowerCase();

  const candidates = [normalizedUid, ...buildAnRangeCandidates(normalizedUid).slice(1)];

  for (const candidateUid of candidates) {
    const key = toPosixPath(buildTextPath(candidateUid, normalizedLang, normalizedAuthor));
    const textJson = await loadTextJson(env, key);
    if (!textJson) {
      continue;
    }

    const filtered =
      candidateUid === normalizedUid
        ? textJson
        : Object.fromEntries(
            Object.entries(textJson).filter(([segmentId]) => segmentId.startsWith(`${normalizedUid}:`)),
          );

    const segments = sortSegments(filtered);
    if (segments.length === 0) {
      continue;
    }

    return {
      uid: normalizedUid,
      lang: normalizedLang,
      author: normalizedAuthor,
      segments,
    };
  }

  throw new NotFoundError('Sutta text not found');
}
