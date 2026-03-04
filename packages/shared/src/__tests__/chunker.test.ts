import { describe, expect, it } from 'vitest';

import { buildChunks } from '../chunker';
import type { Token } from '../types';

const token = (word: string, index: number, isParagraphStart = false): Token => ({
  word,
  index,
  segmentId: 'mn1:1.1',
  isParagraphStart,
  trailingPunctuation: '',
});

describe('buildChunks', () => {
  it('returns empty for empty tokens or invalid chunk size', () => {
    expect(buildChunks([], 1)).toEqual([]);
    expect(buildChunks([token('a', 0)], 0)).toEqual([]);
  });

  it('chunks size 1 through 4 with trailing partial chunk', () => {
    const tokens = [token('a', 0), token('b', 1), token('c', 2), token('d', 3), token('e', 4)];

    expect(buildChunks(tokens, 1).map((chunk) => chunk.map((item) => item.word))).toEqual([
      ['a'],
      ['b'],
      ['c'],
      ['d'],
      ['e'],
    ]);
    expect(buildChunks(tokens, 2).map((chunk) => chunk.map((item) => item.word))).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      ['e'],
    ]);
    expect(buildChunks(tokens, 3).map((chunk) => chunk.map((item) => item.word))).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e'],
    ]);
    expect(buildChunks(tokens, 4).map((chunk) => chunk.map((item) => item.word))).toEqual([
      ['a', 'b', 'c', 'd'],
      ['e'],
    ]);
  });

  it('never crosses paragraph boundaries', () => {
    const tokens = [token('a', 0), token('b', 1), token('c', 2, true), token('d', 3), token('e', 4)];

    expect(buildChunks(tokens, 3).map((chunk) => chunk.map((item) => item.word))).toEqual([
      ['a', 'b'],
      ['c', 'd', 'e'],
    ]);
  });

  it('handles a single token', () => {
    expect(buildChunks([token('only', 0, true)], 4)).toEqual([[token('only', 0, true)]]);
  });
});
