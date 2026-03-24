import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  SYNC_SHA_KEY,
  collectAllTextFiles,
  countTrackedTextFiles,
  getGitDiffFiles,
  getHeadCommit,
  getLastSyncedCommit,
  isAncestor,
  saveLastSyncedCommit,
  syncBilaraToR2,
} from '../r2-sync';

const execFileAsync = promisify(execFile);

const tempDirs: string[] = [];

async function git(cwd: string, ...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd });
  return stdout.trim();
}

async function createGitFixture(opts?: {
  withSecondCommit?: boolean;
  deleteFile?: boolean;
  addNonTextFile?: boolean;
}): Promise<{ bilaraDir: string; initialSha: string; headSha: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'r2-sync-'));
  tempDirs.push(root);

  const bilaraDir = root;

  await git(bilaraDir, 'init');
  await git(bilaraDir, 'config', 'user.email', 'test@test.com');
  await git(bilaraDir, 'config', 'user.name', 'Test');

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

  if (opts?.addNonTextFile) {
    await mkdir(path.join(bilaraDir, 'misc'), { recursive: true });
    await writeFile(path.join(bilaraDir, 'misc/notes.json'), '{}', 'utf8');
    await writeFile(
      path.join(bilaraDir, 'translation/en/sujato/sutta/mn/_meta.json'),
      '{}',
      'utf8',
    );
  }

  await git(bilaraDir, 'add', '-A');
  await git(bilaraDir, 'commit', '-m', 'initial');

  const initialSha = await git(bilaraDir, 'rev-parse', 'HEAD');
  let headSha = initialSha;

  if (opts?.withSecondCommit) {
    await writeFile(
      path.join(bilaraDir, 'translation/en/sujato/sutta/mn/mn1_translation-en-sujato.json'),
      JSON.stringify({ 'mn1:0.2': 'The Root of Existence' }),
      'utf8',
    );

    if (opts?.deleteFile) {
      await rm(path.join(bilaraDir, 'root/pli/ms/sutta/mn/mn1_root-pli-ms.json'));
    }

    await git(bilaraDir, 'add', '-A');
    await git(bilaraDir, 'commit', '-m', 'update');
    headSha = await git(bilaraDir, 'rev-parse', 'HEAD');
  }

  return { bilaraDir, initialSha, headSha };
}

