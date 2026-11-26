// Ridge Runner — Alpine Rescue Flight: entrypoint.
//
// Copies game/ and screenshots/ from this repository into the output
// directory and writes dossier.json there with buildDossier from
// vendor/makefun-game.ts, the kit's copy, unchanged.
//
// Runs on Node 22, standard library only, no network. In the grader the
// output directory is /output; outside it MAKEFUN_OUTPUT_DIR stands in for
// /output. Resolves every path from this file's own location, never from the
// working directory, so it runs from any cwd.

import { copyFileSync, lstatSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
} as const;

function copyTree(sourceDir: string, targetDir: string): number {
  let files = 0;
  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const source = join(sourceDir, entry.name);
    const target = join(targetDir, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`refusing to copy symbolic link: ${source}`);
    }
    if (entry.isDirectory()) {
      mkdirSync(target, { recursive: true });
      files += copyTree(source, target);
    } else if (entry.isFile()) {
      copyFileSync(source, target);
      files += 1;
    }
  }
  return files;
}

function main(): void {
  const gameDir = join(REPO_ROOT, 'game');
  const shotsDir = join(REPO_ROOT, 'screenshots');

  if (!lstatSync(gameDir, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error('game/ is missing from the repository');
  }
  if (!lstatSync(shotsDir, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error('screenshots/ is missing from the repository');
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  rmSync(join(OUTPUT_DIR, 'game'), { recursive: true, force: true });
  rmSync(join(OUTPUT_DIR, 'screenshots'), { recursive: true, force: true });
  mkdirSync(join(OUTPUT_DIR, 'game'), { recursive: true });
  mkdirSync(join(OUTPUT_DIR, 'screenshots'), { recursive: true });

  const gameFiles = copyTree(gameDir, join(OUTPUT_DIR, 'game'));
  const shotFiles = copyTree(shotsDir, join(OUTPUT_DIR, 'screenshots'));

  const dossier = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
  if (dossier.length > 1572864) {
    throw new Error(`dossier.json is ${dossier.length} bytes, over the 1.5 MiB cap`);
  }
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
  console.log(`copied ${gameFiles} game files and ${shotFiles} screenshots`);
  console.log(`wrote ${join(OUTPUT_DIR, 'dossier.json')} (${dossier.length} bytes)`);
}

main();
