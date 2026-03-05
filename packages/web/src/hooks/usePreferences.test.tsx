import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_PREFERENCES, PREFERENCES_KEY } from '../lib/constants';
import { usePreferences } from './usePreferences';

describe('usePreferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('returns defaults and detects theme on first load', () => {
    const { result } = renderHook(() => usePreferences());

    expect(result.current[0].wpm).toBe(DEFAULT_PREFERENCES.wpm);
    expect(result.current[0].chunkSize).toBe(DEFAULT_PREFERENCES.chunkSize);
    expect(result.current[0].theme).toBe('dark');
    expect(result.current[0].fontFamily).toBe(DEFAULT_PREFERENCES.fontFamily);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('handles corrupt localStorage gracefully', () => {
    window.localStorage.setItem(PREFERENCES_KEY, '{bad json');
    const { result } = renderHook(() => usePreferences());
    expect(result.current[0].wpm).toBe(DEFAULT_PREFERENCES.wpm);
  });

  it('persists updates', () => {
    const { result } = renderHook(() => usePreferences());

    act(() => {
      result.current[1]((previous) => ({ ...previous, wpm: 350, theme: 'light' }));
    });

    const stored = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? '{}') as {
      wpm: number;
      theme: string;
    };
    expect(stored.wpm).toBe(350);
    expect(stored.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
