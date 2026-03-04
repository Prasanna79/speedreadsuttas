export const WPM_MIN = 100;
export const WPM_MAX = 800;
export const WPM_DEFAULT = 250;
export const WPM_STEP = 25;

export const CHUNK_SIZE_DEFAULT = 1;
export const CHUNK_SIZE_MAX = 4;

export const PAUSE_SENTENCE = 2.5;
export const PAUSE_ELLIPSIS = 3.0;
export const PAUSE_CLAUSE = 1.5;
export const PAUSE_CLOSE_BRACKET = 1.3;
export const PAUSE_PARAGRAPH = 3.0;

export const LONG_WORD_THRESHOLD = 8;
export const LONG_WORD_BONUS = 0.1;

export const NIKAYA_ALIASES = new Map<string, string>([
  ['digha', 'dn'],
  ['digha nikaya', 'dn'],
  ['digha nikaya', 'dn'],
  ['dīgha', 'dn'],
  ['dīgha nikaya', 'dn'],
  ['dīgha nikāya', 'dn'],
  ['majjhima', 'mn'],
  ['majjhima nikaya', 'mn'],
  ['majjhima nikāya', 'mn'],
  ['samyutta', 'sn'],
  ['samyutta nikaya', 'sn'],
  ['samyutta nikāya', 'sn'],
  ['saṁyutta', 'sn'],
  ['saṁyutta nikaya', 'sn'],
  ['saṁyutta nikāya', 'sn'],
  ['anguttara', 'an'],
  ['anguttara nikaya', 'an'],
  ['anguttara nikāya', 'an'],
  ['aṅguttara', 'an'],
  ['aṅguttara nikaya', 'an'],
  ['aṅguttara nikāya', 'an'],
  ['khuddaka', 'kn'],
  ['khuddaka nikaya', 'kn'],
  ['khuddaka nikāya', 'kn'],
  ['khuddakapatha', 'kp'],
  ['khuddakapāṭha', 'kp'],
  ['dhammapada', 'dhp'],
  ['udana', 'ud'],
  ['udāna', 'ud'],
  ['itivuttaka', 'iti'],
  ['sutta nipata', 'snp'],
  ['sutta nipāta', 'snp'],
  ['theragatha', 'thag'],
  ['therāgāthā', 'thag'],
  ['therāgathā', 'thag'],
  ['therigatha', 'thig'],
  ['therīgāthā', 'thig'],
]);

// Index is word length, value is ORP character index.
export const ORP_TABLE: number[] = [
  0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4,
];
