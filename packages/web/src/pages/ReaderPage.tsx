import {
  parseUid,
  tokenize,
  type SearchIndexEntry,
  type StoredPreferences,
  type TranslationOption,
  WPM_MAX,
  WPM_MIN,
} from '@palispeedread/shared';
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ProgressBar } from '../components/ProgressBar';
import { ReaderControls } from '../components/ReaderControls';
import { ReaderHeader } from '../components/ReaderHeader';
import { RSVPDisplay } from '../components/RSVPDisplay';
import { SearchInput } from '../components/SearchInput';
import { SettingsPanel } from '../components/SettingsPanel';
import { TranslationChooser } from '../components/TranslationChooser';
import { useKeyboard } from '../hooks/useKeyboard';
import { useLastRead } from '../hooks/useLastRead';
import { usePreferences } from '../hooks/usePreferences';
import { useRSVP } from '../hooks/useRSVP';
import { fetchSearchIndex, fetchSuttaMeta, fetchSuttaText } from '../lib/api';

interface ReaderMeta {
  title: string;
  langName: string;
  authorName: string;
  translations: TranslationOption[];
}

interface CollectionNeighbors {
  previousUid: string | null;
  nextUid: string | null;
}

const uidCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function resolveCollectionNeighbors(uid: string, index: SearchIndexEntry[]): CollectionNeighbors {
  let collection: string;
  try {
    collection = parseUid(uid).collection;
  } catch {
    return { previousUid: null, nextUid: null };
  }

  const orderedUids = [
    ...new Set(index.filter((entry) => entry.c === collection).map((entry) => entry.uid)),
  ].sort((left, right) => uidCollator.compare(left, right));

  const currentIndex = orderedUids.indexOf(uid);
  if (currentIndex === -1) {
    return { previousUid: null, nextUid: null };
  }

  return {
    previousUid: orderedUids[currentIndex - 1] ?? null,
    nextUid: orderedUids[currentIndex + 1] ?? null,
  };
}

