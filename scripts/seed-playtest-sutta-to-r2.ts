import { access } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

interface SeedEntry {
  filePath: string;
  objectKey: string;
}

const PLAYTEST_SEED_ENTRIES: SeedEntry[] = [
  {
    filePath: 'packages/worker/src/lib/__tests__/fixtures/bilara-mini/translation/en/sujato/sutta/mn/mn1_translation-en-sujato.json',
    objectKey: 'translation/en/sujato/sutta/mn/mn1_translation-en-sujato.json',
  },
  {
    filePath: 'packages/worker/src/lib/__tests__/fixtures/bilara-mini/root/pli/ms/sutta/mn/mn1_root-pli-ms.json',
    objectKey: 'root/pli/ms/sutta/mn/mn1_root-pli-ms.json',
  },
];

async function main(): Promise<void> {
  const bucket = process.env.R2_BUCKET ?? 'speedreadsuttas-data';
  const cwd = path.resolve('.');

  for (const entry of PLAYTEST_SEED_ENTRIES) {
    const absoluteFilePath = path.resolve(cwd, entry.filePath);
    await access(absoluteFilePath);

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
