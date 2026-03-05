import {
  CHUNK_SIZE_DEFAULT,
  WPM_DEFAULT,
  type StoredPreferences,
} from '@palispeedread/shared';

export const PREFERENCES_KEY = 'palispeedread:preferences';
export const LAST_READ_KEY = 'palispeedread:last-read';

export const DEFAULT_PREFERENCES: StoredPreferences = {
  wpm: WPM_DEFAULT,
  chunkSize: CHUNK_SIZE_DEFAULT,
  theme: 'light',
  fontSize: 'normal',
};
