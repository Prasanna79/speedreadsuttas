import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface SyncFileEntry {
  key: string;
  filePath: string;
}

export interface SyncOptions {
  bilaraDataDir: string;
  bucket: string;
  dryRun?: boolean;
  uploader?: (bucket: string, key: string, filePath: string) => Promise<void>;
  downloader?: (bucket: string, key: string) => Promise<string>;
  onProgress?: (event: SyncProgressEvent) => void;
  uploadConcurrency?: number;
}

type Nikaya = 'dn' | 'mn' | 'sn' | 'an' | 'kn' | 'other';

export interface SyncProgressEvent {
  type: 'plan' | 'group-start' | 'file' | 'group-complete' | 'complete';
  total: number;
  toUpload: number;
  unchanged: number;
  removed: number;
  uploaded: number;
  dryRun: boolean;
  isFullSync: boolean;
  group?: Nikaya;
  groupIndex?: number;
  groupTotal?: number;
  groupUploaded?: number;
  key?: string;
}

export const SYNC_SHA_KEY = '_sync/last-commit.txt';

const TEXT_ROOTS = [
  path.join('root', 'pli', 'ms', 'sutta'),
  'translation',
];

const TEXT_ROOTS_POSIX = TEXT_ROOTS.map((root) => root.split(path.sep).join('/'));

const NIKAYA_ORDER: Nikaya[] = ['dn', 'mn', 'sn', 'an', 'kn', 'other'];

const toPosixPath = (value: string): string => value.split(path.sep).join('/');

const isTextJsonFile = (name: string): boolean => name.endsWith('.json') && !name.startsWith('_');

async function walkJsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsonFiles(entryPath)));
      continue;
    }
    if (entry.isFile() && isTextJsonFile(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

// -- Git helpers ---------------------------------------------------------------

export async function getHeadCommit(bilaraDataDir: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
    cwd: bilaraDataDir,
  });
  return stdout.trim();
}

export async function isAncestor(
  bilaraDataDir: string,
  oldSha: string,
  newSha: string,
): Promise<boolean> {
  try {
    await execFileAsync('git', ['merge-base', '--is-ancestor', oldSha, newSha], {
      cwd: bilaraDataDir,
    });
    return true;
  } catch {
    return false;
  }
}

function isEligiblePath(line: string): boolean {
  if (!line) return false;
  const basename = path.posix.basename(line);
  if (!basename.endsWith('.json') || basename.startsWith('_')) return false;
  return TEXT_ROOTS_POSIX.some((root) => line.startsWith(root));
}

export async function getGitDiffFiles(
  bilaraDataDir: string,
  oldSha: string,
  newSha: string,
): Promise<{ changed: string[]; deleted: string[] }> {
  const { stdout } = await execFileAsync(
    'git',
    ['diff', '--name-status', '--no-renames', oldSha, newSha],
    { cwd: bilaraDataDir, maxBuffer: 10 * 1024 * 1024 },
  );

  const changed: string[] = [];
  const deleted: string[] = [];

  for (const line of stdout.split('\n')) {
    if (!line) continue;
    const status = line[0];
    const filePath = line.slice(1).trim();
    if (!isEligiblePath(filePath)) continue;

    if (status === 'D') {
      deleted.push(filePath);
    } else {
      changed.push(filePath);
    }
  }

  return { changed, deleted };
}

// -- R2 SHA state -------------------------------------------------------------

async function wranglerDownloader(bucket: string, key: string): Promise<string> {
  const { stdout } = await execFileAsync('pnpm', [
    '--filter',
    '@palispeedread/worker',
    'exec',
    'wrangler',
    'r2',
    'object',
    'get',
    `${bucket}/${key}`,
    '--remote',
    '--pipe',
  ]);
  return stdout.trim();
}

