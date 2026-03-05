import { type Token } from '@palispeedread/shared';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRSVP } from './useRSVP';

const tokens: Token[] = [
  { word: 'one', index: 0, segmentId: 'mn1:1.1', isParagraphStart: true, trailingPunctuation: '' },
  { word: 'two', index: 1, segmentId: 'mn1:1.1', isParagraphStart: false, trailingPunctuation: '' },
  { word: 'three', index: 2, segmentId: 'mn1:1.2', isParagraphStart: false, trailingPunctuation: '' },
  { word: 'four', index: 3, segmentId: 'mn1:2.1', isParagraphStart: true, trailingPunctuation: '.' },
];

describe('useRSVP', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts paused and supports playback controls', () => {
    const { result } = renderHook(() => useRSVP(tokens, 600, 1));

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentIndex).toBe(0);

    act(() => result.current.play());
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      vi.advanceTimersByTime(130);
    });
    expect(result.current.currentIndex).toBe(1);

    act(() => result.current.pause());
    expect(result.current.isPlaying).toBe(false);

    act(() => result.current.skipForward());
    expect(result.current.currentIndex).toBe(2);

    act(() => result.current.skipBackward());
    expect(result.current.currentIndex).toBe(1);

    act(() => result.current.seekTo(3));
    expect(result.current.currentIndex).toBe(3);

    act(() => result.current.restart());
    expect(result.current.currentIndex).toBe(0);
  });

  it('auto-pauses at end', () => {
    const oneToken: Token[] = [tokens[0]];
    const { result } = renderHook(() => useRSVP(oneToken, 800, 1));

    act(() => result.current.play());
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });

  it('preserves reading position across chunk size changes', () => {
    const { result, rerender } = renderHook(
      ({ chunkSize }) => useRSVP(tokens, 300, chunkSize),
      { initialProps: { chunkSize: 1 } },
    );

    act(() => result.current.seekTo(2));
    expect(result.current.currentChunk?.some((token) => token.index === 2)).toBe(true);

    rerender({ chunkSize: 2 });
    expect(result.current.currentChunk?.some((token) => token.index === 2)).toBe(true);
  });

  it('computes progress and remaining time', () => {
    const { result } = renderHook(() => useRSVP(tokens, 300, 1));
    expect(result.current.progress).toBe(0);
    expect(result.current.timeRemainingMs).toBeGreaterThan(0);

    act(() => result.current.seekTo(2));
    expect(result.current.progress).toBeGreaterThan(0);
  });
});
