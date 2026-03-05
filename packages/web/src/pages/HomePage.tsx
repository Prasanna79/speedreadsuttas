import { useNavigate } from 'react-router-dom';

import { SearchInput } from '../components/SearchInput';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-serif text-6xl tracking-tight text-stone-900">PaliSpeedRead</h1>
      <p className="text-lg text-stone-600">Speed-read the Pāli Canon.</p>
      <SearchInput onSelectUid={(uid) => navigate(`/read/${uid}`)} />
      <p className="text-xs text-stone-500">Content credit: SuttaCentral (CC0).</p>
    </main>
  );
}
