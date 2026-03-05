import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { StoredPreferences } from '@palispeedread/shared';

import { DEFAULT_PREFERENCES, PREFERENCES_KEY } from '../lib/constants';

function resolveInitialTheme(): StoredPreferences['theme'] {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES.theme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readPreferences(): StoredPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (!raw) {
      return { ...DEFAULT_PREFERENCES, theme: resolveInitialTheme() };
    }

    const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
    return {
      wpm: parsed.wpm ?? DEFAULT_PREFERENCES.wpm,
      chunkSize: parsed.chunkSize ?? DEFAULT_PREFERENCES.chunkSize,
      theme: parsed.theme ?? resolveInitialTheme(),
      fontSize: parsed.fontSize ?? DEFAULT_PREFERENCES.fontSize,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES, theme: resolveInitialTheme() };
  }
}

export function usePreferences(): [StoredPreferences, Dispatch<SetStateAction<StoredPreferences>>] {
  const [preferences, setPreferences] = useState<StoredPreferences>(readPreferences);

  useEffect(() => {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
  }, [preferences.theme]);

  return [preferences, setPreferences];
}
