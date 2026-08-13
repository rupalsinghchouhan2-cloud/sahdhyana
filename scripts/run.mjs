/**
 * Vendored environment note: this sandbox installs node_modules without npm's
 * bin shims. These aliases make `npm run dev|build|typecheck` work directly.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = process.argv[2];

const targets = {
  dev: ['node_modules/vite/bin/vite.js', []],
  build: ['node_modules/typescript/bin/tsc', ['-b'], 'node_modules/vite/bin/vite.js', ['build']],
  typecheck: ['node_modules/typescript/bin/tsc', ['-b', '--noEmit']],
  preview: ['node_modules/vite/bin/vite.js', ['preview']],
};

function run(file, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, file), ...(args ?? [])], {
      stdio: 'inherit',
      cwd: root,
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${file} exited ${code}`))));
  });
}

const t = targets[script];
if (!t) {
  console.error('Unknown script:', script);
  process.exit(1);
}
if (script === 'build') {
  await run(t[0], t[1]);
  await run(t[2], t[3]);
} else {
  await run(t[0], t[1]);
}
