import * as esbuild from 'esbuild';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const dirName = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const PUBLIC_DIR = path.resolve(dirName, '..', 'public');


async function start(): Promise<void> {
  const clients: http.ServerResponse[] = [];

  const ctx = await esbuild.context({
    entryPoints: ['src/main.tsx'],
    bundle: true,
    outfile: 'dist/app.js',
    loader: { '.tsx': 'tsx', '.ts': 'ts' },
    platform: 'browser',
    sourcemap: true,
    plugins: [{
      name: 'reload-plugin',
      setup(build) {
        build.onEnd(() => {
          console.log('Build ended, reloading...');
          clients.forEach(res => res.write('data: update\n\n'));
        });
      },
    }],
  });

  await ctx.watch();

  const server = http.createServer((req, res) => {
    const url = req.url;
    let filePath: string;

    if (url === '/esbuild') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      clients.push(res);
      return;
    } else if (req.url === '/dist/app.js.map') { // Sourcemap
      filePath = path.resolve(dirName, '..', 'dist', 'app.js.map');
    } else if (req.url === '/dist/app.css') { // CSS Bundle
      filePath = path.resolve(dirName, '..', 'dist', 'app.css');
    } else {
      filePath = path.join(dirName, '..', url === '/' ? 'index.html' : url ?? '');
    }

    // Check public if not found in root
    if (!fs.existsSync(filePath)) {
      filePath = path.join(PUBLIC_DIR, url ?? '');
    }

    const ext = path.extname(filePath);
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.csv': 'text/csv',
      '.map': 'application/json',
    };

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      if (ext === '.html') {
        res.end(content + '<script>new EventSource("/esbuild").onmessage = () => location.reload()</script>');
      } else {
        res.end(content);
      }
    });

  });

  server.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
}

start();