export function ReaderPage() {
  const navigate = useNavigate();
  const { uid = '', lang, author } = useParams();
  const [preferences, setPreferences] = usePreferences();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<ReturnType<typeof tokenize>>([]);
  const [meta, setMeta] = useState<ReaderMeta | null>(null);
  const [loadedRouteKey, setLoadedRouteKey] = useState<string | null>(null);
  const [neighbors, setNeighbors] = useState<CollectionNeighbors>({
    previousUid: null,
    nextUid: null,
  });

  const normalizedUid = useMemo(() => uid.trim().toLowerCase(), [uid]);
  const routeKey = useMemo(
    () => `${normalizedUid}:${lang ?? ''}:${author ?? ''}`,
    [normalizedUid, lang, author],
  );

  useEffect(() => {
    if (!normalizedUid || !lang || !author) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([fetchSuttaText(normalizedUid, lang, author), fetchSuttaMeta(normalizedUid)])
      .then(([textPayload, metaPayload]) => {
        const currentTranslation =
          metaPayload.translations.find(
            (option) => option.lang === lang && option.author === author,
          ) ?? metaPayload.translations[0];

        setMeta({
          title: metaPayload.title,
          langName: currentTranslation?.langName ?? lang,
          authorName: currentTranslation?.authorName ?? author,
          translations: metaPayload.translations,
        });
        setTokens(tokenize(textPayload.segments));
        setLoadedRouteKey(routeKey);
      })
      .catch((requestError: unknown) => {
        const message = requestError instanceof Error ? requestError.message : 'Unable to load';
        setError(message);
        setLoadedRouteKey(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [normalizedUid, lang, author, routeKey]);

  useEffect(() => {
    if (!normalizedUid || !lang || !author) {
      setNeighbors({ previousUid: null, nextUid: null });
      return;
    }

    let isCancelled = false;
    fetchSearchIndex()
      .then((index) => {
        if (isCancelled) {
          return;
        }
        setNeighbors(resolveCollectionNeighbors(normalizedUid, index));
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }
        setNeighbors({ previousUid: null, nextUid: null });
      });

    return () => {
      isCancelled = true;
    };
  }, [normalizedUid, lang, author]);

  if (!normalizedUid) {
    return <p className="p-8 text-center">Sutta not found</p>;
  }

  if (!lang || !author) {
    return (
      <main className="mx-auto grid min-h-screen max-w-3xl place-items-center px-6 py-12">
        <TranslationChooser uid={normalizedUid} />
      </main>
    );
  }

  if (loading || (!error && loadedRouteKey !== routeKey)) {
    return <p className="p-8 text-center">Loading reader…</p>;
  }

  if (error) {
    return (
      <main className="mx-auto grid min-h-screen max-w-2xl place-items-center gap-4 px-6 py-12 text-center">
        <p>{error === 'Sutta not found' ? 'Sutta not found' : 'Unable to load'}</p>
        <button className="ui-button rounded px-4 py-2" type="button" onClick={() => navigate(0)}>
          Retry
        </button>
      </main>
    );
  }

  return (
    <ReaderLoaded
      author={author}
      lang={lang}
      meta={meta}
      preferences={preferences}
      previousUid={neighbors.previousUid}
      nextUid={neighbors.nextUid}
      setPreferences={setPreferences}
      tokens={tokens}
      uid={normalizedUid}
    />
  );
}

interface ReaderLoadedProps {
  uid: string;
  lang: string;
  author: string;
  tokens: ReturnType<typeof tokenize>;
  meta: ReaderMeta | null;
  preferences: StoredPreferences;
  previousUid: string | null;
  nextUid: string | null;
  setPreferences: Dispatch<SetStateAction<StoredPreferences>>;
}

function ReaderLoaded({
  uid,
  lang,
  author,
  tokens,
  meta,
  preferences,
  previousUid,
  nextUid,
  setPreferences,
}: ReaderLoadedProps) {
  const navigate = useNavigate();
  const translationKey = `${lang}:${author}`;
  const suttaCentralUrl = `https://suttacentral.net/${uid}/${lang}/${author}`;
  const isFocusMode = preferences.focusMode;
  const readerMainClassName = isFocusMode
    ? 'mx-auto grid min-h-screen w-full max-w-4xl gap-6 px-4 py-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:px-6 md:py-8 md:pb-[calc(7rem+env(safe-area-inset-bottom))]'
    : 'mx-auto grid min-h-screen w-full max-w-4xl gap-6 px-4 py-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:px-6 md:py-8 md:pb-8';

  const rsvp = useRSVP(tokens, preferences.wpm, preferences.chunkSize);
  const seekTo = rsvp.seekTo;
  const { resumePosition } = useLastRead({
    uid,
    lang,
    author,
    position: rsvp.currentIndex,
    isPlaying: rsvp.isPlaying,
  });
  const resumeAppliedKeyRef = useRef<string | null>(null);
  const resumeKey = `${uid}:${lang}:${author}`;

  useKeyboard({
    togglePlay: rsvp.togglePlay,
    skipBackward: rsvp.skipBackward,
    skipForward: rsvp.skipForward,
    increaseWpm: () =>
      setPreferences((value) => ({
        ...value,
        wpm: Math.min(WPM_MAX, value.wpm + 25),
      })),
    decreaseWpm: () =>
      setPreferences((value) => ({
        ...value,
        wpm: Math.max(WPM_MIN, value.wpm - 25),
      })),
    restart: rsvp.restart,
    setChunkSize: (size) => setPreferences((value) => ({ ...value, chunkSize: size })),
    toggleTheme: () =>
      setPreferences((value) => ({
        ...value,
        theme: value.theme === 'dark' ? 'light' : 'dark',
      })),
    goHome: isFocusMode ? undefined : () => navigate('/'),
    exitFocusMode: isFocusMode
      ? () =>
          setPreferences((value) => ({
            ...value,
            focusMode: false,
          }))
      : undefined,
  });

  useEffect(() => {
    document.documentElement.classList.toggle('reader-focus-mode', isFocusMode);
    return () => {
      document.documentElement.classList.remove('reader-focus-mode');
    };
  }, [isFocusMode]);

  useEffect(() => {
    if (resumePosition === null) {
      return;
    }
    if (resumeAppliedKeyRef.current === resumeKey) {
      return;
    }

    seekTo(resumePosition);
    resumeAppliedKeyRef.current = resumeKey;
  }, [resumeKey, resumePosition, seekTo]);

  return (
    <>
      {isFocusMode ? (
        <button
          aria-label="Exit focus mode"
          className="ui-button fixed top-4 right-4 z-40 rounded px-3 py-2 text-sm"
          type="button"
          onClick={() => setPreferences((state) => ({ ...state, focusMode: false }))}
        >
          Exit focus
        </button>
      ) : null}

      <main className={readerMainClassName}>
        {isFocusMode ? null : (
          <ReaderHeader
            authorName={meta?.authorName ?? author}
            langName={meta?.langName ?? lang}
            metaActions={
              <button
                aria-label="Enter focus mode"
                className="ui-button rounded px-2 py-1"
                type="button"
                onClick={() => setPreferences((state) => ({ ...state, focusMode: true }))}
              >
                <span aria-hidden="true">⤢</span>
              </button>
            }
            suttaCentralUrl={suttaCentralUrl}
            title={meta?.title ?? uid}
            uid={uid}
            actions={
              <>
                <button
                  aria-label="Previous sutta"
                  className="ui-button rounded px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!previousUid}
                  type="button"
                  onClick={() => {
                    if (!previousUid) {
                      return;
                    }
                    navigate(`/read/${previousUid}/${lang}/${author}`);
                  }}
                >
                  ← Prev
                </button>
                <button
                  aria-label="Next sutta"
                  className="ui-button rounded px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!nextUid}
                  type="button"
                  onClick={() => {
                    if (!nextUid) {
                      return;
                    }
                    navigate(`/read/${nextUid}/${lang}/${author}`);
                  }}
                >
                  Next →
                </button>
                <button
                  className="ui-button hidden rounded px-3 py-1 text-sm sm:inline-flex"
                  type="button"
                  onClick={() => navigate('/')}
                >
                  Back to Search
                </button>
                <button
                  aria-label="Open search"
                  className="ui-button rounded px-2 py-1 sm:hidden"
                  type="button"
                  onClick={() => navigate('/')}
                >
                  <span aria-hidden="true">🔍</span>
                </button>
                {meta?.translations.length ? (
                  <label className="flex items-center gap-2 text-sm">
                    <span className="ui-muted">Translation</span>
                    <select
                      aria-label="Switch translation"
                      className="ui-input rounded px-2 py-1"
                      value={translationKey}
                      onChange={(event) => {
                        const [nextLang, nextAuthor] = event.target.value.split(':');
                        if (
                          !nextLang ||
                          !nextAuthor ||
                          (nextLang === lang && nextAuthor === author)
                        ) {
                          return;
                        }
                        navigate(`/read/${uid}/${nextLang}/${nextAuthor}`);
                      }}
                    >
                      {meta.translations.map((option) => {
                        const optionKey = `${option.lang}:${option.author}`;
                        return (
                          <option key={optionKey} value={optionKey}>
                            {`${option.langName} — ${option.authorName}`}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                ) : null}
              </>
            }
          />
        )}

        {isFocusMode ? null : (
          <section className="ui-panel-soft hidden rounded p-3 md:block">
            <SearchInput onSelectUid={(nextUid) => navigate(`/read/${nextUid}`)} />
          </section>
        )}

        <RSVPDisplay
          chunk={rsvp.currentChunk}
          fontFamily={preferences.fontFamily}
          fontSize={preferences.fontSize}
        />

        {isFocusMode ? null : (
          <>
            <ProgressBar
              progress={rsvp.progress}
              timeRemainingMs={rsvp.timeRemainingMs}
              totalChunks={rsvp.totalChunks}
              onSeek={rsvp.seekTo}
            />
            <div className="hidden md:block">
              <ReaderControls
                chunkSize={preferences.chunkSize}
                isPlaying={rsvp.isPlaying}
                wpm={preferences.wpm}
                onChunkSizeChange={(value) =>
                  setPreferences((state) => ({ ...state, chunkSize: value }))
                }
                onRestart={rsvp.restart}
                onSkipBackward={rsvp.skipBackward}
                onSkipForward={rsvp.skipForward}
                onTogglePlay={rsvp.togglePlay}
                onWpmChange={(value) => setPreferences((state) => ({ ...state, wpm: value }))}
              />
            </div>
            <SettingsPanel
              preferences={preferences}
              onThemeToggle={() =>
                setPreferences((state) => ({
                  ...state,
                  theme: state.theme === 'dark' ? 'light' : 'dark',
                }))
              }
              onFontSizeChange={(size) => setPreferences((state) => ({ ...state, fontSize: size }))}
              onFontFamilyChange={(family) =>
                setPreferences((state) => ({ ...state, fontFamily: family }))
              }
            />
          </>
        )}
      </main>

      <div
        className={`fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] ${isFocusMode ? '' : 'md:hidden'}`.trim()}
      >
        <ReaderControls
          chunkSize={preferences.chunkSize}
          compact
          isPlaying={rsvp.isPlaying}
          wpm={preferences.wpm}
          onChunkSizeChange={(value) => setPreferences((state) => ({ ...state, chunkSize: value }))}
          onRestart={rsvp.restart}
          onSkipBackward={rsvp.skipBackward}
          onSkipForward={rsvp.skipForward}
          onTogglePlay={rsvp.togglePlay}
          onWpmChange={(value) => setPreferences((state) => ({ ...state, wpm: value }))}
        />
      </div>
    </>
  );
}
