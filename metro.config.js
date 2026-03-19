const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Required for mqtt.js (uses package.json "exports" field)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;