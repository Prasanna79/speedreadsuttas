import { describe, expect, it } from 'vitest';

import { calculateChunkDelay, getOrpIndex } from '../timing';
import type { Token } from '../types';

const token = (word: string, trailingPunctuation = ''): Token => ({
  word,
  index: 0,
  segmentId: 'mn1:1.1',
  isParagraphStart: false,
  trailingPunctuation,
});

describe('getOrpIndex', () => {
  it('returns mapped index for word lengths 1 to 20', () => {
    const expected = [0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4];
    for (let length = 1; length <= 20; length += 1) {
      expect(getOrpIndex(length)).toBe(expected[length - 1]);
    }
  });

  it('handles lower and upper bounds', () => {
    expect(getOrpIndex(0)).toBe(0);
    expect(getOrpIndex(999)).toBe(4);
  });
});

describe('calculateChunkDelay', () => {
  it('returns zero for empty chunk', () => {
    expect(calculateChunkDelay([], 250, false)).toBe(0);
  });

  it('applies sentence, ellipsis, clause, and close bracket multipliers', () => {
    expect(calculateChunkDelay([token('word', '.')], 100, false)).toBeCloseTo(1500, 5);
    expect(calculateChunkDelay([token('word', '…')], 250, false)).toBeCloseTo(720, 5);
    expect(calculateChunkDelay([token('word', ',')], 300, false)).toBeCloseTo(300, 5);
    expect(calculateChunkDelay([token('word', ')')], 800, false)).toBeCloseTo(97.5, 5);
  });

  it('applies no punctuation multiplier for unknown punctuation', () => {
    expect(calculateChunkDelay([token('word', '~')], 250, false)).toBeCloseTo(240, 5);
  });

  it('adds long-word bonus and paragraph pause', () => {
    expect(calculateChunkDelay([token('abcdefghij')], 250, true)).toBeCloseTo(1008, 5);
  });

  it('combines multi-word chunk timing effects', () => {
    const chunk = [token('longwordhere'), token('short', '!')];
    expect(calculateChunkDelay(chunk, 300, true)).toBeCloseTo(1380, 5);
  });

  it('clamps invalid or out-of-range wpm values', () => {
    expect(calculateChunkDelay([token('word')], 50, false)).toBeCloseTo(600, 5);
    expect(calculateChunkDelay([token('word')], 1000, false)).toBeCloseTo(75, 5);
    expect(calculateChunkDelay([token('word')], Number.NaN, false)).toBeCloseTo(240, 5);
  });
});
