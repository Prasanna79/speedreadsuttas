import { describe, expect, it } from 'vitest';

import { searchIndex } from '../search';
import type { SearchIndexEntry } from '../types';

const index: SearchIndexEntry[] = [
  { uid: 'mn1', c: 'mn', t: 'The Root of All Things', p: 'Mūlapariyāyasutta', a: ['mulapariyaya'] },
  { uid: 'mn2', c: 'mn', t: 'All the Taints', p: 'Sabbāsavasutta', a: ['sabbasava'] },
  { uid: 'mn3', c: 'mn', t: 'Heir in the Teaching', p: 'Dhammadāyādasutta', a: ['dhammadayada'] },
  { uid: 'mn4', c: 'mn', t: 'Fear and Dread', p: 'Bhayabheravasutta', a: ['bhayabherava'] },
  { uid: 'mn5', c: 'mn', t: 'Unblemished', p: 'Anaṅgaṇasutta', a: ['anangana'] },
  { uid: 'mn6', c: 'mn', t: 'Discourse on Desire', p: 'Ākaṅkheyyasutta', a: ['akankheyya'] },
  { uid: 'mn7', c: 'mn', t: 'The Simile of the Cloth', p: 'Vatthasutta', a: ['vattha'] },
  { uid: 'mn8', c: 'mn', t: 'Effacement', p: 'Sallekhasutta', a: ['sallekha'] },
  { uid: 'mn9', c: 'mn', t: 'Right View', p: 'Sammādiṭṭhisutta', a: ['sammaditthi'] },
  { uid: 'sn12.2', c: 'sn', t: 'Dependent Origination', p: 'Paṭiccasamuppāda', a: ['paticca'] },
];

describe('searchIndex', () => {
  it('returns exact uid match (case-insensitive)', () => {
    expect(searchIndex('MN1', index)).toEqual([index[0]]);
  });

  it('returns uid prefix matches capped at 8', () => {
    const results = searchIndex('mn', index);
    expect(results).toHaveLength(8);
    expect(results.map((entry) => entry.uid)).toEqual([
      'mn1',
      'mn2',
      'mn3',
      'mn4',
      'mn5',
      'mn6',
      'mn7',
      'mn8',
    ]);
  });

  it('matches english title, pali title diacritic-insensitively, and aliases', () => {
    expect(searchIndex('root of all', index).map((entry) => entry.uid)).toContain('mn1');
    expect(searchIndex('mulapariyaya', index).map((entry) => entry.uid)).toContain('mn1');
    expect(searchIndex('PATICCA', index).map((entry) => entry.uid)).toContain('sn12.2');
  });

  it('returns no matches for unknown query and empty query', () => {
    expect(searchIndex('not-a-sutta', index)).toEqual([]);
    expect(searchIndex('   ', index)).toEqual([]);
  });

  it('does not duplicate entries when multiple match paths apply', () => {
    const results = searchIndex('ab', [
      {
        uid: 'ab1',
        c: 'mn',
        t: 'About Abhidhamma',
        p: 'Abhi',
        a: ['ab'],
      },
    ]);
    expect(results).toEqual([
      {
        uid: 'ab1',
        c: 'mn',
        t: 'About Abhidhamma',
        p: 'Abhi',
        a: ['ab'],
      },
    ]);
  });

  it('caps non-prefix title search results to 8', () => {
    const largeIndex: SearchIndexEntry[] = Array.from({ length: 10 }).map((_, idx) => ({
      uid: `dn${idx + 1}`,
      c: 'dn',
      t: `Common Title ${idx + 1}`,
      p: `Pali ${idx + 1}`,
      a: [],
    }));
    expect(searchIndex('common', largeIndex)).toHaveLength(8);
  });
});
