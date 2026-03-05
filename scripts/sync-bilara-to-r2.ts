import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

import { syncBilaraToR2 } from '../packages/worker/src/lib/r2-sync';

async function main(): Promise<void> {
  const bilaraDataDir = path.resolve(process.env.BILARA_DATA_DIR ?? '../bilara-data');
  const bucket = process.env.R2_BUCKET ?? 'speedreadsuttas-data';
  const stateFilePath = path.resolve(process.env.SYNC_STATE_FILE ?? '.cache/r2-sync-manifest.json');
  const summaryFilePath = process.env.SYNC_SUMMARY_FILE ? path.resolve(process.env.SYNC_SUMMARY_FILE) : null;
  const dryRun = process.env.DRY_RUN === '1';

  const result = await syncBilaraToR2({
    bilaraDataDir,
    bucket,
    stateFilePath,
    dryRun,
  });

  const summary = {
    bilaraDataDir,
    bucket,
    dryRun,
    stateFilePath,
    ...result,
  };

  if (summaryFilePath) {
    await mkdir(path.dirname(summaryFilePath), { recursive: true });
    await writeFile(summaryFilePath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
