import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

import { syncBilaraToR2 } from '../packages/worker/src/lib/r2-sync';

const now = (): string => new Date().toISOString();

async function main(): Promise<void> {
  const bilaraDataDir = path.resolve(process.env.BILARA_DATA_DIR ?? '../bilara-data');
  const bucket = process.env.R2_BUCKET ?? 'speedreadsuttas-data';
  const stateFilePath = path.resolve(process.env.SYNC_STATE_FILE ?? '.cache/r2-sync-manifest.json');
  const summaryFilePath = process.env.SYNC_SUMMARY_FILE ? path.resolve(process.env.SYNC_SUMMARY_FILE) : null;
  const dryRun = process.env.DRY_RUN === '1';
  const uploadConcurrency = Math.max(1, Number(process.env.UPLOAD_CONCURRENCY ?? '1'));
  const progressEvery = Math.max(1, Number(process.env.SYNC_PROGRESS_EVERY ?? '25'));
  let lastPrinted = 0;

  const result = await syncBilaraToR2({
    bilaraDataDir,
    bucket,
    stateFilePath,
    dryRun,
    uploadConcurrency,
    onProgress: (event) => {
      if (event.type === 'plan') {
        // eslint-disable-next-line no-console
        console.log(
          `[${now()}] plan total=${event.total} upload=${event.toUpload} unchanged=${event.unchanged} removed=${event.removed} dryRun=${event.dryRun} concurrency=${uploadConcurrency}`,
        );
        return;
      }

      if (event.type === 'group-start') {
        // eslint-disable-next-line no-console
        console.log(
          `[${now()}] group-start ${event.group} (${event.groupTotal} files) [${event.groupIndex}]`,
        );
        return;
      }

      if (event.type === 'file') {
        const shouldPrint =
          event.uploaded === event.toUpload ||
          event.uploaded === 1 ||
          event.uploaded - lastPrinted >= progressEvery;
        if (shouldPrint) {
          lastPrinted = event.uploaded;
          // eslint-disable-next-line no-console
          console.log(
            `[${now()}] progress ${event.uploaded}/${event.toUpload} group=${event.group} ${event.groupUploaded}/${event.groupTotal} key=${event.key}`,
          );
        }
        return;
      }

      if (event.type === 'group-complete') {
        // eslint-disable-next-line no-console
        console.log(
          `[${now()}] group-complete ${event.group} (${event.groupUploaded}/${event.groupTotal})`,
        );
        return;
      }

      if (event.type === 'complete') {
        // eslint-disable-next-line no-console
        console.log(
          `[${now()}] complete uploaded=${event.uploaded} total=${event.total} unchanged=${event.unchanged} removed=${event.removed}`,
        );
      }
    },
  });

  const summary = {
    bilaraDataDir,
    bucket,
    dryRun,
    uploadConcurrency,
    progressEvery,
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
