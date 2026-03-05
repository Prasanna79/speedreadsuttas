import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LAST_READ_KEY } from '../lib/constants';
import { useLastRead } from './useLastRead';

describe('useLastRead', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves on pause and periodically while playing', () => {
    const { rerender } = renderHook((props: Parameters<typeof useLastRead>[0]) => useLastRead(props), {
      initialProps: { uid: 'mn1', lang: 'en', author: 'sujato', position: 2, isPlaying: false },
    });

    let stored = JSON.parse(window.localStorage.getItem(LAST_READ_KEY) ?? '{}') as { position: number };
    expect(stored.position).toBe(2);

    rerender({ uid: 'mn1', lang: 'en', author: 'sujato', position: 3, isPlaying: true });
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    stored = JSON.parse(window.localStorage.getItem(LAST_READ_KEY) ?? '{}') as { position: number };
    expect(stored.position).toBe(3);
  });

  it('returns resume prompt only for matching reader', () => {
    window.localStorage.setItem(
      LAST_READ_KEY,
      JSON.stringify({ uid: 'mn1', lang: 'en', author: 'sujato', position: 4, timestamp: Date.now() }),
    );

    const { result, rerender } = renderHook(
      (props: Parameters<typeof useLastRead>[0]) => useLastRead(props),
      {
        initialProps: { uid: 'mn1', lang: 'en', author: 'sujato', position: 0, isPlaying: false },
      },
    );

    expect(result.current.resumePosition).toBe(4);

    act(() => {
      result.current.clearResume();
    });
    expect(result.current.resumePosition).toBeNull();

    rerender({ uid: 'mn2', lang: 'en', author: 'sujato', position: 0, isPlaying: false });
    expect(result.current.resumePosition).toBeNull();
  });
});
