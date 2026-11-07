import { createWriteStream, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = join(root, 'panax-ru.zip');

if (!existsSync(join(dist, 'manifest.json'))) {
  console.error('Run npm run build first');
  process.exit(1);
}

// Prefer PowerShell Compress-Archive on Windows
const ps = `
$ErrorActionPreference = 'Stop'
if (Test-Path '${out.replace(/'/g, "''")}') { Remove-Item '${out.replace(/'/g, "''")}' -Force }
Compress-Archive -Path '${dist.replace(/'/g, "''")}\\*' -DestinationPath '${out.replace(/'/g, "''")}' -Force
Write-Host "Wrote ${out.replace(/'/g, "''")}"
`;
const result = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
if (result.status !== 0) {
  console.error(result.stdout || '', result.stderr || '');
  process.exit(result.status || 1);
}
console.log(result.stdout.trim());
