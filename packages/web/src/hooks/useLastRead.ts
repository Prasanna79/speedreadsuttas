import type { LastRead } from '@palispeedread/shared';
import { useEffect, useRef, useState } from 'react';

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

  const payloadRef = useRef<LastRead>({ uid, lang, author, position, timestamp: 0 });

  useEffect(() => {
    payloadRef.current = { uid, lang, author, position, timestamp: Date.now() };
  });

  // Sync resume position from localStorage when route params change.
  /* eslint-disable react-hooks/set-state-in-effect -- reading external state (localStorage) */
  useEffect(() => {
    const stored = readStoredValue();
    if (stored?.uid === uid && stored.lang === lang && stored.author === author) {
      setResumePosition(stored.position);
    } else {
      setResumePosition(null);
    }
  }, [uid, lang, author]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!isPlaying) {
      writeStoredValue(payloadRef.current);
      return;
    }

    const handle = window.setInterval(() => {
      writeStoredValue(payloadRef.current);
    }, 30000);

    return () => {
      window.clearInterval(handle);
    };
  }, [isPlaying, uid, lang, author, position]);

  return {
    resumePosition,
    clearResume: () => setResumePosition(null),
  };
}
