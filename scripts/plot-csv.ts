import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { CLIError, USAGE, parseArgs } from './cliOptions.ts';

const dirName = path.dirname(fileURLToPath(import.meta.url));

async function buildAndGenerate(): Promise<void> {
  const { csvPath: csvPathArg, chartOptions, help } = parseArgs(process.argv.slice(2));

  if (help) {
    console.error(USAGE);
    return;
  }

  const csvPath = csvPathArg != null ? csvPathArg : 0;

  if (csvPath) {
    if (!fs.existsSync(csvPath)) {
      console.error(`Error: CSV file not found: ${csvPath}`);
      process.exit(1);
    }
  }

  console.error('Building source...');

  // Build with CSS support
  const buildResult = await esbuild.build({
    entryPoints: ['src/main.tsx'],
    bundle: true,
    write: false,
    loader: { '.tsx': 'tsx', '.ts': 'ts', '.css': 'css' },
    platform: 'browser',
    target: 'esnext',
    outdir: 'dist', // needed for multiple output files to be distinct in memory
  });

  const jsFile = buildResult.outputFiles?.find(f => f.path.endsWith('.js'));
  const cssFile = buildResult.outputFiles?.find(f => f.path.endsWith('.css'));

  const jsCode = jsFile ? jsFile.text : '';
  const cssCode = cssFile ? cssFile.text : '';

  // Read HTML template
  const templatePath = path.resolve(dirName, '..', 'index.html');
  const template = fs.readFileSync(templatePath, 'utf-8');

  // Read CSV
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  console.error('Generating HTML report...');

  // Inject
  let html = template;

  // 2. Inject CSV and chart settings
  const injection = `<script>window.__INITIAL_CSV__ = ${JSON.stringify(csvContent)};`
    + `window.__CHART_OPTIONS__ = ${JSON.stringify(chartOptions)};</script>`;

  // 3. Inject CSS
  const style = `<style>${cssCode}</style>`;

  // 4. Inject JS
  const script = `<script>${jsCode}</script>`;

  // Combine
  html = html.replace('<!--PRODUCTION_DATA-->', injection);
  html = html.replace('<!--PRODUCTION_STYLE-->', style);
  const parts = html.split('<!--PRODUCTION_SCRIPT-->');
  html = parts[0] + script + (parts[1] ?? '');

  fs.writeSync(process.stdout.fd, html);
}

buildAndGenerate().catch((err: unknown) => {
  if (err instanceof CLIError) {
    console.error(`Error: ${err.message}\n\n${USAGE}`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
