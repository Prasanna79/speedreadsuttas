import { formatTimeRemaining } from '../lib/time';

interface ProgressBarProps {
  progress: number;
  timeRemainingMs: number;
  onSeek: (index: number) => void;
  totalChunks: number;
}

export function ProgressBar({ progress, timeRemainingMs, onSeek, totalChunks }: ProgressBarProps) {
  return (
    <div>
      <button
        aria-label="Seek progress"
        className="h-3 w-full overflow-hidden rounded bg-[var(--surface-soft)]"
        type="button"
        onClick={(event) => {
          const target = event.currentTarget.getBoundingClientRect();
          const ratio = Math.min(1, Math.max(0, (event.clientX - target.left) / target.width));
          onSeek(Math.round(ratio * Math.max(0, totalChunks - 1)));
        }}
      >
        <span
          className="block h-full bg-[var(--accent)] transition-all"
          data-testid="progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        />
      </button>
      <p className="ui-muted mt-2 text-sm">{`${Math.round(progress * 100)}% · ${formatTimeRemaining(timeRemainingMs)}`}</p>
    </div>
  );
}
