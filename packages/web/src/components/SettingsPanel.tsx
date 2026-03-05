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
    <details className="ui-panel rounded p-3">
      <summary className="cursor-pointer text-sm font-semibold">Settings</summary>
      <div className="mt-3 grid gap-3">
        <button
          aria-label="Toggle dark mode"
          className="ui-button rounded px-3 py-2"
          type="button"
          onClick={onThemeToggle}
        >
          Theme: {preferences.theme}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm ui-muted">Font size</span>
          {(['normal', 'large', 'xlarge'] as const).map((size) => (
            <button
              key={size}
              className={`rounded px-2 py-1 ${preferences.fontSize === size ? 'ui-button-active' : 'ui-button-inactive'}`}
              type="button"
              onClick={() => onFontSizeChange(size)}
            >
              {size}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm ui-muted">Font family</span>
          {(
            [
              { label: 'Serif', value: 'serif' },
              { label: 'Mono', value: 'mono' },
              { label: 'OpenDyslexic', value: 'openDyslexic' },
            ] as const
          ).map((family) => (
            <button
              key={family.value}
              className={`rounded px-2 py-1 ${
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
    </details>
  );
}
