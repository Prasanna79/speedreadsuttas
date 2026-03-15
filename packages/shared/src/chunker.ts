import { CHUNK_CHAR_BUDGET } from './constants';
import type { FontSize, Token } from './types';

export interface BuildChunksOptions {
  chunkSize: number;
  fontSize: FontSize;
}

const SENTENCE_FINAL_PUNCTUATION = /[.!?…]/u;
const CLAUSE_FINAL_PUNCTUATION = /[,;:—–]/u;

function isSentenceFinalPunctuation(punctuation: string): boolean {
  return SENTENCE_FINAL_PUNCTUATION.test(punctuation);
}

function isClauseFinalPunctuation(punctuation: string): boolean {
  return !isSentenceFinalPunctuation(punctuation) && CLAUSE_FINAL_PUNCTUATION.test(punctuation);
}

function getChunkCharBudget(fontSize: FontSize): number {
  return CHUNK_CHAR_BUDGET[fontSize];
}

function getVisibleChunkLength(tokens: Token[]): number {
  return tokens.reduce((total, token, index) => {
    const spaceLength = index > 0 ? 1 : 0;
    return total + spaceLength + [...token.word].length + [...token.trailingPunctuation].length;
  }, 0);
}

function shouldCloseAfterToken(token: Token, chunkLength: number): boolean {
  if (isSentenceFinalPunctuation(token.trailingPunctuation)) {
    return true;
  }

  return chunkLength >= 2 && isClauseFinalPunctuation(token.trailingPunctuation);
}

const PUNCTUATION_ONLY = /^[.,;:!?…—–'""')\]}]+$/u;

function isPunctuationOnlyChunk(chunk: Token[]): boolean {
  return chunk.every((token) => PUNCTUATION_ONLY.test(token.word));
}

export function buildChunks(tokens: Token[], options: BuildChunksOptions): Token[][] {
  const { chunkSize, fontSize } = options;
  if (!tokens.length || chunkSize < 1) {
    return [];
  }

  const rawChunks: Token[][] = [];
  const charBudget = getChunkCharBudget(fontSize);
  let cursor = 0;

  while (cursor < tokens.length) {
    const currentChunk: Token[] = [tokens[cursor]];
    cursor += 1;

    if (shouldCloseAfterToken(currentChunk[0], currentChunk.length)) {
      rawChunks.push(currentChunk);
      continue;
    }

    while (cursor < tokens.length) {
      const nextToken = tokens[cursor];
      if (nextToken.isParagraphStart) {
        break;
      }
      if (currentChunk.length >= chunkSize) {
        break;
      }

      const projectedLength =
        getVisibleChunkLength(currentChunk) +
        1 +
        [...nextToken.word].length +
        [...nextToken.trailingPunctuation].length;

      if (projectedLength > charBudget) {
        break;
      }

      currentChunk.push(nextToken);
      cursor += 1;

      if (shouldCloseAfterToken(nextToken, currentChunk.length)) {
        break;
      }
    }
    rawChunks.push(currentChunk);
  }

  // Merge punctuation-only chunks into adjacent chunks so they never display alone.
  const chunks: Token[][] = [];
  for (const chunk of rawChunks) {
    if (isPunctuationOnlyChunk(chunk) && chunks.length > 0) {
      chunks[chunks.length - 1].push(...chunk);
    } else {
      chunks.push(chunk);
    }
  }

  // If the very first chunk is punctuation-only, merge it forward.
  if (chunks.length > 1 && isPunctuationOnlyChunk(chunks[0])) {
    chunks[1].unshift(...chunks[0]);
    chunks.shift();
  }

  return chunks;
}
