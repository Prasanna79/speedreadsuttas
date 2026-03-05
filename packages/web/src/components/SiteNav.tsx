import { Link, NavLink } from 'react-router-dom';

export function SiteNav() {
  return (
    <header className="ui-panel-soft border-b px-4 py-3" data-site-chrome="nav">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <Link className="inline-flex items-center" to="/">
          <img alt="SuttaSpeed" className="h-7 w-auto" loading="eager" src="/logo-wordmark.png" />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <NavLink className="ui-link" to="/about">
            About
          </NavLink>
          <NavLink className="ui-link" to="/donate">
            Donate
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
