import { useNavigate } from 'react-router-dom';

import { SearchInput } from '../components/SearchInput';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-serif text-6xl tracking-tight">SuttaSpeed</h1>
      <p className="ui-muted text-lg">Speed-read the Pāli Canon.</p>
      <SearchInput onSelectUid={(uid) => navigate(`/read/${uid}`)} />
      <p className="ui-muted text-xs">Content credit: SuttaCentral (CC0).</p>
    </main>
  );
}
