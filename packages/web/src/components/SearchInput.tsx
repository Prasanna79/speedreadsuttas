import { normalizeInput, searchIndex, type SearchIndexEntry } from '@palispeedread/shared';
import { useEffect, useMemo, useRef, useState } from 'react';

import { fetchSearchIndex } from '../lib/api';

interface SearchInputProps {
  onSelectUid: (uid: string) => void;
}

export function SearchInput({ onSelectUid }: SearchInputProps) {
  const [value, setValue] = useState('');
  const [index, setIndex] = useState<SearchIndexEntry[] | null>(null);
  const [results, setResults] = useState<SearchIndexEntry[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  const shouldShow = useMemo(() => results.length > 0 && value.trim().length > 0, [results, value]);

  useEffect(() => {
    if (value.trim().length < 1) {
      setResults([]);
      return;
    }

    if (!index) {
      fetchSearchIndex()
        .then(setIndex)
        .catch(() => {
          setIndex([]);
        });
      return;
    }

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      const normalized = normalizeInput(value);
      if (normalized.uid) {
        setResults(index.filter((entry) => entry.uid === normalized.uid));
        return;
      }

      const query = normalized.searchQuery ?? '';
      setResults(searchIndex(query, index));
    }, 300);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [index, value]);

  return (
    <div className="relative w-full max-w-2xl">
      <input
        aria-label="Search sutta"
        className="w-full rounded border border-stone-300 px-4 py-3 text-lg shadow-sm"
        placeholder="Enter a sutta (e.g. MN 1, sn12.2, mūlapariyāya)"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setHighlighted(0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && results.length > 0) {
            event.preventDefault();
            setHighlighted((value) => Math.min(results.length - 1, value + 1));
          }

          if (event.key === 'ArrowUp' && results.length > 0) {
            event.preventDefault();
            setHighlighted((value) => Math.max(0, value - 1));
          }

          if (event.key === 'Enter') {
            event.preventDefault();
            const selected = results[highlighted];
            if (selected) {
              onSelectUid(selected.uid);
              return;
            }
            const parsed = normalizeInput(value);
            if (parsed.uid) {
              onSelectUid(parsed.uid);
            }
          }

          if (event.key === 'Escape') {
            setResults([]);
          }
        }}
      />

      {shouldShow ? (
        <ul className="absolute z-10 mt-2 w-full rounded border border-stone-200 bg-white shadow-lg" role="listbox">
          {results.slice(0, 8).map((result, indexValue) => (
            <li key={result.uid}>
              <button
                className={`block w-full px-4 py-2 text-left ${highlighted === indexValue ? 'bg-orange-100' : ''}`}
                type="button"
                onClick={() => onSelectUid(result.uid)}
              >
                <span className="font-semibold">{result.uid.toUpperCase()}</span>
                <span className="text-stone-600">{` — ${result.t}`}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
