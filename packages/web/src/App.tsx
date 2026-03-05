import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { SiteFooter } from './components/SiteFooter';
import { SiteNav } from './components/SiteNav';
import { AboutPage } from './pages/AboutPage';
import { DonatePage } from './pages/DonatePage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ReaderPage } from './pages/ReaderPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <SiteNav />
        <div className="flex-1">
          <Routes>
            <Route element={<HomePage />} path="/" />
            <Route element={<AboutPage />} path="/about" />
            <Route element={<DonatePage />} path="/donate" />
            <Route element={<ReaderPage />} path="/read/:uid" />
            <Route element={<ReaderPage />} path="/read/:uid/:lang/:author" />
            <Route element={<NotFoundPage />} path="*" />
          </Routes>
        </div>
        <SiteFooter />
      </div>
    </BrowserRouter>
  );
}
