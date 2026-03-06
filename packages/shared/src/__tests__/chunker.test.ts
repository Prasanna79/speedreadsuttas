import { describe, expect, it } from 'vitest';

import { buildChunks } from '../chunker';
import type { Token } from '../types';

const token = (
  word: string,
  index: number,
  isParagraphStart = false,
  trailingPunctuation = '',
): Token => ({
  word,
  index,
  segmentId: 'mn1:1.1',
  isParagraphStart,
  trailingPunctuation,
});

describe('buildChunks', () => {
  it('returns empty for empty tokens or invalid chunk size', () => {
    expect(buildChunks([], { chunkSize: 1, fontSize: 'normal' })).toEqual([]);
    expect(buildChunks([token('a', 0)], { chunkSize: 0, fontSize: 'normal' })).toEqual([]);
  });

  it('treats chunk size as a max with trailing partial chunk', () => {
    const tokens = [token('a', 0), token('b', 1), token('c', 2), token('d', 3), token('e', 4)];

    expect(
      buildChunks(tokens, { chunkSize: 1, fontSize: 'normal' }).map((chunk) =>
        chunk.map((item) => item.word),
      ),
    ).toEqual([
      ['a'],
      ['b'],
      ['c'],
      ['d'],
      ['e'],
    ]);
    expect(
      buildChunks(tokens, { chunkSize: 2, fontSize: 'normal' }).map((chunk) =>
        chunk.map((item) => item.word),
      ),
    ).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
    expect(
      buildChunks(tokens, { chunkSize: 3, fontSize: 'normal' }).map((chunk) =>
        chunk.map((item) => item.word),
      ),
    ).toEqual([['a', 'b', 'c'], ['d', 'e']]);
  });

  it('never crosses paragraph boundaries', () => {
    const tokens = [token('a', 0), token('b', 1), token('c', 2, true), token('d', 3), token('e', 4)];

    expect(
      buildChunks(tokens, { chunkSize: 3, fontSize: 'normal' }).map((chunk) =>
        chunk.map((item) => item.word),
      ),
    ).toEqual([
      ['a', 'b'],
      ['c', 'd', 'e'],
    ]);
  });

  it('handles a single token', () => {
    expect(buildChunks([token('only', 0, true)], { chunkSize: 4, fontSize: 'normal' })).toEqual([
      [token('only', 0, true)],
    ]);
  });

  it('closes immediately on sentence-final punctuation', () => {
    const tokens = [
      token('I', 0),
      token('have', 1),
      token('heard', 2, false, '.'),
      token('Thus', 3),
      token('again', 4),
    ];

    expect(
      buildChunks(tokens, { chunkSize: 4, fontSize: 'normal' }).map((chunk) =>
        chunk.map((item) => item.word + item.trailingPunctuation),
      ),
    ).toEqual([['I', 'have', 'heard.'], ['Thus', 'again']]);
  });

  it('closes at clause punctuation after two or more words', () => {
    const tokens = [
      token('This', 0),
      token('teaching', 1, false, ','),
      token('monks', 2, false, ','),
      token('listen', 3),
      token('carefully', 4, false, '.'),
    ];

    expect(
      buildChunks(tokens, { chunkSize: 4, fontSize: 'normal' }).map((chunk) =>
        chunk.map((item) => item.word + item.trailingPunctuation),
      ),
    ).toEqual([['This', 'teaching,'], ['monks,', 'listen'], ['carefully.']]);
  });

  it('does not clause-split a single-word chunk', () => {
    const tokens = [token('Monks', 0, false, ','), token('hear', 1), token('now', 2, false, '.')];

    expect(
      buildChunks(tokens, { chunkSize: 4, fontSize: 'normal' }).map((chunk) =>
        chunk.map((item) => item.word + item.trailingPunctuation),
      ),
    ).toEqual([['Monks,', 'hear', 'now.']]);
  });

  it('uses character budget to shorten chunks at larger font sizes', () => {
    const tokens = [
      token('dependent', 0),
      token('origination', 1),
      token('is', 2),
      token('deep', 3),
    ];

    expect(
      buildChunks(tokens, { chunkSize: 4, fontSize: 'normal' }).map((chunk) =>
        chunk.map((item) => item.word),
      ),
    ).toEqual([['dependent', 'origination'], ['is', 'deep']]);
    expect(
      buildChunks(tokens, { chunkSize: 4, fontSize: 'xlarge' }).map((chunk) =>
        chunk.map((item) => item.word),
      ),
    ).toEqual([['dependent'], ['origination', 'is'], ['deep']]);
  });

  it('allows a long first token to exceed the budget as a single-token chunk', () => {
    const tokens = [token('supercalifragilisticexpialidocious', 0), token('ends', 1)];

    expect(
      buildChunks(tokens, { chunkSize: 4, fontSize: 'xlarge' }).map((chunk) =>
        chunk.map((item) => item.word),
      ),
    ).toEqual([['supercalifragilisticexpialidocious'], ['ends']]);
  });

  it('treats sentence punctuation with closing quote as sentence-final', () => {
    const tokens = [token('said', 0, false, '.”'), token('afterwards', 1)];

    expect(
      buildChunks(tokens, { chunkSize: 4, fontSize: 'normal' }).map((chunk) =>
        chunk.map((item) => item.word + item.trailingPunctuation),
      ),
    ).toEqual([['said.”'], ['afterwards']]);
  });
});
