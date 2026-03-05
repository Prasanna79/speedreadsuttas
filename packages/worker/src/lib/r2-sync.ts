import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface FileHashEntry {
  key: string;
  filePath: string;
  hash: string;
}

export interface SyncManifest {
  files: Record<string, string>;
}

export interface SyncDiff {
  toUpload: FileHashEntry[];
  unchanged: number;
  removed: string[];
}

export interface SyncOptions {
  bilaraDataDir: string;
  bucket: string;
  stateFilePath: string;
  dryRun?: boolean;
  uploader?: (bucket: string, key: string, filePath: string) => Promise<void>;
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
  group?: Nikaya;
  groupIndex?: number;
  groupTotal?: number;
  groupUploaded?: number;
  key?: string;
}

const TEXT_ROOTS = [
  path.join('root', 'pli', 'ms', 'sutta'),
  'translation',
];

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

export async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export async function collectBilaraTextFiles(bilaraDataDir: string): Promise<FileHashEntry[]> {
  const discovered: FileHashEntry[] = [];

  for (const relativeRoot of TEXT_ROOTS) {
    const absoluteRoot = path.join(bilaraDataDir, relativeRoot);
    let files: string[] = [];
    try {
      files = await walkJsonFiles(absoluteRoot);
    } catch {
      continue;
    }

    for (const filePath of files) {
      const relative = path.relative(bilaraDataDir, filePath);
      const key = toPosixPath(relative);
      discovered.push({
        key,
        filePath,
        hash: await hashFile(filePath),
      });
    }
  }

  return discovered.sort((left, right) => left.key.localeCompare(right.key));
}

export async function loadSyncManifest(filePath: string): Promise<SyncManifest> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as SyncManifest;
    return {
      files: parsed.files ?? {},
    };
  } catch {
    return { files: {} };
  }
}

export async function writeSyncManifest(filePath: string, entries: FileHashEntry[]): Promise<void> {
  const manifest: SyncManifest = {
    files: Object.fromEntries(entries.map((entry) => [entry.key, entry.hash])),
  };

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

export function diffSyncManifest(previous: SyncManifest, current: FileHashEntry[]): SyncDiff {
  const currentMap = new Map(current.map((entry) => [entry.key, entry.hash]));
  const toUpload = current.filter((entry) => previous.files[entry.key] !== entry.hash);
  const unchanged = current.length - toUpload.length;
  const removed = Object.keys(previous.files)
    .filter((key) => !currentMap.has(key))
    .sort((left, right) => left.localeCompare(right));

  return {
    toUpload,
    unchanged,
    removed,
  };
}

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

function byNikayaThenKey(left: FileHashEntry, right: FileHashEntry): number {
  const leftNikaya = toNikaya(left.key);
  const rightNikaya = toNikaya(right.key);
  const rankDiff = NIKAYA_ORDER.indexOf(leftNikaya) - NIKAYA_ORDER.indexOf(rightNikaya);
  if (rankDiff !== 0) {
    return rankDiff;
  }
  return left.key.localeCompare(right.key);
}

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

const RETRYABLE_UPLOAD_PATTERN = /(502|503|504|bad gateway|failed to fetch|etimedout|econnreset)/i;

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

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
      const message = error instanceof Error ? error.message : String(error);
      const shouldRetry = RETRYABLE_UPLOAD_PATTERN.test(message) && attempt < maxAttempts;
      if (!shouldRetry) {
        throw error;
      }
      await sleep(500 * attempt);
    }
  }
}

async function uploadEntriesWithConcurrency(
  entries: FileHashEntry[],
  uploadConcurrency: number,
  uploader: (entry: FileHashEntry) => Promise<void>,
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

export async function syncBilaraToR2(options: SyncOptions): Promise<{
  total: number;
  uploaded: number;
  unchanged: number;
  removed: number;
}> {
  const { bilaraDataDir, bucket, stateFilePath, dryRun = false } = options;
  const uploader = options.uploader ?? wranglerUploader;

  const currentFiles = await collectBilaraTextFiles(bilaraDataDir);
  const previousManifest = await loadSyncManifest(stateFilePath);
  const diff = diffSyncManifest(previousManifest, currentFiles);
  const sortedUploads = [...diff.toUpload].sort(byNikayaThenKey);
  const total = currentFiles.length;
  const toUpload = sortedUploads.length;
  const onProgress = options.onProgress;
  const uploadConcurrency = Math.max(1, options.uploadConcurrency ?? 1);

  onProgress?.({
    type: 'plan',
    total,
    toUpload,
    unchanged: diff.unchanged,
    removed: diff.removed.length,
    uploaded: 0,
    dryRun,
  });

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
        type: 'group-start',
        total,
        toUpload,
        unchanged: diff.unchanged,
        removed: diff.removed.length,
        uploaded,
        dryRun,
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
          type: 'file',
          total,
          toUpload,
          unchanged: diff.unchanged,
          removed: diff.removed.length,
          uploaded,
          dryRun,
          group: currentGroup ?? group.nikaya,
          groupIndex,
          groupTotal,
          groupUploaded,
          key: entry.key,
        });
      });

      onProgress?.({
        type: 'group-complete',
        total,
        toUpload,
        unchanged: diff.unchanged,
        removed: diff.removed.length,
        uploaded,
        dryRun,
        group: currentGroup,
        groupIndex,
        groupTotal,
        groupUploaded,
      });
    }
  }

  await writeSyncManifest(stateFilePath, currentFiles);

  onProgress?.({
    type: 'complete',
    total,
    toUpload,
    unchanged: diff.unchanged,
    removed: diff.removed.length,
    uploaded: dryRun ? 0 : toUpload,
    dryRun,
  });

  return {
    total,
    uploaded: toUpload,
    unchanged: diff.unchanged,
    removed: diff.removed.length,
  };
}
