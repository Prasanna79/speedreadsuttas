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
}: ReaderControlsProps) {
  return (
    <section className="ui-panel-soft grid gap-3 rounded p-4">
      <div className="flex items-center gap-2">
        <button aria-label="Skip backward" className="ui-button rounded px-3 py-2" type="button" onClick={onSkipBackward}>
          ←
        </button>
        <button aria-label="Play or pause" className="ui-button rounded px-4 py-2" type="button" onClick={onTogglePlay}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button aria-label="Skip forward" className="ui-button rounded px-3 py-2" type="button" onClick={onSkipForward}>
          →
        </button>
        <button aria-label="Restart" className="ui-button rounded px-3 py-2" type="button" onClick={onRestart}>
          Restart
        </button>
      </div>

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
    </section>
  );
}
