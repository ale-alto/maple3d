import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIM_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'sim');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// tech.md sim purity rule: src/sim/ must run headless inside the PartyKit
// room later — no Three.js, no DOM, no window.
test('sim imports are pure', () => {
  const files = walk(SIM_DIR).filter((f) => f.endsWith('.js'));
  expect(files.length).toBeGreaterThan(0);

  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    expect(src, `${file} imports three`).not.toMatch(/from\s+['"]three['"]/);
    expect(src, `${file} touches the DOM/window`).not.toMatch(/\b(window|document|navigator|localStorage)\b/);
  }
});
