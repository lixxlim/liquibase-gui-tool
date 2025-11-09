const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

module.exports = {
  packagerConfig: {
    icon: path.resolve(
      __dirname,
      isMac ? 'static/icons/icon.icns'
           : isWin ? 'static/icons/icon.ico'
                   : 'static/icons/png/icon_512.png'
    ),
    asar: {
      unpackDir: 'liquibase'
    },
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: { name: 'liquibase-gui-tool', icon: path.resolve(__dirname, 'static/icons/icon.ico') },
    },
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: { icon: path.resolve(__dirname, 'static/icons/icon.icns') }
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
