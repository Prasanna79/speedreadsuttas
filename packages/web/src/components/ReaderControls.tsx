interface ReaderControlsProps {
  isPlaying: boolean;
  wpm: number;
  chunkSize: number;
  onTogglePlay: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onWpmChange: (value: number) => void;
  onChunkSizeChange: (value: number) => void;
  onRestart: () => void;
  compact?: boolean;
  showChunkControlsInCompact?: boolean;
  className?: string;
}

export function ReaderControls({
  isPlaying,
  wpm,
  chunkSize,
  onTogglePlay,
  onSkipBackward,
  onSkipForward,
  onWpmChange,
  onChunkSizeChange,
  onRestart,
  compact = false,
  showChunkControlsInCompact = false,
  className = '',
}: ReaderControlsProps) {
  const containerClassName = compact
    ? `ui-panel-soft rounded-2xl p-3 ${className}`.trim()
    : `ui-panel-soft grid gap-3 rounded p-4 ${className}`.trim();

  return (
    <section aria-label="Reader playback controls" className={containerClassName}>
      <div className={`flex items-center gap-2 ${compact ? 'justify-center' : ''}`}>
        <button
          aria-label="Skip backward"
          className="ui-button rounded px-3 py-2"
          type="button"
          onClick={onSkipBackward}
        >
          ←
        </button>
        <button
          aria-label="Play or pause"
          className="ui-button rounded px-4 py-2"
          type="button"
          onClick={onTogglePlay}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          aria-label="Skip forward"
          className="ui-button rounded px-3 py-2"
          type="button"
          onClick={onSkipForward}
        >
          →
        </button>
        <button
          aria-label="Restart"
          className="ui-button rounded px-3 py-2"
          type="button"
          onClick={onRestart}
        >
          Restart
        </button>
      </div>

      {compact ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm ui-muted">Speed</span>
            <button
              aria-label="Decrease speed"
              className="ui-button rounded px-2 py-1"
              type="button"
              onClick={() => onWpmChange(Math.max(100, wpm - 25))}
            >
              −
            </button>
            <span className="min-w-14 text-center text-sm font-medium">{`${wpm} WPM`}</span>
            <button
              aria-label="Increase speed"
              className="ui-button rounded px-2 py-1"
              type="button"
              onClick={() => onWpmChange(Math.min(800, wpm + 25))}
            >
              +
            </button>
          </div>
          {showChunkControlsInCompact ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-sm ui-muted">Chunk</span>
              {[1, 2, 3, 4].map((value) => (
                <button
                  key={value}
                  aria-label={`Chunk ${value}`}
                  className={`rounded px-2 py-0.5 text-sm ${chunkSize === value ? 'ui-button-active' : 'ui-button-inactive'}`}
                  type="button"
                  onClick={() => onChunkSizeChange(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <label className="text-sm font-medium ui-muted" htmlFor="wpm-slider">
            WPM: {wpm}
          </label>
          <input
            aria-label="WPM slider"
            id="wpm-slider"
            max={800}
            min={100}
            step={25}
            type="range"
            value={wpm}
            onChange={(event) => onWpmChange(Number(event.target.value))}
          />

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium ui-muted">Chunk</span>
            {[1, 2, 3, 4].map((value) => (
              <button
                key={value}
                aria-label={`Chunk ${value}`}
                className={`rounded px-3 py-1 ${chunkSize === value ? 'ui-button-active' : 'ui-button-inactive'}`}
                type="button"
                onClick={() => onChunkSizeChange(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
