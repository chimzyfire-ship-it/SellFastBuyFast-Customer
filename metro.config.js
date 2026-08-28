const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure Metro resolver blocklist for Expo SDK 51 on macOS Monterey
config.resolver.blocklist = [
  /.*\/docs\/.*/,
  /.*\.PNG$/,
  /.*\.png$/,
];

module.exports = config;
