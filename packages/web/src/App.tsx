import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ReaderPage } from './pages/ReaderPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
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
