interface ReaderHeaderProps {
  uid: string;
  title: string;
  langName: string;
  authorName: string;
}

export function ReaderHeader({ uid, title, langName, authorName }: ReaderHeaderProps) {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{`${uid.toUpperCase()} — ${title}`}</h1>
      <p className="text-sm text-stone-600">{`${langName} · ${authorName}`}</p>
    </header>
  );
}
