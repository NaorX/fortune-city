import '../dist/js/game/settings.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve('dist');
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
    );
}
let modules = 0,
  references = 0;
for (const file of walk(root)) {
  if (file.includes(`${path.sep}vendor${path.sep}`)) continue;
  const source = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.mjs')) {
    execFileSync(process.execPath, ['--check', file]);
    modules++;
  }
  const patterns = file.endsWith('.mjs')
    ? [/\bfrom\s*['"]([^'"]+)['"]/g]
    : file.endsWith('.html')
      ? [/\b(?:src|href)="([^"]+)"/g]
      : [];
  for (const pattern of patterns)
    for (const match of source.matchAll(pattern)) {
      if (/^(https?:|data:|#)/.test(match[1])) continue;
      const target = path.resolve(path.dirname(file), match[1].split('?')[0]);
      if (!target.startsWith(root + path.sep) || !fs.existsSync(target))
        throw new Error(`Missing local resource in ${path.relative(root, file)}: ${match[1]}`);
      references++;
    }
}
console.log(`Checked ${modules} modules and ${references} local references.`);
