import path from 'node:path';

import { buildIndexDataFromBilara, writeIndexArtifacts } from '../packages/worker/src/lib/index-builder';

async function main(): Promise<void> {
  const bilaraDataDir = path.resolve(process.env.BILARA_DATA_DIR ?? '../bilara-data');
  const outputDir = path.resolve('packages/worker/src/data');

  const result = await buildIndexDataFromBilara(bilaraDataDir);
  const paths = await writeIndexArtifacts(result, outputDir);

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        bilaraDataDir,
        searchIndexCount: result.searchIndex.length,
        manifestCount: Object.keys(result.translationManifest).length,
        ...paths,
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