export async function getLastSyncedCommit(
  bucket: string,
  downloader: (bucket: string, key: string) => Promise<string>,
): Promise<string | null> {
  try {
    const sha = await downloader(bucket, SYNC_SHA_KEY);
    if (/^[0-9a-f]{40}$/.test(sha)) {
      return sha;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveLastSyncedCommit(
  bucket: string,
  sha: string,
  uploader: (bucket: string, key: string, filePath: string) => Promise<void>,
): Promise<void> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'r2-sync-sha-'));
  const tmpFile = path.join(tmpDir, 'last-commit.txt');
  try {
    await writeFile(tmpFile, sha, 'utf8');
    await uploader(bucket, SYNC_SHA_KEY, tmpFile);
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// -- File collection (full-sync fallback) -------------------------------------

export async function collectAllTextFiles(bilaraDataDir: string): Promise<SyncFileEntry[]> {
  const entries: SyncFileEntry[] = [];

  for (const relativeRoot of TEXT_ROOTS) {
    const absoluteRoot = path.join(bilaraDataDir, relativeRoot);
    let files: string[];
    try {
      files = await walkJsonFiles(absoluteRoot);
    } catch {
      continue;
    }

    for (const filePath of files) {
      const relative = path.relative(bilaraDataDir, filePath);
      entries.push({ key: toPosixPath(relative), filePath });
    }
  }

  return entries.sort((left, right) => left.key.localeCompare(right.key));
}

export async function countTrackedTextFiles(bilaraDataDir: string): Promise<number> {
  const { stdout } = await execFileAsync('git', ['ls-files'], {
    cwd: bilaraDataDir,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.split('\n').filter(isEligiblePath).length;
}

// -- Nikaya sorting -----------------------------------------------------------

function toNikaya(key: string): Nikaya {
  const marker = '/sutta/';
  const markerIndex = key.indexOf(marker);
  if (markerIndex === -1) {
    return 'other';
  }

  const collection = key.slice(markerIndex + marker.length).split('/')[0];
  switch (collection) {
    case 'dn':
    case 'mn':
    case 'sn':
    case 'an':
    case 'kn':
      return collection;
    default:
      return 'other';
  }
}

function byNikayaThenKey(left: SyncFileEntry, right: SyncFileEntry): number {
  const leftNikaya = toNikaya(left.key);
  const rightNikaya = toNikaya(right.key);
  const rankDiff = NIKAYA_ORDER.indexOf(leftNikaya) - NIKAYA_ORDER.indexOf(rightNikaya);
  if (rankDiff !== 0) {
    return rankDiff;
  }
  return left.key.localeCompare(right.key);
}

// -- Upload machinery ---------------------------------------------------------

async function wranglerUploader(bucket: string, key: string, filePath: string): Promise<void> {
  await execFileAsync('pnpm', [
    '--filter',
    '@palispeedread/worker',
    'exec',
    'wrangler',
    'r2',
    'object',
    'put',
    `${bucket}/${key}`,
    '--remote',
    '--file',
    filePath,
  ]);
}

const RETRYABLE_UPLOAD_PATTERN =
  /(502|503|504|bad gateway|failed to fetch|fetch failed|etimedout|econnreset|econnrefused|connectivity)/i;

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return RETRYABLE_UPLOAD_PATTERN.test(String(error));
  }
  if (RETRYABLE_UPLOAD_PATTERN.test(error.message)) {
    return true;
  }
  const execError = error as { stderr?: string; stdout?: string };
  return (
    (typeof execError.stderr === 'string' && RETRYABLE_UPLOAD_PATTERN.test(execError.stderr)) ||
    (typeof execError.stdout === 'string' && RETRYABLE_UPLOAD_PATTERN.test(execError.stdout))
  );
}

async function uploadWithRetry(
  uploader: (bucket: string, key: string, filePath: string) => Promise<void>,
  bucket: string,
  key: string,
  filePath: string,
): Promise<void> {
  const maxAttempts = 6;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await uploader(bucket, key, filePath);
      return;
    } catch (error) {
      if (!isRetryableError(error) || attempt >= maxAttempts) {
        throw error;
      }
      await sleep(500 * attempt);
    }
  }
}

async function uploadEntriesWithConcurrency(
  entries: SyncFileEntry[],
  uploadConcurrency: number,
  uploader: (entry: SyncFileEntry) => Promise<void>,
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  let cursor = 0;
  const workerCount = Math.min(entries.length, uploadConcurrency);

  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const currentIndex = cursor;
      if (currentIndex >= entries.length) {
        return;
      }
      cursor += 1;
      await uploader(entries[currentIndex]);
    }
  });

  await Promise.all(workers);
}

