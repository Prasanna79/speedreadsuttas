import { describe, expect, it } from 'vitest';

import {
  buildAnRangeCandidates,
  buildTextPath,
  compareSegmentIds,
  normalizeInput,
  parseUid,
} from '../uid';

describe('normalizeInput', () => {
  it('normalizes uid-like inputs and urls', () => {
    expect(normalizeInput('MN 1')).toEqual({ uid: 'mn1', searchQuery: null });
    expect(normalizeInput('sn12.2')).toEqual({ uid: 'sn12.2', searchQuery: null });
    expect(normalizeInput('Majjhima Nikaya 1')).toEqual({ uid: 'mn1', searchQuery: null });
    expect(normalizeInput('majjhima nikāya 1')).toEqual({ uid: 'mn1', searchQuery: null });
    expect(normalizeInput('Dīgha 15')).toEqual({ uid: 'dn15', searchQuery: null });
    expect(normalizeInput('https://suttacentral.net/mn1/en/sujato')).toEqual({
      uid: 'mn1',
      searchQuery: null,
    });
  });

  it('returns search query or nulls for non-uid input', () => {
    expect(normalizeInput('root of all things')).toEqual({
      uid: null,
      searchQuery: 'root of all things',
    });
    expect(normalizeInput('')).toEqual({ uid: null, searchQuery: null });
    expect(normalizeInput('   ')).toEqual({ uid: null, searchQuery: null });
  });
});

describe('parseUid', () => {
  it('parses all required collection examples', () => {
    expect(parseUid('mn1')).toEqual({ collection: 'mn', nikaya: 'mn', subdir: null });
    expect(parseUid('sn12.2')).toEqual({ collection: 'sn', nikaya: 'sn', subdir: 'sn12' });
    expect(parseUid('an4.159')).toEqual({ collection: 'an', nikaya: 'an', subdir: 'an4' });
    expect(parseUid('dhp1-20')).toEqual({ collection: 'dhp', nikaya: 'kn', subdir: 'dhp' });
    expect(parseUid('ud1.1')).toEqual({ collection: 'ud', nikaya: 'kn', subdir: 'ud' });
    expect(parseUid('thag1.1')).toEqual({ collection: 'thag', nikaya: 'kn', subdir: 'thag' });
  });

  it('throws for invalid uids', () => {
    expect(() => parseUid('foo')).toThrow('Invalid UID');
  });
});

describe('buildTextPath', () => {
  it('builds expected root and translation paths', () => {
    expect(buildTextPath('mn1', 'en', 'sujato')).toBe(
      'translation/en/sujato/sutta/mn/mn1_translation-en-sujato.json',
    );
    expect(buildTextPath('mn1', 'pli', 'ms')).toBe('root/pli/ms/sutta/mn/mn1_root-pli-ms.json');
    expect(buildTextPath('sn12.2', 'en', 'sujato')).toBe(
      'translation/en/sujato/sutta/sn/sn12/sn12.2_translation-en-sujato.json',
    );
    expect(buildTextPath('dhp1-20', 'pli', 'ms')).toBe(
      'root/pli/ms/sutta/kn/dhp/dhp1-20_root-pli-ms.json',
    );
  });
});

describe('buildAnRangeCandidates', () => {
  it('builds candidate range uids for an split files', () => {
    expect(buildAnRangeCandidates('an1.3')).toEqual([
      'an1.3',
      'an1.1-10',
      'an1.1-20',
      'an1.1-50',
      'an1.1-100',
    ]);
  });

  it('returns empty list for invalid/non-an uids', () => {
    expect(buildAnRangeCandidates('mn1')).toEqual([]);
    expect(buildAnRangeCandidates('an1.0')).toEqual([]);
  });
});

describe('compareSegmentIds', () => {
  it('sorts segment ids numerically and handles fallback ids', () => {
    const ids = ['mn1:10.1', 'mn1:2.1', 'mn1:2.10', 'mn1:2.2', 'unknown'];
    expect(ids.sort(compareSegmentIds)).toEqual([
      'unknown',
      'mn1:2.1',
      'mn1:2.2',
      'mn1:2.10',
      'mn1:10.1',
    ]);
  });

  it('returns zero for identical ids', () => {
    expect(compareSegmentIds('mn1:1.1', 'mn1:1.1')).toBe(0);
  });

  it('handles ids with different numeric part lengths', () => {
    expect(compareSegmentIds('mn1:1', 'mn1:1.1')).toBeLessThan(0);
    expect(compareSegmentIds('mn1:1.1', 'mn1:1')).toBeGreaterThan(0);
  });
});
