import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ReaderPage } from './pages/ReaderPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-b from-stone-50 via-amber-50 to-orange-100 text-stone-900 dark:from-stone-900 dark:via-stone-900 dark:to-stone-800 dark:text-stone-100">
        <Routes>
          <Route element={<HomePage />} path="/" />
          <Route element={<ReaderPage />} path="/read/:uid" />
          <Route element={<ReaderPage />} path="/read/:uid/:lang/:author" />
          <Route element={<NotFoundPage />} path="*" />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
