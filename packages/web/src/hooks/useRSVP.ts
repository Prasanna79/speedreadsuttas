import { buildChunks, calculateChunkDelay, type Token } from '@palispeedread/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const clampIndex = (index: number, total: number): number => {
  if (total <= 0) {
    return 0;
  }
  return Math.min(Math.max(index, 0), total - 1);
};

export interface RSVPState {
  currentChunk: Token[] | null;
  currentIndex: number;
  totalChunks: number;
  isPlaying: boolean;
  progress: number;
  timeRemainingMs: number;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  skipForward: () => void;
  skipBackward: () => void;
  restart: () => void;
  seekTo: (index: number) => void;
}

export function useRSVP(tokens: Token[], wpm: number, chunkSize: number): RSVPState {
  const chunks = useMemo(() => buildChunks(tokens, chunkSize), [tokens, chunkSize]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);
  const activeTokenIndexRef = useRef(0);
  const previousChunkSizeRef = useRef(chunkSize);

  useEffect(() => {
    if (previousChunkSizeRef.current === chunkSize) {
      return;
    }

    setCurrentIndex(() => {
      const activeTokenIndex = activeTokenIndexRef.current;
      const nextIndex = chunks.findIndex((chunk) =>
        chunk.some((token) => token.index === activeTokenIndex),
      );
      return nextIndex >= 0 ? nextIndex : 0;
    });
    previousChunkSizeRef.current = chunkSize;
  }, [chunkSize, chunks]);

  useEffect(() => {
    setCurrentIndex((previous) => clampIndex(previous, chunks.length));
    if (chunks.length === 0) {
      setIsPlaying(false);
    }
  }, [chunks.length]);

  useEffect(() => {
    const activeToken = chunks[currentIndex]?.[0];
    if (activeToken) {
      activeTokenIndexRef.current = activeToken.index;
    }
  }, [chunks, currentIndex]);

  useEffect(() => {
    if (!isPlaying || chunks.length === 0) {
      return;
    }

    const chunk = chunks[currentIndex];
    if (!chunk) {
      setIsPlaying(false);
      return;
    }

    const nextChunk = chunks[currentIndex + 1];
    const delay = calculateChunkDelay(chunk, wpm, nextChunk?.[0]?.isParagraphStart ?? false);

    timerRef.current = window.setTimeout(() => {
      setCurrentIndex((previous) => {
        const nextIndex = previous + 1;
        if (nextIndex >= chunks.length) {
          setIsPlaying(false);
          return previous;
        }
        return nextIndex;
      });
    }, delay);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [chunks, currentIndex, isPlaying, wpm]);

  const timeRemainingMs = useMemo(() => {
    if (chunks.length === 0 || currentIndex >= chunks.length) {
      return 0;
    }

    return chunks.slice(currentIndex).reduce((total, chunk, index) => {
      const nextChunk = chunks[currentIndex + index + 1];
      return total + calculateChunkDelay(chunk, wpm, nextChunk?.[0]?.isParagraphStart ?? false);
    }, 0);
  }, [chunks, currentIndex, wpm]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const togglePlay = useCallback(() => setIsPlaying((value) => !value), []);

  const seekTo = useCallback(
    (index: number) => {
      setCurrentIndex(clampIndex(index, chunks.length));
    },
    [chunks.length],
  );

  const skipForward = useCallback(() => {
    setCurrentIndex((value) => clampIndex(value + 1, chunks.length));
  }, [chunks.length]);

  const skipBackward = useCallback(() => {
    setCurrentIndex((value) => clampIndex(value - 1, chunks.length));
  }, [chunks.length]);

  const restart = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  return {
    currentChunk: chunks[currentIndex] ?? null,
    currentIndex,
    totalChunks: chunks.length,
    isPlaying,
    progress: chunks.length > 1 ? currentIndex / (chunks.length - 1) : 0,
    timeRemainingMs,
    play,
    pause,
    togglePlay,
    skipForward,
    skipBackward,
    restart,
    seekTo,
  };
}
