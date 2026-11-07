import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

mkdirSync(dist, { recursive: true });
mkdirSync(join(dist, 'icons'), { recursive: true });

await esbuild.build({
  entryPoints: [join(root, 'src/content/main.js')],
  bundle: true,
  outfile: join(dist, 'content.js'),
  format: 'iife',
  target: ['chrome120'],
  minify: false,
  legalComments: 'none',
  loader: { '.json': 'json', '.css': 'text' },
});

const manifest = {
  manifest_version: 3,
  name: 'PANAX RU',
  version: '0.2.72',
  description: 'Russian UI for panaxgames.com (i18n, no reload).',
  permissions: ['storage'],
  background: {
    service_worker: 'background.js',
  },
  host_permissions: [
    'https://panaxgames.com/*',
    'https://www.panaxgames.com/*',
    'https://api.opencritic.com/*',
    'https://store.steampowered.com/*',
    'https://api.steampowered.com/*',
    'https://www.metacritic.com/*',
    'https://protondb.max-p.me/*',
    'https://www.protondb.com/*',
    'https://steamcharts.com/*',
    'https://open.er-api.com/*',
  ],
  icons: {
    '16': 'icons/16.png',
    '48': 'icons/48.png',
    '128': 'icons/128.png',
  },
  action: {
    default_title: 'PANAX RU',
    default_popup: 'popup.html',
    default_icon: {
      '16': 'icons/16.png',
      '48': 'icons/48.png',
      '128': 'icons/128.png',
    },
  },
  content_scripts: [
    {
      matches: ['https://panaxgames.com/*', 'https://www.panaxgames.com/*'],
      js: ['content.js'],
      run_at: 'document_start',
      all_frames: true,
      world: 'ISOLATED',
    },
    {
      matches: ['https://panaxgames.com/*', 'https://www.panaxgames.com/*'],
      js: ['content.js'],
      run_at: 'document_start',
      all_frames: true,
      world: 'MAIN',
    },
  ],
};

manifest.web_accessible_resources = [
  {
    resources: ['ratings/*.png', 'logo/*.png'],
    matches: ['https://panaxgames.com/*', 'https://www.panaxgames.com/*'],
  },
];

writeFileSync(join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

const ratingsSrc = join(root, 'assets', 'ratings');
const ratingsDest = join(dist, 'ratings');
if (existsSync(ratingsSrc)) {
  mkdirSync(ratingsDest, { recursive: true });
  cpSync(ratingsSrc, ratingsDest, { recursive: true });
}

const logoSrc = join(root, 'assets', 'logo');
const logoDest = join(dist, 'logo');
if (existsSync(logoSrc)) {
  mkdirSync(logoDest, { recursive: true });
  cpSync(logoSrc, logoDest, { recursive: true });
}

cpSync(join(root, 'src', 'popup.html'), join(dist, 'popup.html'));
cpSync(join(root, 'src', 'popup.js'), join(dist, 'popup.js'));
if (existsSync(join(root, 'src', 'background.js'))) {
  cpSync(join(root, 'src', 'background.js'), join(dist, 'background.js'));
}

for (const size of [16, 48, 128]) {
  const src = join(root, 'icons', `${size}.png`);
  if (existsSync(src)) cpSync(src, join(dist, 'icons', `${size}.png`));
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
console.log(`panax-ru@${pkg.version} → dist/content.js`);
