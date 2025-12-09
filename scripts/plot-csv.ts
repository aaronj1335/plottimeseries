import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const dirName = path.dirname(fileURLToPath(import.meta.url));

async function buildAndGenerate(): Promise<void> {
  const args = process.argv.slice(2);
  const csvPath = args[0];

  if (!csvPath) {
    console.error('Usage: node scripts/plot-csv.ts <path-to-csv>');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`Error: CSV file not found: ${csvPath}`);
    process.exit(1);
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

  // 2. Inject CSV
  const injection = `<script>window.__INITIAL_CSV__ = ${JSON.stringify(csvContent)};</script>`;

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
  console.error(err);
  process.exit(1);
});
