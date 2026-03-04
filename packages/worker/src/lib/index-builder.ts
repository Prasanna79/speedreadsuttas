import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface SearchIndexEntry {
  uid: string;
  c: string;
  t: string;
  p: string;
  a: string[];
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

interface AuthorMeta {
  author_uid?: string;
  author_name?: string;
}

interface PublicationEdition {
  publisher?: string;
}

interface PublicationMeta {
  author_uid?: string;
  translation_lang?: string;
  licence?: string;
  licence_type?: string;
  edition?: PublicationEdition[];
}

interface TranslationFileRecord {
  uid: string;
  lang: string;
  author: string;
  filePath: string;
}

interface MetadataBundle {
  authors: Record<string, AuthorMeta>;
  publications: Record<string, PublicationMeta>;
}

export interface BuildIndexResult {
  searchIndex: SearchIndexEntry[];
  translationManifest: Record<string, TranslationOption[]>;
}

const SUPPORTED_COLLECTIONS = new Set(['dn', 'mn', 'sn', 'an', 'kp', 'dhp', 'ud', 'iti', 'snp', 'thag', 'thig']);

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  pli: 'Pāli',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  ru: 'Russian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
};

const ROOT_OPTION: TranslationOption = {
  lang: 'pli',
  langName: 'Pāli',
  author: 'ms',
  authorName: 'Mahāsaṅgīti Tipiṭaka',
  isRoot: true,
  publication: 'SuttaCentral',
  licence: 'CC0 1.0',
};

const ROOT_FILENAME_PATTERN = /^(?<uid>.+)_root-pli-ms\.json$/u;
const TRANSLATION_FILENAME_PATTERN =
  /^(?<uid>.+)_translation-(?<lang>[a-z0-9-]+)-(?<author>[a-z0-9-]+)\.json$/u;

const toPosixPath = (value: string): string => value.split(path.sep).join('/');

const isJsonFile = (filename: string): boolean => filename.endsWith('.json');

const collapseWhitespace = (value: string): string => value.replace(/\s+/gu, ' ').trim();

export const stripDiacritics = (value: string): string => value.normalize('NFD').replace(/\p{M}/gu, '');

const normalizeAliasToken = (value: string): string =>
  stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

const parseCollection = (uid: string): string | null => {
  const match = uid.match(/^([a-z]+)/u);
  if (!match) {
    return null;
  }
  const collection = match[1].toLowerCase();
  return SUPPORTED_COLLECTIONS.has(collection) ? collection : null;
};

const sortKeysBySegment = (keys: string[]): string[] => {
  return [...keys].sort((left, right) => {
    const leftSuffix = left.includes(':') ? left.split(':').slice(1).join(':') : left;
    const rightSuffix = right.includes(':') ? right.split(':').slice(1).join(':') : right;

    const leftParts = leftSuffix.split('.').map((piece) => Number(piece));
    const rightParts = rightSuffix.split('.').map((piece) => Number(piece));
    const maxLength = Math.max(leftParts.length, rightParts.length);

    for (let index = 0; index < maxLength; index += 1) {
      const leftValue = Number.isFinite(leftParts[index]) ? leftParts[index] : 0;
      const rightValue = Number.isFinite(rightParts[index]) ? rightParts[index] : 0;
      if (leftValue !== rightValue) {
        return leftValue - rightValue;
      }
    }

    return left.localeCompare(right);
  });
};

async function walkJsonFiles(directory: string): Promise<string[]> {
  const output: string[] = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await walkJsonFiles(entryPath)));
      continue;
    }
    if (entry.isFile() && isJsonFile(entry.name)) {
      output.push(entryPath);
    }
  }

  return output;
}

async function loadJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

