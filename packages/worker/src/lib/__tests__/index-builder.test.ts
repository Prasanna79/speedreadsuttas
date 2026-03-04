import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildAliases,
  buildIndexDataFromBilara,
  buildTranslationOption,
  extractTitleFromSegments,
  normalizeLicence,
  writeIndexArtifacts,
} from '../index-builder';

const fixtureDir = path.resolve(
  process.cwd(),
  'src/lib/__tests__/fixtures/bilara-mini',
);

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map(async (dir) => {
      await rm(dir, { recursive: true, force: true });
    }),
  );
  tempDirs.length = 0;
});

describe('index-builder helpers', () => {
  it('extracts title from :0.2 and falls back to first non-empty segment', () => {
    expect(
      extractTitleFromSegments('mn1', {
        'mn1:0.1': 'Header ',
        'mn1:0.2': 'Title ',
        'mn1:1.1': 'Body',
      }),
    ).toBe('Title');

    expect(
      extractTitleFromSegments('mn2', {
        'mn2:0.1': 'Fallback title ',
        'mn2:1.1': 'Body',
      }),
    ).toBe('Fallback title');
  });

  it('builds normalized aliases and normalizes licence values', () => {
    expect(buildAliases(['Mūlapariyāyasutta', 'The Root of All Things'])).toEqual([
      'mulapariyayasutta',
      'the root of all things',
      'therootofallthings',
    ]);
    expect(normalizeLicence('https://creativecommons.org/publicdomain/zero/1.0/')).toBe('CC0 1.0');
    expect(normalizeLicence('CC-BY 4.0')).toBe('CC-BY 4.0');
  });

  it('builds translation option using metadata fallbacks', () => {
    const option = buildTranslationOption(
      'en',
      'sujato',
      {
        authors: { sujato: { author_name: 'Bhikkhu Sujato' } },
        publications: {
          pub: {
            author_uid: 'sujato',
            translation_lang: 'en',
            licence_type: 'CC0 1.0',
            edition: [{ publisher: 'SuttaCentral' }],
          },
        },
      },
      false,
    );

    expect(option).toEqual({
      lang: 'en',
      langName: 'English',
      author: 'sujato',
      authorName: 'Bhikkhu Sujato',
      isRoot: false,
      publication: 'SuttaCentral',
      licence: 'CC0 1.0',
    });
  });
});

describe('buildIndexDataFromBilara', () => {
  it('builds search index + translation manifest from fixture data', async () => {
    const result = await buildIndexDataFromBilara(fixtureDir);

    expect(result.searchIndex.map((entry) => entry.uid)).toEqual([
      'an4.159',
      'dhp1-20',
      'mn1',
      'mn2',
      'sn12.2',
      'thag1.1',
    ]);

    expect(result.searchIndex.find((entry) => entry.uid === 'mn1')).toEqual({
      uid: 'mn1',
      c: 'mn',
      t: 'The Root of All Things',
      p: 'Mūlapariyāyasutta',
      a: ['the root of all things', 'therootofallthings', 'mulapariyayasutta'],
    });

    expect(result.translationManifest['mn1']).toEqual([
      {
        lang: 'en',
        langName: 'English',
        author: 'sujato',
        authorName: 'Bhikkhu Sujato',
        isRoot: false,
        publication: 'SuttaCentral',
        licence: 'CC0 1.0',
      },
      {
        lang: 'de',
        langName: 'German',
        author: 'sabbamitta',
        authorName: 'Sabbamitta',
        isRoot: false,
        publication: 'SuttaCentral',
        licence: 'CC0 1.0',
      },
      {
        lang: 'pli',
        langName: 'Pāli',
        author: 'ms',
        authorName: 'Mahāsaṅgīti Tipiṭaka',
        isRoot: true,
        publication: 'SuttaCentral',
        licence: 'CC0 1.0',
      },
    ]);

    expect(result.translationManifest['mn2']).toEqual([
      {
        lang: 'pli',
        langName: 'Pāli',
        author: 'ms',
        authorName: 'Mahāsaṅgīti Tipiṭaka',
        isRoot: true,
        publication: 'SuttaCentral',
        licence: 'CC0 1.0',
      },
    ]);
  });

  it('writes generated artifacts to output directory', async () => {
    const outputDir = await mkdtemp(path.join(os.tmpdir(), 'index-artifacts-'));
    tempDirs.push(outputDir);

    const result = await buildIndexDataFromBilara(fixtureDir);
    const paths = await writeIndexArtifacts(result, outputDir);

    const indexRaw = await readFile(path.join(outputDir, 'search-index.json'), 'utf8');
    const manifestRaw = await readFile(path.join(outputDir, 'translation-manifest.json'), 'utf8');

    expect(paths.searchIndexPath.endsWith('/search-index.json')).toBe(true);
    expect(paths.translationManifestPath.endsWith('/translation-manifest.json')).toBe(true);
    expect(JSON.parse(indexRaw)).toHaveLength(6);
    expect(JSON.parse(manifestRaw)['sn12.2'][0].author).toBe('sujato');
  });
});
