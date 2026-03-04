import {
  LONG_WORD_BONUS,
  LONG_WORD_THRESHOLD,
  ORP_TABLE,
  PAUSE_CLAUSE,
  PAUSE_CLOSE_BRACKET,
  PAUSE_ELLIPSIS,
  PAUSE_PARAGRAPH,
  PAUSE_SENTENCE,
  WPM_DEFAULT,
  WPM_MAX,
  WPM_MIN,
} from './constants';
import type { Token } from './types';

const SENTENCE_PUNCTUATION = /[.!?]/u;
const CLAUSE_PUNCTUATION = /[,;:—–]/u;
const CLOSE_BRACKET_PUNCTUATION = /[)\]}'"”’]/u;

const clampWpm = (wpm: number): number => {
  if (!Number.isFinite(wpm)) {
    return WPM_DEFAULT;
  }
  if (wpm < WPM_MIN) {
    return WPM_MIN;
  }
  if (wpm > WPM_MAX) {
    return WPM_MAX;
  }
  return wpm;
};

const getPunctuationMultiplier = (punctuation: string): number => {
  if (!punctuation) {
    return 1;
  }
  if (punctuation.includes('…')) {
    return PAUSE_ELLIPSIS;
  }
  if (SENTENCE_PUNCTUATION.test(punctuation)) {
    return PAUSE_SENTENCE;
  }
  if (CLAUSE_PUNCTUATION.test(punctuation)) {
    return PAUSE_CLAUSE;
  }
  if (CLOSE_BRACKET_PUNCTUATION.test(punctuation)) {
    return PAUSE_CLOSE_BRACKET;
  }
  return 1;
};

export function getOrpIndex(wordLength: number): number {
  if (wordLength <= 0) {
    return ORP_TABLE[0];
  }
  if (wordLength >= ORP_TABLE.length) {
    return ORP_TABLE[ORP_TABLE.length - 1];
  }
  return ORP_TABLE[wordLength];
}

export function calculateChunkDelay(chunk: Token[], wpm: number, nextIsParagraphStart: boolean): number {
  if (!chunk.length) {
    return 0;
  }

  const safeWpm = clampWpm(wpm);
  const basePerWord = 60000 / safeWpm;
  let delay = basePerWord * chunk.length;

  const lastToken = chunk[chunk.length - 1];
  const punctuationMultiplier = getPunctuationMultiplier(lastToken.trailingPunctuation);
  delay += basePerWord * (punctuationMultiplier - 1);

  for (const token of chunk) {
    const charCount = [...token.word].length;
    const overflow = charCount - LONG_WORD_THRESHOLD;
    if (overflow > 0) {
      delay += basePerWord * LONG_WORD_BONUS * overflow;
    }
  }

  if (nextIsParagraphStart) {
    delay += basePerWord * PAUSE_PARAGRAPH;
  }

  return delay;
}
