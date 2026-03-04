import { NIKAYA_ALIASES } from './constants';

export interface NormalizedInput {
  uid: string | null;
  searchQuery: string | null;
}

export interface ParsedUid {
  collection: string;
  nikaya: string;
  subdir: string | null;
}

const COLLECTION_PATTERN = /^(dn|mn|sn|an|kp|dhp|ud|iti|snp|thag|thig)(\d+(?:[.-]\d+(?:-\d+)?)?)$/i;
const SC_URL_PATTERN = /suttacentral\.net\/((?:dn|mn|sn|an|kp|dhp|ud|iti|snp|thag|thig)\d+(?:[.-]\d+(?:-\d+)?)?)/i;
const KN_COLLECTIONS = new Set(['kp', 'dhp', 'ud', 'iti', 'snp', 'thag', 'thig']);

const stripDiacritics = (value: string): string => value.normalize('NFD').replace(/\p{M}/gu, '');

const normalizeAliasText = (value: string): string =>
  stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function normalizeInput(input: string): NormalizedInput {
  const trimmed = input.trim();
  if (!trimmed) {
    return { uid: null, searchQuery: null };
  }

  const urlMatch = trimmed.match(SC_URL_PATTERN);
  if (urlMatch) {
    return {
      uid: urlMatch[1].toLowerCase(),
      searchQuery: null,
    };
  }

  const normalizedDirect = trimmed.toLowerCase().replace(/\s+/g, '');
  const directMatch = normalizedDirect.match(COLLECTION_PATTERN);
  if (directMatch) {
    return {
      uid: `${directMatch[1].toLowerCase()}${directMatch[2]}`,
      searchQuery: null,
    };
  }

  const normalizedAliasInput = normalizeAliasText(trimmed);
  for (const [alias, prefix] of NIKAYA_ALIASES.entries()) {
    const normalizedAlias = normalizeAliasText(alias);
    const aliasPattern = new RegExp(`^${normalizedAlias}\\s+(\\d+(?:[.-]\\d+(?:-\\d+)?)?)$`);
    const aliasMatch = normalizedAliasInput.match(aliasPattern);
    if (aliasMatch) {
      return {
        uid: `${prefix}${aliasMatch[1]}`,
        searchQuery: null,
      };
    }
  }

  return { uid: null, searchQuery: trimmed };
}

export function parseUid(uid: string): ParsedUid {
  const normalizedUid = uid.trim().toLowerCase();
  const match = normalizedUid.match(COLLECTION_PATTERN);
  if (!match) {
    throw new Error(`Invalid UID: ${uid}`);
  }

  const collection = match[1];
  const numericPart = match[2];
  const nikaya = KN_COLLECTIONS.has(collection) ? 'kn' : collection;

  if (collection === 'sn' || collection === 'an') {
    const chapter = numericPart.split(/[.-]/)[0];
    return {
      collection,
      nikaya,
      subdir: `${collection}${chapter}`,
    };
  }

  if (KN_COLLECTIONS.has(collection)) {
    return {
      collection,
      nikaya,
      subdir: collection,
    };
  }

  return {
    collection,
    nikaya,
    subdir: null,
  };
}

export function buildTextPath(uid: string, lang: string, author: string): string {
  const { nikaya, subdir } = parseUid(uid);
  const needsSubdir = nikaya === 'sn' || nikaya === 'an' || nikaya === 'kn';
  const subdirPart = needsSubdir && subdir ? `${subdir}/` : '';

  if (lang === 'pli' && author === 'ms') {
    return `root/pli/ms/sutta/${nikaya}/${subdirPart}${uid}_root-pli-ms.json`;
  }

  return `translation/${lang}/${author}/sutta/${nikaya}/${subdirPart}${uid}_translation-${lang}-${author}.json`;
}

export function buildAnRangeCandidates(uid: string): string[] {
  const normalizedUid = uid.trim().toLowerCase();
  const match = normalizedUid.match(/^an(\d+)\.(\d+)$/);
  if (!match) {
    return [];
  }

  const book = Number(match[1]);
  const suttaNumber = Number(match[2]);
  if (Number.isNaN(book) || Number.isNaN(suttaNumber) || suttaNumber < 1) {
    return [];
  }

  const makeRange = (size: number): string => {
    const start = Math.floor((suttaNumber - 1) / size) * size + 1;
    const end = start + size - 1;
    return `an${book}.${start}-${end}`;
  };

  const seen = new Set<string>([normalizedUid]);
  for (const size of [10, 20, 50, 100]) {
    seen.add(makeRange(size));
  }

  return [...seen];
}

const parseSegmentPart = (segmentId: string): number[] => {
  const suffix = segmentId.includes(':') ? segmentId.split(':').slice(1).join(':') : segmentId;
  return suffix
    .split('.')
    .map((part) => Number(part))
    .map((value) => (Number.isNaN(value) ? 0 : value));
};

export function compareSegmentIds(a: string, b: string): number {
  const aParts = parseSegmentPart(a);
  const bParts = parseSegmentPart(b);
  const maxParts = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < maxParts; index += 1) {
    const aValue = aParts[index] ?? 0;
    const bValue = bParts[index] ?? 0;
    if (aValue !== bValue) {
      return aValue - bValue;
    }
  }

  return a.localeCompare(b);
}
