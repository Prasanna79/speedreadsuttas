import { getOrpIndex, type Token } from '@palispeedread/shared';

/**
 * Compute the [before, orpChar, after] split for a chunk using a specific token/char anchor.
 */
function splitAtLocation(chunk: Token[], tokenIdx: number, charIdx: number): [string, string, string] {
  const anchor = chunk[tokenIdx];
  const chars = [...anchor.word];
  const orpChar = chars[charIdx] ?? '';

  let before = '';
  for (let i = 0; i < tokenIdx; i++) {
    if (i > 0) before += ' ';
    before += chunk[i].word + chunk[i].trailingPunctuation;
  }
  if (tokenIdx > 0) before += ' ';
  before += chars.slice(0, charIdx).join('');

  let after = chars.slice(charIdx + 1).join('') + anchor.trailingPunctuation;
  for (let i = tokenIdx + 1; i < chunk.length; i++) {
    after += ' ' + chunk[i].word + chunk[i].trailingPunctuation;
  }

  return [before, orpChar, after];
}

/**
 * Split a chunk into three parts around the midpoint-nearest word character.
 */
export function splitChunkAtOrp(chunk: Token[]): [string, string, string] {
  if (chunk.length === 0) return ['', '', ''];
  if (chunk.length === 1) {
    const chars = [...chunk[0].word];
    return splitAtLocation(chunk, 0, getOrpIndex(chars.length));
  }

  const candidates: Array<{ tokenIdx: number; charIdx: number; absoluteIdx: number }> = [];
  let absoluteIdx = 0;

  for (let tokenIdx = 0; tokenIdx < chunk.length; tokenIdx++) {
    if (tokenIdx > 0) {
      absoluteIdx += 1;
    }

    const token = chunk[tokenIdx];
    const chars = [...token.word];
    for (let charIdx = 0; charIdx < chars.length; charIdx++) {
      candidates.push({ tokenIdx, charIdx, absoluteIdx });
      absoluteIdx += 1;
    }

    absoluteIdx += [...token.trailingPunctuation].length;
  }

  const midpoint = Math.floor(absoluteIdx / 2);
  let bestCandidate = candidates[0];
  let bestDistance = Math.abs(bestCandidate.absoluteIdx - midpoint);

  for (const candidate of candidates.slice(1)) {
    const distance = Math.abs(candidate.absoluteIdx - midpoint);
    if (distance < bestDistance) {
      bestCandidate = candidate;
      bestDistance = distance;
    }
  }

  return splitAtLocation(chunk, bestCandidate.tokenIdx, bestCandidate.charIdx);
}
