import { getOrpIndex, type Token } from '@palispeedread/shared';
import type { ReactNode } from 'react';

interface RSVPDisplayProps {
  chunk: Token[] | null;
  fontSize: 'normal' | 'large' | 'xlarge';
}

const fontSizeClassMap = {
  normal: 'text-4xl',
  large: 'text-5xl',
  xlarge: 'text-6xl',
};

function renderWord(token: Token): ReactNode {
  const chars = [...token.word];
  const orpIndex = getOrpIndex(chars.length);
  const before = chars.slice(0, orpIndex).join('');
  const orpChar = chars[orpIndex] ?? '';
  const after = chars.slice(orpIndex + 1).join('');

  return (
    <span key={`${token.segmentId}:${token.index}`} className="inline-flex items-center gap-0.5">
      <span>{before}</span>
      <span className="text-orange-600" data-testid="orp-char">
        {orpChar}
      </span>
      <span>{after}</span>
      <span>{token.trailingPunctuation}</span>
    </span>
  );
}

export function RSVPDisplay({ chunk, fontSize }: RSVPDisplayProps) {
  if (!chunk || chunk.length === 0) {
    return <section className="rounded border border-stone-200 p-8 text-center text-stone-500">No text loaded</section>;
  }

  return (
    <section
      aria-live="polite"
      className="relative flex min-h-56 items-center justify-center rounded border border-stone-200 bg-white px-6 py-10 text-center shadow-sm"
    >
      <div className={`font-serif leading-tight ${fontSizeClassMap[fontSize]}`}>
        {chunk.map((token, index) => (
          <span key={`${token.segmentId}:${token.index}`}>
            {renderWord(token)}
            {index < chunk.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute top-2 h-0 w-0 border-x-8 border-b-8 border-x-transparent border-b-orange-500" />
      <div className="pointer-events-none absolute bottom-2 h-0 w-0 border-x-8 border-t-8 border-x-transparent border-t-orange-500" />
    </section>
  );
}
