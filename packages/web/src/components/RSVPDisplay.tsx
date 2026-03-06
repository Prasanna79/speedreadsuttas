import { getOrpIndex, type Token } from '@palispeedread/shared';

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

/**
 * Split a chunk into three parts around the first word's ORP character.
 * Returns [beforeORP, orpChar, afterORP] where:
 * - beforeORP: characters before the ORP in the first word
 * - orpChar: the single ORP character
 * - afterORP: everything after the ORP — rest of first word + trailing punct + remaining words
 */
export function splitChunkAtOrp(chunk: Token[]): [string, string, string] {
  if (chunk.length === 0) return ['', '', ''];

  const first = chunk[0];
  const chars = [...first.word];
  const orpIndex = getOrpIndex(chars.length);
  const before = chars.slice(0, orpIndex).join('');
  const orpChar = chars[orpIndex] ?? '';
  const afterFirst = chars.slice(orpIndex + 1).join('');

  // Build the right-column string: rest of first word + its punctuation + remaining words
  let after = afterFirst + first.trailingPunctuation;
  for (let i = 1; i < chunk.length; i++) {
    after += ' ' + chunk[i].word + chunk[i].trailingPunctuation;
  }

  return [before, orpChar, after];
}

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
        className={`grid w-full grid-cols-[1fr_auto_1fr] ${fontFamilyClassMap[fontFamily]} leading-tight [font-variant-numeric:lining-nums_tabular-nums] ${fontSizeClassMap[fontSize]}`}
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
