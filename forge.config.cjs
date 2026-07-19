const { version } = require('./package.json');

module.exports = {
  packagerConfig: {
    asar: true,
    executableName: 'QDB Downloader',
    icon: 'resources/icons/qdb-downloader',
    ignore: [
      /^\/examples/,
      /^\/projects/,
      /^\/tools/,
      /^\/\.git/,
      /^\/\.angular/,
      /^\/\.electrobun/,
      /^\/coverage/,
      /^\/out/,
      /^\/out-tsc/,
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'qdb_downloader',
        setupExe: 'QDB-Downloader-Setup.exe',
        setupIcon: 'resources/icons/qdb-downloader.ico',
      },
    },
    { name: '@electron-forge/maker-zip', platforms: ['win32'] },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: { owner: 'Celtian', name: 'qdb-downloader' },
        draft: false,
        prerelease: version.includes('-'),
      },
    },
  ],
};
