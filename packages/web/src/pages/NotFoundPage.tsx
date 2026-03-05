import { Link, useNavigate } from 'react-router-dom';

import { SearchInput } from '../components/SearchInput';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <main className="mx-auto grid min-h-screen max-w-3xl place-items-center gap-4 px-6 py-12 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="text-stone-600">Try searching for a sutta UID or title.</p>
      </div>
      <SearchInput onSelectUid={(uid) => navigate(`/read/${uid}`)} />
      <Link className="text-sm text-orange-600 underline" to="/">
        Go home
      </Link>
    </main>
  );
}
