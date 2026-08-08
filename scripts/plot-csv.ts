import * as fs from 'node:fs';

import { PROGRAM_NAME, loadAssets } from './assets.ts';
import { CLIError, parseArgs, usage } from './cliOptions.ts';
import { renderReport } from './report.ts';

async function buildAndGenerate(): Promise<void> {
  const { csvPath, chartOptions, help } = parseArgs(process.argv.slice(2));

  if (help) {
    console.error(usage(PROGRAM_NAME));
    return;
  }

  if (csvPath != null && !fs.existsSync(csvPath)) {
    console.error(`Error: CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const assets = await loadAssets();
  const csv = fs.readFileSync(csvPath ?? 0, 'utf-8');

  console.error('Generating HTML report...');

  fs.writeSync(process.stdout.fd, renderReport({ ...assets, csv, chartOptions }));
}

buildAndGenerate().catch((err: unknown) => {
  if (err instanceof CLIError) {
    console.error(`Error: ${err.message}\n\n${usage(PROGRAM_NAME)}`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
