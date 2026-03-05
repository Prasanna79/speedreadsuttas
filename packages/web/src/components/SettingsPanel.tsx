import type { StoredPreferences } from '@palispeedread/shared';

interface SettingsPanelProps {
  preferences: StoredPreferences;
  onThemeToggle: () => void;
  onFontSizeChange: (size: StoredPreferences['fontSize']) => void;
}

export function SettingsPanel({ preferences, onThemeToggle, onFontSizeChange }: SettingsPanelProps) {
  return (
    <details className="ui-panel rounded p-3">
      <summary className="cursor-pointer text-sm font-semibold">Settings</summary>
      <div className="mt-3 grid gap-3">
        <button aria-label="Toggle dark mode" className="ui-button rounded px-3 py-2" type="button" onClick={onThemeToggle}>
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
      </div>
    </details>
  );
}