async function loadMetadata(bilaraDataDir: string): Promise<MetadataBundle> {
  const authorPath = path.join(bilaraDataDir, '_author.json');
  const publicationPath = path.join(bilaraDataDir, '_publication.json');

  try {
    const [authors, publications] = await Promise.all([
      loadJsonFile<Record<string, AuthorMeta>>(authorPath),
      loadJsonFile<Record<string, PublicationMeta>>(publicationPath),
    ]);
    return { authors, publications };
  } catch {
    return { authors: {}, publications: {} };
  }
}

export function extractTitleFromSegments(uid: string, segments: Record<string, string>): string {
  const preferredKey = `${uid}:0.2`;
  const preferred = collapseWhitespace(segments[preferredKey] ?? '');
  if (preferred) {
    return preferred;
  }

  const orderedKeys = sortKeysBySegment(Object.keys(segments));
  for (const key of orderedKeys) {
    const value = collapseWhitespace(segments[key] ?? '');
    if (value) {
      return value;
    }
  }

  return uid.toUpperCase();
}

export function buildAliases(titles: string[]): string[] {
  const aliases = new Set<string>();

  for (const title of titles) {
    const normalized = normalizeAliasToken(title);
    if (!normalized) {
      continue;
    }

    aliases.add(normalized);
    aliases.add(normalized.replace(/\s+/gu, ''));
  }

  return [...aliases];
}

export function normalizeLicence(licence: string | undefined): string {
  if (!licence) {
    return 'CC0 1.0';
  }
  const lower = licence.toLowerCase();
  if (lower.includes('creativecommons.org/publicdomain/zero/1.0') || lower.includes('cc0')) {
    return 'CC0 1.0';
  }
  return licence;
}

const resolveLanguageName = (lang: string): string => LANGUAGE_NAMES[lang] ?? lang.toUpperCase();

function buildPublicationLookup(publications: Record<string, PublicationMeta>): Map<string, PublicationMeta> {
  const lookup = new Map<string, PublicationMeta>();

  for (const publication of Object.values(publications)) {
    const author = publication.author_uid;
    if (!author) {
      continue;
    }

    const lang = publication.translation_lang;
    if (lang) {
      lookup.set(`${author}:${lang}`, publication);
      continue;
    }

    lookup.set(`${author}:*`, publication);
  }

  return lookup;
}

export function buildTranslationOption(
  lang: string,
  author: string,
  metadata: MetadataBundle,
  isRoot: boolean,
): TranslationOption {
  if (isRoot) {
    return ROOT_OPTION;
  }

  const publicationLookup = buildPublicationLookup(metadata.publications);
  const publication = publicationLookup.get(`${author}:${lang}`) ?? publicationLookup.get(`${author}:*`);
  const authorName = metadata.authors[author]?.author_name ?? author;

  return {
    lang,
    langName: resolveLanguageName(lang),
    author,
    authorName,
    isRoot: false,
    publication: publication?.edition?.[0]?.publisher ?? 'SuttaCentral',
    licence: normalizeLicence(publication?.licence_type ?? publication?.licence),
  };
}

function sortTranslationOptions(options: TranslationOption[]): TranslationOption[] {
  return [...options].sort((left, right) => {
    const score = (option: TranslationOption): number => {
      if (option.lang === 'en' && option.author === 'sujato') {
        return 0;
      }
      if (option.isRoot) {
        return 2;
      }
      return 1;
    };

    return (
      score(left) - score(right) ||
      left.lang.localeCompare(right.lang) ||
      left.author.localeCompare(right.author)
    );
  });
}

async function discoverRootFiles(bilaraDataDir: string): Promise<Map<string, string>> {
  const rootDir = path.join(bilaraDataDir, 'root', 'pli', 'ms', 'sutta');
  const files = await walkJsonFiles(rootDir);

  const output = new Map<string, string>();
  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const match = fileName.match(ROOT_FILENAME_PATTERN);
    const uid = match?.groups?.uid;
    if (!uid) {
      continue;
    }

    const collection = parseCollection(uid);
    if (!collection) {
      continue;
    }

    output.set(uid, filePath);
  }

  return output;
}

