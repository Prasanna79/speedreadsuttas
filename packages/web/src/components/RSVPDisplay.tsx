import { getOrpIndex, type Token } from '@palispeedread/shared';
import type { ReactNode } from 'react';

interface RSVPDisplayProps {
  chunk: Token[] | null;
  fontSize: 'normal' | 'large' | 'xlarge';
  fontFamily: 'serif' | 'mono' | 'openDyslexic';
}

const fontSizeClassMap = {
  normal: 'text-4xl',
  large: 'text-5xl',
  xlarge: 'text-6xl',
};

const fontFamilyClassMap = {
  serif: 'reader-font-serif',
  mono: 'reader-font-mono',
  openDyslexic: 'reader-font-dyslexic',
};

function renderWord(token: Token): ReactNode {
  const chars = [...token.word];
  const orpIndex = getOrpIndex(chars.length);
  const before = chars.slice(0, orpIndex).join('');
  const orpChar = chars[orpIndex] ?? '';
  const after = chars.slice(orpIndex + 1).join('');

  return (
    <span key={`${token.segmentId}:${token.index}`} className="align-baseline whitespace-pre">
      <span>{before}</span>
      <span className="ui-accent" data-testid="orp-char">
        {orpChar}
      </span>
      <span>{after}</span>
      <span>{token.trailingPunctuation}</span>
    </span>
  );
}

export function RSVPDisplay({ chunk, fontSize, fontFamily }: RSVPDisplayProps) {
  if (!chunk || chunk.length === 0) {
    return <section className="ui-panel rounded p-8 text-center ui-muted">No text loaded</section>;
  }

  return (
    <section
      aria-live="polite"
      className="ui-panel relative flex min-h-56 items-center justify-center rounded px-6 py-10 text-center"
    >
      <div
        className={`${fontFamilyClassMap[fontFamily]} leading-tight [font-variant-numeric:lining-nums_tabular-nums] ${fontSizeClassMap[fontSize]}`}
      >
        {chunk.map((token, index) => (
          <span key={`${token.segmentId}:${token.index}`}>
            {renderWord(token)}
            {index < chunk.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute top-2 h-0 w-0 border-x-8 border-t-8 border-x-transparent border-t-[var(--accent)]" />
      <div className="pointer-events-none absolute bottom-2 h-0 w-0 border-x-8 border-b-8 border-x-transparent border-b-[var(--accent)]" />
    </section>
  );
}
