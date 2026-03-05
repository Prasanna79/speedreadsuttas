export function AboutPage() {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">About SuttaSpeed</h1>
        <p className="ui-muted">
          SuttaSpeed is a focused RSVP reader for early Buddhist texts, optimized for adjustable pace, chunking, and
          minimal distraction.
        </p>
      </header>

      <section className="ui-panel rounded p-4">
        <h2 className="text-lg font-semibold">What You Can Do</h2>
        <ul className="ui-muted mt-2 space-y-1 text-sm">
          <li>Read suttas with 100–800 WPM controls.</li>
          <li>Change chunk size (1–4 words), theme, and font size.</li>
          <li>Switch translation/language for the same sutta while reading.</li>
          <li>Jump directly to any sutta with search.</li>
        </ul>
      </section>

      <section className="ui-panel rounded p-4">
        <h2 className="text-lg font-semibold">Coverage</h2>
        <p className="ui-muted mt-2 text-sm">
          Catalog coverage is sourced from SuttaCentral data. Collections include DN, MN, SN, AN, and KN families,
          with translation availability varying by sutta and author.
        </p>
      </section>
    </main>
  );
}
