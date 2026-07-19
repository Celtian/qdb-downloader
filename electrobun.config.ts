import type { ElectrobunConfig } from 'electrobun';
import packageJson from './package.json';

export default {
  app: {
    name: 'QDB Downloader',
    identifier: 'dev.celtian.qdb-downloader',
    version: packageJson.version,
    description: 'Date-based Transfermarkt football snapshots',
  },
  build: {
    bun: { entrypoint: 'projects/electrobun/desktop/main.ts' },
    copy: { 'dist/electrobun/browser': 'views/app' },
    targets: process.env['QDB_TARGETS'] ?? 'current',
    buildFolder: '.electrobun/build',
    artifactFolder: 'artifacts',
    watch: ['projects/electrobun/desktop', 'projects/electrobun/shared'],
    win: { icon: 'projects/electrobun/public/favicon.ico' },
  },
  release: { generatePatch: false },
} satisfies ElectrobunConfig;
