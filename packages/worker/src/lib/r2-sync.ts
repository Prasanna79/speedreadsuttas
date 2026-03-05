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
}

const TEXT_ROOTS = [
  path.join('root', 'pli', 'ms', 'sutta'),
  'translation',
];

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

  if (!dryRun) {
    for (const entry of diff.toUpload) {
      await uploader(bucket, entry.key, entry.filePath);
    }
  }

  await writeSyncManifest(stateFilePath, currentFiles);

  return {
    total: currentFiles.length,
    uploaded: diff.toUpload.length,
    unchanged: diff.unchanged,
    removed: diff.removed.length,
  };
}