afterEach(async () => {
  await Promise.all(tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('r2-sync', () => {
  describe('git helpers', () => {
    it('getHeadCommit returns a valid 40-char SHA', async () => {
      const { bilaraDir } = await createGitFixture();
      const sha = await getHeadCommit(bilaraDir);
      expect(sha).toMatch(/^[0-9a-f]{40}$/);
    });

    it('isAncestor returns true for a valid ancestor', async () => {
      const { bilaraDir, initialSha, headSha } = await createGitFixture({ withSecondCommit: true });
      expect(await isAncestor(bilaraDir, initialSha, headSha)).toBe(true);
    });

    it('isAncestor returns false for non-ancestor', async () => {
      const { bilaraDir, initialSha, headSha } = await createGitFixture({ withSecondCommit: true });
      expect(await isAncestor(bilaraDir, headSha, initialSha)).toBe(false);
    });

    it('isAncestor returns false for unknown SHA', async () => {
      const { bilaraDir, headSha } = await createGitFixture();
      expect(await isAncestor(bilaraDir, 'a'.repeat(40), headSha)).toBe(false);
    });

    it('getGitDiffFiles detects changed and deleted files', async () => {
      const { bilaraDir, initialSha, headSha } = await createGitFixture({
        withSecondCommit: true,
        deleteFile: true,
      });

      const diff = await getGitDiffFiles(bilaraDir, initialSha, headSha);
      expect(diff.changed).toEqual([
        'translation/en/sujato/sutta/mn/mn1_translation-en-sujato.json',
      ]);
      expect(diff.deleted).toEqual(['root/pli/ms/sutta/mn/mn1_root-pli-ms.json']);
    });

    it('getGitDiffFiles filters out non-text-root and _-prefixed files', async () => {
      const { bilaraDir, initialSha } = await createGitFixture({ addNonTextFile: true });

      // Make a second commit modifying all files
      await writeFile(path.join(bilaraDir, 'misc/notes.json'), '{"x":1}', 'utf8');
      await writeFile(
        path.join(bilaraDir, 'translation/en/sujato/sutta/mn/_meta.json'),
        '{"x":1}',
        'utf8',
      );
      await writeFile(
        path.join(bilaraDir, 'translation/en/sujato/sutta/mn/mn1_translation-en-sujato.json'),
        JSON.stringify({ 'mn1:0.2': 'Updated' }),
        'utf8',
      );
      await git(bilaraDir, 'add', '-A');
      await git(bilaraDir, 'commit', '-m', 'update all');
      const headSha = await git(bilaraDir, 'rev-parse', 'HEAD');

      const diff = await getGitDiffFiles(bilaraDir, initialSha, headSha);
      // Only the eligible translation file, not misc/ or _meta.json
      expect(diff.changed).toEqual([
        'translation/en/sujato/sutta/mn/mn1_translation-en-sujato.json',
      ]);
      expect(diff.deleted).toEqual([]);
    });

    it('getGitDiffFiles treats renames as delete + add', async () => {
      const { bilaraDir, initialSha } = await createGitFixture();

      await git(
        bilaraDir,
        'mv',
        'root/pli/ms/sutta/mn/mn1_root-pli-ms.json',
        'root/pli/ms/sutta/mn/mn2_root-pli-ms.json',
      );
      await git(bilaraDir, 'commit', '-m', 'rename');
      const headSha = await git(bilaraDir, 'rev-parse', 'HEAD');

      const diff = await getGitDiffFiles(bilaraDir, initialSha, headSha);
      expect(diff.changed).toContain('root/pli/ms/sutta/mn/mn2_root-pli-ms.json');
      expect(diff.deleted).toContain('root/pli/ms/sutta/mn/mn1_root-pli-ms.json');
    });
  });

  describe('R2 SHA state', () => {
    it('getLastSyncedCommit returns valid SHA from downloader', async () => {
      const sha = 'a'.repeat(40);
      const downloader = vi.fn(async () => sha);
      expect(await getLastSyncedCommit('bucket', downloader)).toBe(sha);
    });

    it('getLastSyncedCommit returns null on downloader error', async () => {
      const downloader = vi.fn(async () => {
        throw new Error('not found');
      });
      expect(await getLastSyncedCommit('bucket', downloader)).toBe(null);
    });

    it('getLastSyncedCommit returns null on invalid SHA format', async () => {
      const downloader = vi.fn(async () => 'not-a-sha');
      expect(await getLastSyncedCommit('bucket', downloader)).toBe(null);
    });

    it('saveLastSyncedCommit uploads SHA via uploader', async () => {
      const uploader = vi.fn(async () => {});
      await saveLastSyncedCommit('test-bucket', 'a'.repeat(40), uploader);
      expect(uploader).toHaveBeenCalledTimes(1);
      expect(uploader).toHaveBeenCalledWith('test-bucket', SYNC_SHA_KEY, expect.any(String));
    });
  });

  describe('collectAllTextFiles', () => {
    it('discovers text json files without hashing', async () => {
      const { bilaraDir } = await createGitFixture();
      const files = await collectAllTextFiles(bilaraDir);

      expect(files.map((e) => e.key)).toEqual([
        'root/pli/ms/sutta/mn/mn1_root-pli-ms.json',
        'translation/en/sujato/sutta/mn/mn1_translation-en-sujato.json',
      ]);
      // No hash property
      expect(files.every((e) => !('hash' in e))).toBe(true);
    });

    it('excludes _-prefixed and out-of-root files', async () => {
      const { bilaraDir } = await createGitFixture({ addNonTextFile: true });
      const files = await collectAllTextFiles(bilaraDir);

      const keys = files.map((e) => e.key);
      expect(keys).not.toContain('misc/notes.json');
      expect(keys).not.toContain('translation/en/sujato/sutta/mn/_meta.json');
      expect(keys).toHaveLength(2);
    });
  });

  describe('countTrackedTextFiles', () => {
    it('counts only eligible tracked text files', async () => {
      const { bilaraDir } = await createGitFixture({ addNonTextFile: true });
      const count = await countTrackedTextFiles(bilaraDir);
      expect(count).toBe(2);
    });
  });

  describe('syncBilaraToR2', () => {
    it('does full sync when no prior SHA exists', async () => {
      const { bilaraDir } = await createGitFixture();
      const uploader = vi.fn(async () => {});
      const downloader = vi.fn(async () => {
        throw new Error('not found');
      });

      const result = await syncBilaraToR2({
        bilaraDataDir: bilaraDir,
        bucket: 'test-bucket',
        uploader,
        downloader,
      });

      expect(result.isFullSync).toBe(true);
      // 2 data files + 1 SHA save
      expect(result.uploaded).toBe(2);
      expect(uploader).toHaveBeenCalledTimes(3);
    });

    it('does full sync when stored SHA is not an ancestor of HEAD', async () => {
      const { bilaraDir } = await createGitFixture();
      const uploader = vi.fn(async () => {});
      // Return a valid-looking but unreachable SHA
      const downloader = vi.fn(async () => 'b'.repeat(40));

      const result = await syncBilaraToR2({
        bilaraDataDir: bilaraDir,
        bucket: 'test-bucket',
        uploader,
        downloader,
      });

      expect(result.isFullSync).toBe(true);
      expect(result.uploaded).toBe(2);
      // 2 data files + 1 SHA save
      expect(uploader).toHaveBeenCalledTimes(3);
    });

    it('does incremental sync when prior SHA is ancestor of HEAD', async () => {
      const { bilaraDir, initialSha } = await createGitFixture({ withSecondCommit: true });
      const uploader = vi.fn(async () => {});
      const downloader = vi.fn(async () => initialSha);

      const result = await syncBilaraToR2({
        bilaraDataDir: bilaraDir,
        bucket: 'test-bucket',
        uploader,
        downloader,
      });

      expect(result.isFullSync).toBe(false);
      expect(result.uploaded).toBe(1);
      // 1 changed file + 1 SHA save
      expect(uploader).toHaveBeenCalledTimes(2);
    });

    it('reports deleted files in incremental sync', async () => {
      const { bilaraDir, initialSha } = await createGitFixture({
        withSecondCommit: true,
        deleteFile: true,
      });
      const uploader = vi.fn(async () => {});
      const downloader = vi.fn(async () => initialSha);

      const result = await syncBilaraToR2({
        bilaraDataDir: bilaraDir,
        bucket: 'test-bucket',
        uploader,
        downloader,
      });

      expect(result.removed).toBe(1);
      expect(result.uploaded).toBe(1);
    });

    it('short-circuits when HEAD equals stored SHA', async () => {
      const { bilaraDir, headSha } = await createGitFixture();
      const uploader = vi.fn(async () => {});
      const downloader = vi.fn(async () => headSha);

      const result = await syncBilaraToR2({
        bilaraDataDir: bilaraDir,
        bucket: 'test-bucket',
        uploader,
        downloader,
      });

      expect(result.uploaded).toBe(0);
      expect(result.removed).toBe(0);
      expect(result.isFullSync).toBe(false);
      // No uploads, no SHA save (already up to date)
      expect(uploader).not.toHaveBeenCalled();
    });

    it('skips uploads and SHA save in dry-run mode', async () => {
      const { bilaraDir } = await createGitFixture();
      const uploader = vi.fn(async () => {});
      const downloader = vi.fn(async () => {
        throw new Error('not found');
      });

      const result = await syncBilaraToR2({
        bilaraDataDir: bilaraDir,
        bucket: 'test-bucket',
        dryRun: true,
        uploader,
        downloader,
      });

      expect(result.uploaded).toBe(2);
      expect(uploader).not.toHaveBeenCalled();
    });

    it('retries on transient network errors from wrangler stderr', async () => {
      const { bilaraDir } = await createGitFixture();
      let calls = 0;
      const uploader = vi.fn(async () => {
        calls += 1;
        if (calls <= 2) {
          const err = new Error('Command failed with exit code 1') as Error & {
            stderr: string;
            stdout: string;
          };
          err.stderr = '✘ [ERROR] fetch failed';
          err.stdout = '';
          throw err;
        }
      });
      const downloader = vi.fn(async () => {
        throw new Error('not found');
      });

      const result = await syncBilaraToR2({
        bilaraDataDir: bilaraDir,
        bucket: 'test-bucket',
        uploader,
        downloader,
      });

      expect(result.uploaded).toBe(2);
      // 2 retries on first file + 1 success, 1 success on second file, 1 SHA save = 5
      expect(uploader).toHaveBeenCalledTimes(5);
    });

    it('emits progress events with isFullSync flag', async () => {
      const { bilaraDir } = await createGitFixture();
      const uploader = vi.fn(async () => {});
      const downloader = vi.fn(async () => {
        throw new Error('not found');
      });
      const events: string[] = [];

      await syncBilaraToR2({
        bilaraDataDir: bilaraDir,
        bucket: 'test-bucket',
        uploader,
        downloader,
        onProgress: (event) => {
          events.push(event.type);
          expect(event.isFullSync).toBe(true);
        },
      });

      expect(events).toContain('plan');
      expect(events).toContain('complete');
    });
  });
});
