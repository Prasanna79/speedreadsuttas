import { compareSegmentIds } from './uid';
import type { Segment, Token } from './types';

const PUNCTUATION_PATTERN = /([.,;:!?…—–'"”’)\]}]+)$/u;
const INLINE_DASH_PATTERN = /([^\s—–])([—–])(?=[^\s])/gu;

const getSectionNumber = (segmentId: string): number | null => {
  const [, suffix = ''] = segmentId.split(':');
  const [sectionPart = ''] = suffix.split('.');
  const parsed = Number(sectionPart);
  return Number.isNaN(parsed) ? null : parsed;
};

const splitWordAndTrailingPunctuation = (rawWord: string): { word: string; trailingPunctuation: string } => {
  const punctuationMatch = rawWord.match(PUNCTUATION_PATTERN);
  if (!punctuationMatch) {
    return { word: rawWord, trailingPunctuation: '' };
  }

  const trailingPunctuation = punctuationMatch[1];
  const word = rawWord.slice(0, -trailingPunctuation.length);

  // Keep punctuation-only tokens intact as words.
  if (!word) {
    return { word: rawWord, trailingPunctuation: '' };
  }

  return { word, trailingPunctuation };
};

export function tokenize(segments: Segment[]): Token[] {
  const sortedSegments = [...segments].sort((left, right) => compareSegmentIds(left.id, right.id));
  const tokens: Token[] = [];
  let previousSection: number | null = null;

  for (const segment of sortedSegments) {
    const text = segment.text.trim();
    if (!text) {
      continue;
    }

    const section = getSectionNumber(segment.id);
    // Break inline dash joins like "awakening—I" into separate tokens while preserving dash punctuation.
    const words = text.replace(INLINE_DASH_PATTERN, '$1$2 ').split(/\s+/u);
    words.forEach((rawWord, position) => {
      const { word, trailingPunctuation } = splitWordAndTrailingPunctuation(rawWord);
      const isParagraphStart =
        position === 0 && (previousSection === null || (section !== null && section !== previousSection));

      tokens.push({
        word,
        index: tokens.length,
        segmentId: segment.id,
        isParagraphStart,
        trailingPunctuation,
      });
    });

    previousSection = section;
  }

  return tokens;
}
