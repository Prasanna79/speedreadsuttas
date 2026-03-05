export function DonatePage() {
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Support SuttaCentral</h1>
        <p className="ui-muted">
          SuttaSpeed depends on SuttaCentral’s open canon and translation work. If this app helps your study, please
          support SuttaCentral directly.
        </p>
      </header>

      <section className="ui-panel rounded p-5">
        <a
          className="ui-button-accent inline-block rounded px-4 py-2"
          href="https://suttacentral.net/donate?lang=en"
          rel="noreferrer noopener"
          target="_blank"
        >
          Donate to SuttaCentral
        </a>
        <p className="ui-muted mt-3 text-sm">
          Donations are handled by SuttaCentral. This app does not process payments.
        </p>
      </section>
    </main>
  );
}
