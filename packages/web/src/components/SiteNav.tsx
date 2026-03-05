import { Link, NavLink } from 'react-router-dom';

export function SiteNav() {
  return (
    <header className="ui-panel-soft border-b px-4 py-3">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <Link className="font-serif text-lg font-semibold tracking-tight" to="/">
          SuttaSpeed
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
