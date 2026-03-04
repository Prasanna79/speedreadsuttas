import type { Token } from './types';

export function buildChunks(tokens: Token[], chunkSize: number): Token[][] {
  if (!tokens.length || chunkSize < 1) {
    return [];
  }

  const chunks: Token[][] = [];
  let currentChunk: Token[] = [];

  for (const token of tokens) {
    if (token.isParagraphStart && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
    }

    currentChunk.push(token);

    if (currentChunk.length === chunkSize) {
      chunks.push(currentChunk);
      currentChunk = [];
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}
