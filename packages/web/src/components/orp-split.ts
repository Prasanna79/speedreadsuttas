import { getOrpIndex, type Token } from '@palispeedread/shared';

/**
 * Split a chunk into three parts around the first word's ORP character.
 * Returns [beforeORP, orpChar, afterORP] where:
 * - beforeORP: characters before the ORP in the first word
 * - orpChar: the single ORP character
 * - afterORP: everything after the ORP — rest of first word + trailing punct + remaining words
 */
export function splitChunkAtOrp(chunk: Token[]): [string, string, string] {
  if (chunk.length === 0) return ['', '', ''];

  const first = chunk[0];
  const chars = [...first.word];
  const orpIndex = getOrpIndex(chars.length);
  const before = chars.slice(0, orpIndex).join('');
  const orpChar = chars[orpIndex] ?? '';
  const afterFirst = chars.slice(orpIndex + 1).join('');

  // Build the right-column string: rest of first word + its punctuation + remaining words
  let after = afterFirst + first.trailingPunctuation;
  for (let i = 1; i < chunk.length; i++) {
    after += ' ' + chunk[i].word + chunk[i].trailingPunctuation;
  }

  return [before, orpChar, after];
}
