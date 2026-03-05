import type { ReactNode } from 'react';

interface ReaderHeaderProps {
  uid: string;
  title: string;
  langName: string;
  authorName: string;
  suttaCentralUrl?: string;
  metaActions?: ReactNode;
  actions?: ReactNode;
}

export function ReaderHeader({
  uid,
  title,
  langName,
  authorName,
  suttaCentralUrl,
  metaActions,
  actions,
}: ReaderHeaderProps) {
  return (
    <header className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{`${uid.toUpperCase()} — ${title}`}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <p className="ui-muted">{`${langName} · ${authorName}`}</p>
          {suttaCentralUrl ? (
            <a className="ui-link" href={suttaCentralUrl} rel="noreferrer noopener" target="_blank">
              On SuttaCentral
            </a>
          ) : null}
          {metaActions}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>
      ) : null}
    </header>
  );
}
