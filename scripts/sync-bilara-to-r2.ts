import path from 'node:path';

import { syncBilaraToR2 } from '../packages/worker/src/lib/r2-sync';

async function main(): Promise<void> {
  const bilaraDataDir = path.resolve(process.env.BILARA_DATA_DIR ?? '../bilara-data');
  const bucket = process.env.R2_BUCKET ?? 'speedreadsuttas-data';
  const stateFilePath = path.resolve(process.env.SYNC_STATE_FILE ?? '.cache/r2-sync-manifest.json');
  const dryRun = process.env.DRY_RUN === '1';

  const result = await syncBilaraToR2({
    bilaraDataDir,
    bucket,
    stateFilePath,
    dryRun,
  });

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        bilaraDataDir,
        bucket,
        dryRun,
        stateFilePath,
        ...result,
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
