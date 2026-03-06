import type { Token } from '@palispeedread/shared';

import { splitChunkAtOrp } from './orp-split';

interface RSVPDisplayProps {
  chunk: Token[] | null;
  fontSize: 'normal' | 'large' | 'xlarge';
  fontFamily: 'serif' | 'mono' | 'openDyslexic';
}

const fontFamilyClassMap = {
  serif: 'reader-font-serif',
  mono: 'reader-font-mono',
  openDyslexic: 'reader-font-dyslexic',
};

const fontSizeClassMap = {
  serif: {
    normal: 'text-4xl',
    large: 'text-5xl',
    xlarge: 'text-6xl',
  },
  mono: {
    normal: 'text-3xl',
    large: 'text-4xl',
    xlarge: 'text-5xl',
  },
  openDyslexic: {
    normal: 'text-3xl',
    large: 'text-4xl',
    xlarge: 'text-5xl',
  },
} as const;

const familyTuningClassMap = {
  serif: '',
  mono: 'tracking-tight',
  openDyslexic: 'leading-snug',
} as const;

export function RSVPDisplay({ chunk, fontSize, fontFamily }: RSVPDisplayProps) {
  if (!chunk || chunk.length === 0) {
    return (
      <section className="ui-panel rounded p-8 text-center ui-muted">No text loaded</section>
    );
  }

  const [before, orpChar, after] = splitChunkAtOrp(chunk);
  const ariaLabel = chunk.map((t) => t.word + t.trailingPunctuation).join(' ');

  return (
    <section
      aria-live="polite"
      aria-label={ariaLabel}
      className="ui-panel relative flex min-h-56 items-center justify-center rounded px-6 py-10"
    >
      {/* 3-column grid: [1fr auto 1fr] anchors ORP at horizontal center */}
      <div
        data-testid="orp-grid"
        className={`grid w-full grid-cols-[1fr_auto_1fr] ${fontFamilyClassMap[fontFamily]} ${familyTuningClassMap[fontFamily]} leading-tight [font-variant-numeric:lining-nums_tabular-nums] ${fontSizeClassMap[fontFamily][fontSize]}`}
      >
        <span data-testid="orp-before" className="text-right whitespace-pre">
          {before}
        </span>
        <span data-testid="orp-char" className="ui-accent text-center">
          {orpChar}
        </span>
        <span data-testid="orp-after" className="text-left whitespace-pre">
          {after}
        </span>
      </div>
      {/* Triangular anchor markers aligned to grid center */}
      <div className="pointer-events-none absolute left-1/2 top-2 h-0 w-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-[var(--accent)]" />
      <div className="pointer-events-none absolute bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-b-8 border-x-transparent border-b-[var(--accent)]" />
    </section>
  );
}
