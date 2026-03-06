import { useNavigate } from 'react-router-dom';

import { SearchInput } from '../components/SearchInput';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="inline-flex items-center gap-4">
        <img alt="" className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" src="/logo-square.png" />
        <h1 className="brand-wordmark text-5xl leading-none tracking-[0.01em] sm:text-7xl">
          SuttaSpeed
        </h1>
      </div>
      <p className="ui-muted text-lg">Speed-read the Pāli Canon.</p>
      <SearchInput onSelectUid={(uid) => navigate(`/read/${uid}`)} />
    </main>
  );
}
