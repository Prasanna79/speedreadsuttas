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
  if (tokens.length === 0) {
    return 0;
  }

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

export function buildChunks(tokens: Token[], options: BuildChunksOptions): Token[][] {
  const { chunkSize, fontSize } = options;
  if (!tokens.length || chunkSize < 1) {
    return [];
  }

  const chunks: Token[][] = [];
  const charBudget = getChunkCharBudget(fontSize);
  let cursor = 0;

  while (cursor < tokens.length) {
    const currentChunk: Token[] = [tokens[cursor]];
    cursor += 1;

    if (shouldCloseAfterToken(currentChunk[0], currentChunk.length)) {
      chunks.push(currentChunk);
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
    chunks.push(currentChunk);
  }

  return chunks;
}
