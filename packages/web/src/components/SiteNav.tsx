import { Link, NavLink } from 'react-router-dom';

export function SiteNav() {
  return (
    <header className="ui-panel-soft border-b px-4 py-3" data-site-chrome="nav">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <Link aria-label="SuttaSpeed home" className="inline-flex items-center gap-2.5" to="/">
          <img alt="" className="h-9 w-9 shrink-0" loading="eager" src="/logo-square.png" />
          <span className="brand-wordmark text-[1.9rem] leading-none tracking-[0.01em] text-[var(--text-primary)]">
            SuttaSpeed
          </span>
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
