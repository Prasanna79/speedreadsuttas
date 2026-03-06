import { getOrpIndex, type Token } from '@palispeedread/shared';

/**
 * Pick the anchor word index for a chunk.
 * - Chunk 1–2: first word (index 0)
 * - Chunk 3–4: center-ish word (index 1)
 *
 * Formula: floor((chunkSize - 1) / 2)
 */
function getAnchorIndex(chunkSize: number): number {
  return Math.floor((chunkSize - 1) / 2);
}

/**
 * Split a chunk into three parts around the anchor word's ORP character.
 * Returns [beforeORP, orpChar, afterORP] where:
 * - beforeORP: words before anchor + chars before ORP in anchor word
 * - orpChar: the single ORP character
 * - afterORP: rest of anchor word + its punct + remaining words
 */
export function splitChunkAtOrp(chunk: Token[]): [string, string, string] {
  if (chunk.length === 0) return ['', '', ''];

  const anchorIdx = getAnchorIndex(chunk.length);
  const anchor = chunk[anchorIdx];
  const chars = [...anchor.word];
  const orpIndex = getOrpIndex(chars.length);
  const orpChar = chars[orpIndex] ?? '';

  // Build left column: all words before anchor + start of anchor word up to ORP
  let before = '';
  for (let i = 0; i < anchorIdx; i++) {
    if (i > 0) before += ' ';
    before += chunk[i].word + chunk[i].trailingPunctuation;
  }
  if (anchorIdx > 0) before += ' ';
  before += chars.slice(0, orpIndex).join('');

  // Build right column: rest of anchor word + its punct + words after anchor
  let after = chars.slice(orpIndex + 1).join('') + anchor.trailingPunctuation;
  for (let i = anchorIdx + 1; i < chunk.length; i++) {
    after += ' ' + chunk[i].word + chunk[i].trailingPunctuation;
  }

  return [before, orpChar, after];
}
