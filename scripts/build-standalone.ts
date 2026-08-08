import * as esbuild from 'esbuild';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inject } from 'postject';

import type { Assets } from './assets.ts';
import { loadAssets } from './assets.ts';

const SENTINEL_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';
const PROGRAM_NAME = 'plottimeseries';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const scriptPath = path.join(distDir, `${PROGRAM_NAME}.cjs`);
const blobPath = path.join(distDir, 'sea-prep.blob');
const seaConfigPath = path.join(distDir, 'sea-config.json');
const executablePath = path.join(
  distDir,
  process.platform === 'win32' ? `${PROGRAM_NAME}.exe` : PROGRAM_NAME
);

function embedAssets(assets: Assets): esbuild.Plugin {
  const contents = `export const PROGRAM_NAME = ${JSON.stringify(PROGRAM_NAME)};
export async function loadAssets() {
  return ${JSON.stringify(assets)};
}`;

  return {
    name: 'embed-assets',
    setup(build: esbuild.PluginBuild): void {
      build.onResolve({ filter: /(^|\/)assets\.ts$/ }, () => ({
        path: 'embedded-assets',
        namespace: 'embedded-assets',
      }));
      build.onLoad({ filter: /.*/, namespace: 'embedded-assets' }, () => ({
        contents,
        loader: 'ts' as const,
      }));
    },
  };
}

async function buildScript(): Promise<void> {
  const assets = await loadAssets();

  console.error(`Bundling ${path.relative(rootDir, scriptPath)}...`);

  await esbuild.build({
    entryPoints: [path.join(rootDir, 'scripts', 'plot-csv.ts')],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    outfile: scriptPath,
    plugins: [embedAssets(assets)],
  });
}

async function buildExecutable(): Promise<void> {
  console.error(`Building ${path.relative(rootDir, executablePath)}...`);

  fs.writeFileSync(
    seaConfigPath,
    JSON.stringify({ main: scriptPath, output: blobPath, disableExperimentalSEAWarning: true })
  );

  execFileSync(process.execPath, ['--experimental-sea-config', seaConfigPath], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  fs.copyFileSync(process.execPath, executablePath);

  if (process.platform === 'darwin') {
    execFileSync('codesign', ['--remove-signature', executablePath], { stdio: 'inherit' });
  }

  await inject(executablePath, 'NODE_SEA_BLOB', fs.readFileSync(blobPath), {
    sentinelFuse: SENTINEL_FUSE,
    machoSegmentName: process.platform === 'darwin' ? 'NODE_SEA' : undefined,
    overwrite: true,
  });

  if (process.platform === 'darwin') {
    execFileSync('codesign', ['--sign', '-', executablePath], { stdio: 'inherit' });
  }

  fs.rmSync(blobPath, { force: true });
  fs.rmSync(seaConfigPath, { force: true });
}

async function main(): Promise<void> {
  fs.mkdirSync(distDir, { recursive: true });

  await buildScript();

  if (!process.argv.includes('--script-only')) {
    await buildExecutable();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
