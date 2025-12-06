const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function buildAndGenerate() {
  const args = process.argv.slice(2);
  const csvPath = args[0];

  if (!csvPath) {
    console.error('Usage: node scripts/plot-csv.js <path-to-csv>');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`Error: CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  console.log('Building source...');

  // Build with CSS support
  const buildResult = await esbuild.build({
    entryPoints: ['src/main.tsx'],
    bundle: true,
    write: false,
    loader: { '.tsx': 'tsx', '.ts': 'ts', '.css': 'css' },
    platform: 'browser',
    target: 'esnext',
    minify: true,
    outdir: 'dist', // needed for multiple output files to be distinct in memory
  });

  const jsFile = buildResult.outputFiles.find(f => f.path.endsWith('.js'));
  const cssFile = buildResult.outputFiles.find(f => f.path.endsWith('.css'));

  const jsCode = jsFile ? jsFile.text : '';
  const cssCode = cssFile ? cssFile.text : '';

  // Read HTML template
  const templatePath = path.resolve(__dirname, '..', 'index.html');
  const template = fs.readFileSync(templatePath, 'utf-8');

  // Read CSV
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  console.log('Generating HTML report...');

  // Inject
  let html = template;

  // 1. Remove existing script src
  html = html.replace(/<script type="module" src=".*"><\/script>/, '');

  // 2. Inject CSV
  const injection = `<script>window.__INITIAL_CSV__ = ${JSON.stringify(csvContent)};</script>`;

  // 3. Inject CSS
  const style = `<style>${cssCode}</style>`;

  // 4. Inject JS
  const script = `<script>${jsCode}</script>`;

  // Combine
  html = html.replace('</head>', `${style}${injection}</head>`);
  html = html.replace('</body>', `${script}</body>`);

  console.log(html);
}

buildAndGenerate().catch(err => {
  console.error(err);
  process.exit(1);
});
