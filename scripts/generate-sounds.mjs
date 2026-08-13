/**
 * Generates the gentle UI sounds (tap / wood / bell / bowl) as MP3s.
 * Requires ffmpeg on PATH. Run: `npm run generate:sounds`.
 * Idempotent — safe to re-run; overwrites public/sounds/*.mp3.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'sounds');
mkdirSync(outDir, { recursive: true });

const sr = 22050;

function envelope(n, attack = 0.005, decayPow = 3.0) {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const a = Math.min(t / Math.max(attack, 1e-6), 1.0);
    out[i] = a * Math.exp(-decayPow * t);
  }
  return out;
}

function synth(seconds, fn) {
  const n = Math.floor(sr * seconds);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / sr, i, n);
  return out;
}

function toPcm16(samples) {
  const buf = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  return buf;
}

function writeMp3(name, samples) {
  const dest = path.join(outDir, name);
  const pcm = toPcm16(samples);
  const res = spawnSync(
    'ffmpeg',
    ['-y', '-f', 's16le', '-ar', String(sr), '-ac', '1', '-i', '-', '-codec:a', 'libmp3lame', '-q:a', '6', dest],
    { input: pcm },
  );
  if (res.status !== 0) {
    console.error(`ffmpeg failed for ${name}:\n`, res.stderr?.toString());
    process.exitCode = 1;
  } else {
    console.log('wrote', path.relative(root, dest));
  }
}

// soft click
writeMp3('tap.mp3', synth(0.06, (t, i, n) => envelope(n, 0.001, 60)[i] * Math.sin(2 * Math.PI * 1400 * t) * 0.18));
// wooden tap
writeMp3('wood.mp3', synth(0.12, (t, i, n) => envelope(n, 0.001, 28)[i] * (Math.sin(2 * Math.PI * 320 * t) + 0.5 * Math.sin(2 * Math.PI * 640 * t)) * 0.22));
// gentle bell
writeMp3('bell.mp3', synth(2.5, (t, i, n) => envelope(n, 0.002, 2.2)[i] * (Math.sin(2 * Math.PI * 528 * t) + 0.4 * Math.sin(2 * Math.PI * 528 * 2.76 * t) + 0.2 * Math.sin(2 * Math.PI * 528 * 5.4 * t)) * 0.16));
// completion bowl
writeMp3('bowl.mp3', synth(5.0, (t, i, n) => {
  const mod = 1 + 0.004 * Math.sin(2 * Math.PI * 1.2 * t);
  return envelope(n, 0.05, 1.1)[i] * (Math.sin(2 * Math.PI * 216 * t * mod) + 0.45 * Math.sin(2 * Math.PI * 216 * 2.02 * t) + 0.18 * Math.sin(2 * Math.PI * 216 * 3.01 * t)) * 0.2;
}));
