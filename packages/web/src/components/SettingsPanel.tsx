import type { StoredPreferences } from '@palispeedread/shared';

interface SettingsPanelProps {
  preferences: StoredPreferences;
  onThemeToggle: () => void;
  onFontSizeChange: (size: StoredPreferences['fontSize']) => void;
}

export function SettingsPanel({ preferences, onThemeToggle, onFontSizeChange }: SettingsPanelProps) {
  return (
    <details className="rounded border border-stone-200 bg-white p-3">
      <summary className="cursor-pointer text-sm font-semibold">Settings</summary>
      <div className="mt-3 grid gap-3">
        <button aria-label="Toggle dark mode" className="rounded border px-3 py-2" type="button" onClick={onThemeToggle}>
          Theme: {preferences.theme}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm">Font size</span>
          {(['normal', 'large', 'xlarge'] as const).map((size) => (
            <button
              key={size}
              className={`rounded border px-2 py-1 ${preferences.fontSize === size ? 'bg-orange-500 text-white' : 'bg-white'}`}
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
