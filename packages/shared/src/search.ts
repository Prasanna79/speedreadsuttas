import type { SearchIndexEntry } from './types';

const stripDiacritics = (value: string): string => value.normalize('NFD').replace(/\p{M}/gu, '');

const normalizeSearchText = (value: string): string => stripDiacritics(value).toLowerCase().trim();

export function searchIndex(query: string, index: SearchIndexEntry[]): SearchIndexEntry[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return [];
  }

  const exactUidMatch = index.find((entry) => entry.uid.toLowerCase() === normalizedQuery);
  if (exactUidMatch) {
    return [exactUidMatch];
  }

  const results: SearchIndexEntry[] = [];
  const seen = new Set<string>();

  const push = (entry: SearchIndexEntry): void => {
    if (seen.has(entry.uid)) {
      return;
    }
    seen.add(entry.uid);
    results.push(entry);
  };

  for (const entry of index) {
    if (entry.uid.toLowerCase().startsWith(normalizedQuery)) {
      push(entry);
      if (results.length === 8) {
        return results;
      }
    }
  }

  for (const entry of index) {
    const title = normalizeSearchText(entry.t);
    const paliTitle = normalizeSearchText(entry.p);
    const aliases = entry.a.map(normalizeSearchText);
    const matchesTitle = title.includes(normalizedQuery);
    const matchesPaliTitle = paliTitle.includes(normalizedQuery);
    const matchesAlias = aliases.some((alias) => alias.includes(normalizedQuery));

    if (matchesTitle || matchesPaliTitle || matchesAlias) {
      push(entry);
      if (results.length === 8) {
        break;
      }
    }
  }

  return results;
}
