import { access, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const BILARA_PUBLISHED_BASE = 'https://raw.githubusercontent.com/suttacentral/bilara-data/published';

interface SeedEntry {
  relativePath: string;
  objectKey: string;
}

const PLAYTEST_SEED_ENTRIES: SeedEntry[] = [
  {
    relativePath: 'translation/en/sujato/sutta/mn/mn1_translation-en-sujato.json',
    objectKey: 'translation/en/sujato/sutta/mn/mn1_translation-en-sujato.json',
  },
  {
    relativePath: 'root/pli/ms/sutta/mn/mn1_root-pli-ms.json',
    objectKey: 'root/pli/ms/sutta/mn/mn1_root-pli-ms.json',
  },
];

async function resolveSeedFilePath(projectRoot: string, relativePath: string): Promise<string> {
  const bilaraDataDir = path.resolve(process.env.BILARA_DATA_DIR ?? '../bilara-data');
  const localFilePath = path.resolve(projectRoot, bilaraDataDir, relativePath);

  try {
    await access(localFilePath);
    return localFilePath;
  } catch {
    // Fall through to published download.
  }

  const url = `${BILARA_PUBLISHED_BASE}/${relativePath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download seed source ${url} (${response.status})`);
  }

  const content = await response.text();
  const downloadedPath = path.join(os.tmpdir(), 'palispeedread-seed', relativePath);
  await mkdir(path.dirname(downloadedPath), { recursive: true });
  await writeFile(downloadedPath, content, 'utf8');
  return downloadedPath;
}

async function main(): Promise<void> {
  const bucket = process.env.R2_BUCKET ?? 'speedreadsuttas-data';
  const cwd = path.resolve('.');

  for (const entry of PLAYTEST_SEED_ENTRIES) {
    const absoluteFilePath = await resolveSeedFilePath(cwd, entry.relativePath);

    await execFileAsync('pnpm', [
      '--filter',
      '@palispeedread/worker',
      'exec',
      'wrangler',
      'r2',
      'object',
      'put',
      `${bucket}/${entry.objectKey}`,
      '--remote',
      '--file',
      absoluteFilePath,
    ]);
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        bucket,
        uploaded: PLAYTEST_SEED_ENTRIES.map((entry) => entry.objectKey),
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
