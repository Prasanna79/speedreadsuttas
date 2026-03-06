import { getOrpIndex, type Token } from '@palispeedread/shared';

/**
 * Compute the [before, orpChar, after] split for a chunk using a specific anchor index.
 */
function splitAtAnchor(chunk: Token[], anchorIdx: number): [string, string, string] {
  const anchor = chunk[anchorIdx];
  const chars = [...anchor.word];
  const orpIndex = getOrpIndex(chars.length);
  const orpChar = chars[orpIndex] ?? '';

  // Left column: all words before anchor + start of anchor word up to ORP
  let before = '';
  for (let i = 0; i < anchorIdx; i++) {
    if (i > 0) before += ' ';
    before += chunk[i].word + chunk[i].trailingPunctuation;
  }
  if (anchorIdx > 0) before += ' ';
  before += chars.slice(0, orpIndex).join('');

  // Right column: rest of anchor word + its punct + words after anchor
  let after = chars.slice(orpIndex + 1).join('') + anchor.trailingPunctuation;
  for (let i = anchorIdx + 1; i < chunk.length; i++) {
    after += ' ' + chunk[i].word + chunk[i].trailingPunctuation;
  }

  return [before, orpChar, after];
}

/**
 * Split a chunk into three parts around the best-balanced anchor word's ORP.
 *
 * Tries every word as a candidate anchor and picks the one that minimizes
 * |before.length - after.length|. Ties are broken by preferring the earlier
 * (lower) index, giving a slight left-read bias.
 */
export function splitChunkAtOrp(chunk: Token[]): [string, string, string] {
  if (chunk.length === 0) return ['', '', ''];

  let bestIdx = 0;
  let bestImbalance = Infinity;

  for (let i = 0; i < chunk.length; i++) {
    const [before, , after] = splitAtAnchor(chunk, i);
    const imbalance = Math.abs(before.length - after.length);
    if (imbalance < bestImbalance) {
      bestImbalance = imbalance;
      bestIdx = i;
    }
  }

  return splitAtAnchor(chunk, bestIdx);
}
