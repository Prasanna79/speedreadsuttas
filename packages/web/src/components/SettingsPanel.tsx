import type { StoredPreferences } from '@palispeedread/shared';

interface SettingsPanelProps {
  preferences: StoredPreferences;
  onThemeToggle: () => void;
  onFontSizeChange: (size: StoredPreferences['fontSize']) => void;
  onFontFamilyChange: (family: StoredPreferences['fontFamily']) => void;
}

export function SettingsPanel({
  preferences,
  onThemeToggle,
  onFontSizeChange,
  onFontFamilyChange,
}: SettingsPanelProps) {
  return (
    <section aria-label="Reader settings" className="ui-panel rounded p-3">
      <div className="grid gap-2">
        <button
          aria-label="Toggle dark mode"
          className="ui-button w-fit rounded px-3 py-1 text-sm"
          type="button"
          onClick={onThemeToggle}
        >
          Theme: {preferences.theme === 'dark' ? 'Dark' : 'Light'}
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm ui-muted">Size</span>
          {(['normal', 'large', 'xlarge'] as const).map((size) => (
            <button
              key={size}
              className={`rounded px-2 py-0.5 text-sm ${preferences.fontSize === size ? 'ui-button-active' : 'ui-button-inactive'}`}
              type="button"
              onClick={() => onFontSizeChange(size)}
            >
              {size}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm ui-muted">Font</span>
          {(
            [
              { label: 'Serif', value: 'serif' },
              { label: 'Mono', value: 'mono' },
              { label: 'OpenDyslexic', value: 'openDyslexic' },
            ] as const
          ).map((family) => (
            <button
              key={family.value}
              className={`rounded px-2 py-0.5 text-sm ${
                preferences.fontFamily === family.value ? 'ui-button-active' : 'ui-button-inactive'
              } ${
                family.value === 'serif'
                  ? 'reader-font-serif'
                  : family.value === 'mono'
                    ? 'reader-font-mono'
                    : 'reader-font-dyslexic'
              }`}
              type="button"
              onClick={() => onFontFamilyChange(family.value)}
            >
              {family.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
