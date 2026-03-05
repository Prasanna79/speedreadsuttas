export interface Segment {
  id: string;
  text: string;
}

export interface Token {
  word: string;
  index: number;
  segmentId: string;
  isParagraphStart: boolean;
  trailingPunctuation: string;
}

export interface TranslationOption {
  lang: string;
  langName: string;
  author: string;
  authorName: string;
  isRoot: boolean;
  publication: string;
  licence: string;
}

export interface SearchIndexEntry {
  uid: string;
  c: string;
  t: string;
  p: string;
  a: string[];
}

export interface StoredPreferences {
  wpm: number;
  chunkSize: number;
  theme: 'light' | 'dark';
  fontSize: 'normal' | 'large' | 'xlarge';
  fontFamily: 'serif' | 'mono' | 'openDyslexic';
  focusMode: boolean;
}

export interface LastRead {
  uid: string;
  lang: string;
  author: string;
  position: number;
  timestamp: number;
}

export interface SuttaMeta {
  uid: string;
  collection: string;
  title: string;
  translations: TranslationOption[];
}