// -- Main sync ----------------------------------------------------------------

export async function syncBilaraToR2(options: SyncOptions): Promise<{
  total: number;
  uploaded: number;
  unchanged: number;
  removed: number;
  isFullSync: boolean;
}> {
  const { bilaraDataDir, bucket, dryRun = false } = options;
  const uploader = options.uploader ?? wranglerUploader;
  const downloader = options.downloader ?? wranglerDownloader;
  const onProgress = options.onProgress;
  const uploadConcurrency = Math.max(1, options.uploadConcurrency ?? 1);

  const headSha = await getHeadCommit(bilaraDataDir);
  const lastSha = await getLastSyncedCommit(bucket, downloader);

  let filesToUpload: SyncFileEntry[];
  let deleted: string[] = [];
  let isFullSync: boolean;
  let total: number;

  if (lastSha && lastSha !== headSha && (await isAncestor(bilaraDataDir, lastSha, headSha))) {
    // Incremental sync via git diff
    const diff = await getGitDiffFiles(bilaraDataDir, lastSha, headSha);
    filesToUpload = diff.changed.map((key) => ({
      key,
      filePath: path.join(bilaraDataDir, key),
    }));
    deleted = diff.deleted;
    isFullSync = false;
    total = await countTrackedTextFiles(bilaraDataDir);
  } else if (lastSha === headSha) {
    // No changes
    filesToUpload = [];
    isFullSync = false;
    total = await countTrackedTextFiles(bilaraDataDir);
  } else {
    // Full sync: no prior SHA, unreachable SHA, or malformed
    filesToUpload = await collectAllTextFiles(bilaraDataDir);
    total = filesToUpload.length;
    isFullSync = true;
  }

  const sortedUploads = [...filesToUpload].sort(byNikayaThenKey);
  const toUploadCount = sortedUploads.length;
  const unchanged = total - toUploadCount;

  const progressBase = {
    total,
    toUpload: toUploadCount,
    unchanged,
    removed: deleted.length,
    dryRun,
    isFullSync,
  };

  onProgress?.({ ...progressBase, type: 'plan', uploaded: 0 });

  if (!dryRun) {
    let uploaded = 0;
    let groupIndex = 0;
    let currentGroup: Nikaya | null = null;
    let groupTotal = 0;
    let groupUploaded = 0;

    const groupedUploads = NIKAYA_ORDER.map((nikaya) => ({
      nikaya,
      entries: sortedUploads.filter((entry) => toNikaya(entry.key) === nikaya),
    })).filter((group) => group.entries.length > 0);

    for (const group of groupedUploads) {
      groupIndex += 1;
      currentGroup = group.nikaya;
      groupTotal = group.entries.length;
      groupUploaded = 0;

      onProgress?.({
        ...progressBase,
        type: 'group-start',
        uploaded,
        group: currentGroup,
        groupIndex,
        groupTotal,
        groupUploaded,
      });

      await uploadEntriesWithConcurrency(group.entries, uploadConcurrency, async (entry) => {
        await uploadWithRetry(uploader, bucket, entry.key, entry.filePath);
        uploaded += 1;
        groupUploaded += 1;

        onProgress?.({
          ...progressBase,
          type: 'file',
          uploaded,
          group: currentGroup ?? group.nikaya,
          groupIndex,
          groupTotal,
          groupUploaded,
          key: entry.key,
        });
      });

      onProgress?.({
        ...progressBase,
        type: 'group-complete',
        uploaded,
        group: currentGroup,
        groupIndex,
        groupTotal,
        groupUploaded,
      });
    }

    if (lastSha !== headSha) {
      await saveLastSyncedCommit(bucket, headSha, (b, k, f) => uploadWithRetry(uploader, b, k, f));
    }
  }

  onProgress?.({
    ...progressBase,
    type: 'complete',
    uploaded: dryRun ? 0 : toUploadCount,
  });

  return {
    total,
    uploaded: toUploadCount,
    unchanged,
    removed: deleted.length,
    isFullSync,
  };
}
