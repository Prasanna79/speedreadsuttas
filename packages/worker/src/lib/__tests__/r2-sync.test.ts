import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  collectBilaraTextFiles,
  diffSyncManifest,
  hashFile,
  loadSyncManifest,
  syncBilaraToR2,
  writeSyncManifest,
} from '../r2-sync';

const tempDirs: string[] = [];

async function createFixture(): Promise<{ bilaraDir: string; statePath: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'r2-sync-'));
  tempDirs.push(root);

  const bilaraDir = path.join(root, 'bilara');
  const statePath = path.join(root, '.cache', 'manifest.json');

  await mkdir(path.join(bilaraDir, 'root/pli/ms/sutta/mn'), { recursive: true });
  await mkdir(path.join(bilaraDir, 'translation/en/sujato/sutta/mn'), { recursive: true });

  await writeFile(
    path.join(bilaraDir, 'root/pli/ms/sutta/mn/mn1_root-pli-ms.json'),
    JSON.stringify({ 'mn1:0.2': 'Mūlapariyāya' }),
    { encoding: 'utf8' },
  );

  await writeFile(
    path.join(bilaraDir, 'translation/en/sujato/sutta/mn/mn1_translation-en-sujato.json'),
    JSON.stringify({ 'mn1:0.2': 'The Root of All Things' }),
    { encoding: 'utf8' },
  );

  return { bilaraDir, statePath };
}

afterEach(async () => {
  await Promise.all(tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('r2-sync', () => {
  it('hashes files and discovers text json keys', async () => {
    const { bilaraDir } = await createFixture();
    const files = await collectBilaraTextFiles(bilaraDir);

    expect(files.map((entry) => entry.key)).toEqual([
      'root/pli/ms/sutta/mn/mn1_root-pli-ms.json',
      'translation/en/sujato/sutta/mn/mn1_translation-en-sujato.json',
    ]);
    expect(files.every((entry) => entry.hash.length === 64)).toBe(true);

    const directHash = await hashFile(path.join(bilaraDir, files[0].key));
    expect(directHash).toBe(files[0].hash);
  });

  it('diffs manifests correctly', () => {
    const diff = diffSyncManifest(
      {
        files: {
          'a.json': 'old-hash',
          'removed.json': 'x',
        },
      },
      [
        { key: 'a.json', filePath: '/tmp/a.json', hash: 'new-hash' },
        { key: 'b.json', filePath: '/tmp/b.json', hash: 'b-hash' },
      ],
    );

    expect(diff.toUpload.map((entry) => entry.key)).toEqual(['a.json', 'b.json']);
    expect(diff.unchanged).toBe(0);
    expect(diff.removed).toEqual(['removed.json']);
  });

  it('syncs only changed files and persists manifest', async () => {
    const { bilaraDir, statePath } = await createFixture();
    const uploader = vi.fn(async () => Promise.resolve());

    const first = await syncBilaraToR2({
      bilaraDataDir: bilaraDir,
      bucket: 'test-bucket',
      stateFilePath: statePath,
      uploader,
    });

    expect(first.uploaded).toBe(2);
    expect(uploader).toHaveBeenCalledTimes(2);

    const second = await syncBilaraToR2({
      bilaraDataDir: bilaraDir,
      bucket: 'test-bucket',
      stateFilePath: statePath,
      uploader,
    });

    expect(second.uploaded).toBe(0);

    await writeFile(
      path.join(bilaraDir, 'translation/en/sujato/sutta/mn/mn1_translation-en-sujato.json'),
      JSON.stringify({ 'mn1:0.2': 'The Root of Existence' }),
      'utf8',
    );

    const third = await syncBilaraToR2({
      bilaraDataDir: bilaraDir,
      bucket: 'test-bucket',
      stateFilePath: statePath,
      uploader,
    });

    expect(third.uploaded).toBe(1);

    const manifest = await loadSyncManifest(statePath);
    expect(Object.keys(manifest.files)).toHaveLength(2);
  });

  it('supports dry-run mode without uploads', async () => {
    const { bilaraDir, statePath } = await createFixture();
    const uploader = vi.fn(async () => Promise.resolve());

    const result = await syncBilaraToR2({
      bilaraDataDir: bilaraDir,
      bucket: 'test-bucket',
      stateFilePath: statePath,
      dryRun: true,
      uploader,
    });

    expect(result.uploaded).toBe(2);
    expect(uploader).not.toHaveBeenCalled();

    const manifest = await loadSyncManifest(statePath);
    expect(Object.keys(manifest.files)).toHaveLength(2);

    await writeSyncManifest(statePath, []);
    const cleared = await loadSyncManifest(statePath);
    expect(cleared.files).toEqual({});
  });
});
