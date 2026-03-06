function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="ui-link underline underline-offset-2">
      {children}
    </a>
  );
}

export function AboutPage() {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">About SuttaSpeed</h1>
        <p className="ui-muted">
          SuttaSpeed is a focused RSVP reader for early Buddhist texts, optimized for adjustable pace, chunking, and
          minimal distraction.
        </p>
      </header>

      <section className="ui-panel rounded p-4">
        <h2 className="text-lg font-semibold">What You Can Do</h2>
        <ul className="ui-muted mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Read suttas at 100–800 WPM with real-time speed control.</li>
          <li>Change chunk size (1–4 words), theme, and font size.</li>
          <li>Switch translation or language for the same sutta while reading.</li>
          <li>Jump directly to any sutta with search or a SuttaCentral URL.</li>
        </ul>
      </section>

      <section className="ui-panel rounded p-4">
        <h2 className="text-lg font-semibold">Coverage</h2>
        <p className="ui-muted mt-2 text-sm">
          Text data comes from{' '}
          <ExtLink href="https://suttacentral.net">SuttaCentral</ExtLink>'s open{' '}
          <ExtLink href="https://github.com/suttacentral/bilara-data">bilara-data</ExtLink>{' '}
          repository. Collections include DN, MN, SN, AN, and Khuddaka Nikāya texts (Dhp, Ud, Iti, Snp, Thag, Thig,
          and more), with translation availability varying by sutta and author.
        </p>
      </section>

      <section className="ui-panel rounded p-4 space-y-3">
        <h2 className="text-lg font-semibold">Getting Started with the Suttas</h2>
        <p className="ui-muted text-sm">
          New to the Pāli Canon? These introductions by Bhikkhu Sujato on SuttaCentral are an excellent starting point:
        </p>
        <ul className="ui-muted list-disc space-y-1 pl-5 text-sm">
          <li>
            <ExtLink href="https://suttacentral.net/dn-guide-sujato">Long Discourses (DN) — Guide</ExtLink>
          </li>
          <li>
            <ExtLink href="https://suttacentral.net/mn-guide-sujato">Middle Discourses (MN) — Guide</ExtLink>
          </li>
          <li>
            <ExtLink href="https://suttacentral.net/sn-guide-sujato">Linked Discourses (SN) — Guide</ExtLink>
          </li>
          <li>
            <ExtLink href="https://suttacentral.net/an-guide-sujato">Numbered Discourses (AN) — Guide</ExtLink>
          </li>
        </ul>
      </section>

      <section className="ui-panel rounded p-4 space-y-3">
        <h2 className="text-lg font-semibold">Recommended Books</h2>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Bhikkhu Sujato</h3>
          <ul className="ui-muted list-disc space-y-1 pl-5 text-sm">
            <li>
              <ExtLink href="https://suttacentral.net/editions">
                <em>Numbered Discourses</em>, <em>Middle Discourses</em>, <em>Linked Discourses</em>, <em>Long
                Discourses</em>
              </ExtLink>{' '}
              — free modern English translations (SuttaCentral Editions)
            </li>
            <li>
              <ExtLink href="https://suttacentral.net/an-introduction-bodhi">
                <em>A History of Mindfulness</em>
              </ExtLink>{' '}
              — on the development of the Satipaṭṭhāna Sutta
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Bhikkhu Bodhi</h3>
          <ul className="ui-muted list-disc space-y-1 pl-5 text-sm">
            <li>
              <em>In the Buddha's Words: An Anthology of Discourses from the Pāli Canon</em> — thematic anthology,
              great entry point
            </li>
            <li>
              <em>The Middle Length Discourses of the Buddha</em> (Majjhima Nikāya) — complete translation with notes
            </li>
            <li>
              <em>The Connected Discourses of the Buddha</em> (Saṁyutta Nikāya) — complete translation
            </li>
            <li>
              <em>The Numerical Discourses of the Buddha</em> (Aṅguttara Nikāya) — complete translation
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Maurice Walshe</h3>
          <ul className="ui-muted list-disc space-y-1 pl-5 text-sm">
            <li>
              <em>The Long Discourses of the Buddha</em> (Dīgha Nikāya) — complete translation
            </li>
          </ul>
        </div>
      </section>

      <section className="ui-panel rounded p-4 space-y-3">
        <h2 className="text-lg font-semibold">Further Reading</h2>
        <ul className="ui-muted list-disc space-y-1 pl-5 text-sm">
          <li>
            <ExtLink href="https://en.wikipedia.org/wiki/P%C4%81li_Canon">Pāli Canon</ExtLink> — Wikipedia overview of
            the Tipiṭaka
          </li>
          <li>
            <ExtLink href="https://en.wikipedia.org/wiki/Sutta_Pitaka">Sutta Piṭaka</ExtLink> — Wikipedia overview of
            the discourse collections
          </li>
          <li>
            <ExtLink href="https://suttacentral.net/start">Getting Started on SuttaCentral</ExtLink> — beginner guide
          </li>
          <li>
            <ExtLink href="https://www.accesstoinsight.org/">Access to Insight</ExtLink> — classic sutta translation
            archive (Ṭhānissaro Bhikkhu and others)
          </li>
          <li>
            <ExtLink href="https://www.dhammatalks.org/suttas/index.html">dhammatalks.org</ExtLink> — Ṭhānissaro
            Bhikkhu's sutta translations and study guides
          </li>
          <li>
            <ExtLink href="https://readingfaithfully.org/">Reading Faithfully</ExtLink> — curated sutta reading lists
            and study resources
          </li>
        </ul>
      </section>

      <footer className="ui-muted text-center text-xs">
        Text data from{' '}
        <ExtLink href="https://suttacentral.net">SuttaCentral</ExtLink>.
        SuttaSpeed is{' '}
        <ExtLink href="https://github.com/Prasanna79/speedreadsuttas">open source</ExtLink>.
      </footer>
    </main>
  );
}
