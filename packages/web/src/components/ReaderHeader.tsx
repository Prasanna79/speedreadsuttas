import type { ReactNode } from 'react';

interface ReaderHeaderProps {
  uid: string;
  title: string;
  langName: string;
  authorName: string;
  suttaCentralUrl?: string;
  actions?: ReactNode;
}

export function ReaderHeader({
  uid,
  title,
  langName,
  authorName,
  suttaCentralUrl,
  actions,
}: ReaderHeaderProps) {
  return (
    <header className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{`${uid.toUpperCase()} — ${title}`}</h1>
        <p className="ui-muted text-sm">{`${langName} · ${authorName}`}</p>
        {suttaCentralUrl ? (
          <a
            className="ui-link text-sm"
            href={suttaCentralUrl}
            rel="noreferrer noopener"
            target="_blank"
          >
            Full sutta
          </a>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>
      ) : null}
    </header>
  );
}
