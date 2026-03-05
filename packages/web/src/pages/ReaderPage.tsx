import { tokenize, type StoredPreferences, WPM_MAX, WPM_MIN } from '@palispeedread/shared';
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ProgressBar } from '../components/ProgressBar';
import { ReaderControls } from '../components/ReaderControls';
import { ReaderHeader } from '../components/ReaderHeader';
import { RSVPDisplay } from '../components/RSVPDisplay';
import { SettingsPanel } from '../components/SettingsPanel';
import { TranslationChooser } from '../components/TranslationChooser';
import { useKeyboard } from '../hooks/useKeyboard';
import { useLastRead } from '../hooks/useLastRead';
import { usePreferences } from '../hooks/usePreferences';
import { useRSVP } from '../hooks/useRSVP';
import { fetchSuttaMeta, fetchSuttaText } from '../lib/api';

interface ReaderMeta {
  title: string;
  langName: string;
  authorName: string;
}

export function ReaderPage() {
  const navigate = useNavigate();
  const { uid = '', lang, author } = useParams();
  const [preferences, setPreferences] = usePreferences();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<ReturnType<typeof tokenize>>([]);
  const [meta, setMeta] = useState<ReaderMeta | null>(null);

  const normalizedUid = useMemo(() => uid.trim().toLowerCase(), [uid]);

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
          metaPayload.translations.find((option) => option.lang === lang && option.author === author) ??
          metaPayload.translations[0];

        setMeta({
          title: metaPayload.title,
          langName: currentTranslation?.langName ?? lang,
          authorName: currentTranslation?.authorName ?? author,
        });
        setTokens(tokenize(textPayload.segments));
      })
      .catch((requestError: unknown) => {
        const message = requestError instanceof Error ? requestError.message : 'Unable to load';
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
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

  if (loading) {
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
  setPreferences: Dispatch<SetStateAction<StoredPreferences>>;
}

function ReaderLoaded({
  uid,
  lang,
  author,
  tokens,
  meta,
  preferences,
  setPreferences,
}: ReaderLoadedProps) {
  const navigate = useNavigate();

  const rsvp = useRSVP(tokens, preferences.wpm, preferences.chunkSize);
  const { resumePosition, clearResume } = useLastRead({
    uid,
    lang,
    author,
    position: rsvp.currentIndex,
    isPlaying: rsvp.isPlaying,
  });

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
    goHome: () => navigate('/'),
  });

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-4xl gap-6 px-6 py-8">
      <ReaderHeader
        authorName={meta?.authorName ?? author}
        langName={meta?.langName ?? lang}
        title={meta?.title ?? uid}
        uid={uid}
      />

      {resumePosition !== null ? (
        <section className="ui-panel-soft rounded p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1">{`Resume from ${resumePosition + 1}?`}</span>
            <button className="ui-button rounded px-2 py-1" type="button" onClick={() => {
              rsvp.seekTo(resumePosition);
              clearResume();
            }}>
              Resume
            </button>
            <button className="ui-button rounded px-2 py-1" type="button" onClick={clearResume}>
              Start over
            </button>
          </div>
        </section>
      ) : null}

      <RSVPDisplay chunk={rsvp.currentChunk} fontSize={preferences.fontSize} />
      <ProgressBar
        progress={rsvp.progress}
        timeRemainingMs={rsvp.timeRemainingMs}
        totalChunks={rsvp.totalChunks}
        onSeek={rsvp.seekTo}
      />
      <ReaderControls
        chunkSize={preferences.chunkSize}
        isPlaying={rsvp.isPlaying}
        wpm={preferences.wpm}
        onChunkSizeChange={(value) => setPreferences((state) => ({ ...state, chunkSize: value }))}
        onRestart={rsvp.restart}
        onSkipBackward={rsvp.skipBackward}
        onSkipForward={rsvp.skipForward}
        onTogglePlay={rsvp.togglePlay}
        onWpmChange={(value) => setPreferences((state) => ({ ...state, wpm: value }))}
      />
      <SettingsPanel
        preferences={preferences}
        onThemeToggle={() =>
          setPreferences((state) => ({ ...state, theme: state.theme === 'dark' ? 'light' : 'dark' }))
        }
        onFontSizeChange={(size) => setPreferences((state) => ({ ...state, fontSize: size }))}
      />
    </main>
  );
}
