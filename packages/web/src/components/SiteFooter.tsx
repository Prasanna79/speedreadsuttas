export function SiteFooter() {
  return (
    <footer className="ui-panel-soft border-t px-4 py-4 text-xs" data-site-chrome="footer">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2">
        <p className="ui-muted">
          Content source: SuttaCentral (
          <a
            className="ui-link"
            href="https://suttacentral.net/licensing?lang=en"
            rel="noreferrer noopener"
            target="_blank"
          >
            CC0
          </a>
          )
        </p>
        <p className="ui-muted">
          App code license:{' '}
          <a
            className="ui-link"
            href="https://github.com/Prasanna79/speedreadsuttas/blob/main/LICENSE"
            rel="noreferrer noopener"
            target="_blank"
          >
            MIT
          </a>
        </p>
      </div>
    </footer>
  );
}