async function discoverTranslationFiles(bilaraDataDir: string): Promise<Map<string, TranslationFileRecord[]>> {
  const translationDir = path.join(bilaraDataDir, 'translation');
  const files = await walkJsonFiles(translationDir);

  const output = new Map<string, TranslationFileRecord[]>();
  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const match = fileName.match(TRANSLATION_FILENAME_PATTERN);
    const uid = match?.groups?.uid;
    const lang = match?.groups?.lang;
    const author = match?.groups?.author;
    if (!uid || !lang || !author) {
      continue;
    }

    if (!parseCollection(uid)) {
      continue;
    }

    const current = output.get(uid) ?? [];
    current.push({ uid, lang, author, filePath });
    output.set(uid, current);
  }

  return output;
}

async function loadSegments(filePath: string): Promise<Record<string, string>> {
  return loadJsonFile<Record<string, string>>(filePath);
}

function resolvePreferredEnglishTranslation(files: TranslationFileRecord[]): TranslationFileRecord | undefined {
  const sujato = files.find((entry) => entry.lang === 'en' && entry.author === 'sujato');
  if (sujato) {
    return sujato;
  }
  return files.find((entry) => entry.lang === 'en');
}

export async function buildIndexDataFromBilara(bilaraDataDir: string): Promise<BuildIndexResult> {
  const metadata = await loadMetadata(bilaraDataDir);
  const rootFiles = await discoverRootFiles(bilaraDataDir);
  const translationFilesByUid = await discoverTranslationFiles(bilaraDataDir);

  const searchIndex: SearchIndexEntry[] = [];
  const translationManifest: Record<string, TranslationOption[]> = {};

  const uids = [...rootFiles.keys()].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  for (const uid of uids) {
    const rootFilePath = rootFiles.get(uid);
    if (!rootFilePath) {
      continue;
    }

    const collection = parseCollection(uid);
    if (!collection) {
      continue;
    }

    const rootSegments = await loadSegments(rootFilePath);
    const paliTitle = extractTitleFromSegments(uid, rootSegments);
    const translationFiles = translationFilesByUid.get(uid) ?? [];

    const optionsMap = new Map<string, TranslationOption>();
    optionsMap.set('pli:ms', ROOT_OPTION);

    for (const translationFile of translationFiles) {
      const key = `${translationFile.lang}:${translationFile.author}`;
      if (!optionsMap.has(key)) {
        optionsMap.set(
          key,
          buildTranslationOption(translationFile.lang, translationFile.author, metadata, false),
        );
      }
    }

    const options = sortTranslationOptions([...optionsMap.values()]);
    translationManifest[uid] = options;

    let englishTitle = paliTitle;
    const preferredEnglish = resolvePreferredEnglishTranslation(translationFiles);
    if (preferredEnglish) {
      const englishSegments = await loadSegments(preferredEnglish.filePath);
      englishTitle = extractTitleFromSegments(uid, englishSegments);
    }

    const aliases = buildAliases([englishTitle, paliTitle]);
    searchIndex.push({
      uid,
      c: collection,
      t: englishTitle,
      p: paliTitle,
      a: aliases,
    });
  }

  return {
    searchIndex,
    translationManifest,
  };
}

export async function writeIndexArtifacts(
  result: BuildIndexResult,
  outputDir: string,
): Promise<{ searchIndexPath: string; translationManifestPath: string }> {
  await mkdir(outputDir, { recursive: true });
  const searchIndexPath = path.join(outputDir, 'search-index.json');
  const translationManifestPath = path.join(outputDir, 'translation-manifest.json');

  await Promise.all([
    writeFile(searchIndexPath, `${JSON.stringify(result.searchIndex, null, 2)}\n`, 'utf8'),
    writeFile(translationManifestPath, `${JSON.stringify(result.translationManifest, null, 2)}\n`, 'utf8'),
  ]);

  return {
    searchIndexPath: toPosixPath(searchIndexPath),
    translationManifestPath: toPosixPath(translationManifestPath),
  };
}
