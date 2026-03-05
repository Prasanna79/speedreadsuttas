import { describe, expect, it } from 'vitest';

import { tokenize } from '../tokenizer';
import type { Segment } from '../types';

describe('tokenize', () => {
  it('sorts segments, tokenizes whitespace, and sets sequential indices', () => {
    const segments: Segment[] = [
      { id: 'mn1:2.1', text: 'third section' },
      { id: 'mn1:1.2', text: '  second   sentence  ' },
      { id: 'mn1:1.1', text: 'first sentence' },
    ];

    const tokens = tokenize(segments);
    expect(tokens.map((token) => token.word)).toEqual([
      'first',
      'sentence',
      'second',
      'sentence',
      'third',
      'section',
    ]);
    expect(tokens.map((token) => token.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(tokens[0]?.isParagraphStart).toBe(true);
    expect(tokens[2]?.isParagraphStart).toBe(false);
    expect(tokens[4]?.isParagraphStart).toBe(true);
  });

  it('extracts trailing punctuation for all supported marks', () => {
    const segments: Segment[] = [
      {
        id: 'mn1:1.1',
        text: "a. b, c; d! e? f… g— h– i\" j' k) l] m}",
      },
    ];

    const tokens = tokenize(segments);
    expect(tokens.map((token) => [token.word, token.trailingPunctuation])).toEqual([
      ['a', '.'],
      ['b', ','],
      ['c', ';'],
      ['d', '!'],
      ['e', '?'],
      ['f', '…'],
      ['g', '—'],
      ['h', '–'],
      ['i', '"'],
      ['j', "'"],
      ['k', ')'],
      ['l', ']'],
      ['m', '}'],
    ]);
  });

  it('preserves pali diacritics and skips empty segments', () => {
    const segments: Segment[] = [
      { id: 'mn1:1.1', text: 'Ānāpānasati ñāṇa ṭhāna' },
      { id: 'mn1:1.2', text: '    ' },
    ];

    const tokens = tokenize(segments);
    expect(tokens.map((token) => token.word)).toEqual(['Ānāpānasati', 'ñāṇa', 'ṭhāna']);
  });

  it('keeps punctuation-only tokens intact and handles non-standard segment ids', () => {
    const segments: Segment[] = [
      { id: 'mn1:1.1', text: 'alpha' },
      { id: 'mn1:x.y', text: 'beta' },
      { id: 'broken-id', text: '... !!!' },
    ];

    const tokens = tokenize(segments);
    expect(tokens[0]).toEqual({
      word: '...',
      index: 0,
      segmentId: 'broken-id',
      isParagraphStart: true,
      trailingPunctuation: '',
    });
    expect(tokens[1]?.word).toBe('!!!');
    expect(tokens[2]?.word).toBe('beta');
    expect(tokens[3]?.word).toBe('alpha');
  });

  it('splits inline em/en dash joins into separate tokens', () => {
    const segments: Segment[] = [{ id: 'mn19:1.1', text: 'awakening—I calm–mind' }];
    const tokens = tokenize(segments);

    expect(tokens.map((token) => [token.word, token.trailingPunctuation])).toEqual([
      ['awakening', '—'],
      ['I', ''],
      ['calm', '–'],
      ['mind', ''],
    ]);
  });
});
