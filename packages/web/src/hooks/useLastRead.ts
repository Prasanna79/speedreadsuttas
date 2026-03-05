import type { LastRead } from '@palispeedread/shared';
import { useEffect, useMemo, useState } from 'react';

import { LAST_READ_KEY } from '../lib/constants';

interface LastReadParams {
  uid: string;
  lang: string;
  author: string;
  position: number;
  isPlaying: boolean;
}

function readStoredValue(): LastRead | null {
  try {
    const raw = window.localStorage.getItem(LAST_READ_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as LastRead;
  } catch {
    return null;
  }
}

function writeStoredValue(value: LastRead): void {
  window.localStorage.setItem(LAST_READ_KEY, JSON.stringify(value));
}

export function useLastRead({ uid, lang, author, position, isPlaying }: LastReadParams): {
  resumePosition: number | null;
  clearResume: () => void;
} {
  const [resumePosition, setResumePosition] = useState<number | null>(null);

  const payload = useMemo<LastRead>(
    () => ({ uid, lang, author, position, timestamp: Date.now() }),
    [uid, lang, author, position],
  );

  useEffect(() => {
    const stored = readStoredValue();
    if (!stored) {
      setResumePosition(null);
      return;
    }

    if (stored.uid === uid && stored.lang === lang && stored.author === author) {
      setResumePosition(stored.position);
      return;
    }

    setResumePosition(null);
  }, [uid, lang, author]);

  useEffect(() => {
    if (!isPlaying) {
      writeStoredValue(payload);
      return;
    }

    const handle = window.setInterval(() => {
      writeStoredValue(payload);
    }, 30000);

    return () => {
      window.clearInterval(handle);
    };
  }, [isPlaying, payload]);

  return {
    resumePosition,
    clearResume: () => setResumePosition(null),
  };
}
