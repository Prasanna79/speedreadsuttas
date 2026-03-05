import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TranslationOption } from '@palispeedread/shared';

import { fetchSuttaMeta } from '../lib/api';

interface TranslationChooserProps {
  uid: string;
}

export function TranslationChooser({ uid }: TranslationChooserProps) {
  const navigate = useNavigate();
  const [translations, setTranslations] = useState<TranslationOption[]>([]);
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    fetchSuttaMeta(uid)
      .then((meta) => {
        setTranslations(meta.translations);
      })
      .catch(() => {
        setTranslations([]);
      });
  }, [uid]);

  useEffect(() => {
    if (translations.length === 0) {
      return;
    }

    const preferred =
      translations.find((option) => option.lang === 'en' && option.author === 'sujato') ?? translations[0];
    setSelected(`${preferred.lang}:${preferred.author}`);
  }, [translations]);

  const grouped = useMemo(() => {
    return translations.reduce<Record<string, TranslationOption[]>>((groups, option) => {
      groups[option.langName] = groups[option.langName] ?? [];
      groups[option.langName].push(option);
      return groups;
    }, {});
  }, [translations]);

  return (
    <section className="ui-panel grid gap-4 rounded p-5">
      <h2 className="text-xl font-semibold">Choose translation</h2>
      {Object.entries(grouped).map(([lang, options]) => (
        <fieldset key={lang} className="grid gap-2">
          <legend className="text-sm font-semibold ui-muted">{lang}</legend>
          {options.map((option) => {
            const key = `${option.lang}:${option.author}`;
            return (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  checked={selected === key}
                  name="translation"
                  type="radio"
                  value={key}
                  onChange={() => setSelected(key)}
                />
                <span>{option.authorName}</span>
              </label>
            );
          })}
        </fieldset>
      ))}

      <button
        className="ui-button-accent rounded px-4 py-2"
        type="button"
        onClick={() => {
          const [lang, author] = selected.split(':');
          if (!lang || !author) {
            return;
          }
          navigate(`/read/${uid}/${lang}/${author}`);
        }}
      >
        Start Reading
      </button>
    </section>
  );
}
