const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const defaultBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : [config.resolver.blockList].filter(Boolean);

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

config.resolver.blockList = [
  ...defaultBlockList,
  new RegExp('^' + escapeRegExp(path.resolve(__dirname, 'services')) + '/.*'),
  new RegExp('^' + escapeRegExp(path.resolve(__dirname, 'admin-portal')) + '/.*'),
  new RegExp('^' + escapeRegExp(path.resolve(__dirname, 'vendor-portal')) + '/.*'),
  new RegExp('^' + escapeRegExp(path.resolve(__dirname, 'docs')) + '/.*'),
  new RegExp('^' + escapeRegExp(path.resolve(__dirname, 'output')) + '/.*'),
  new RegExp('^' + escapeRegExp(path.resolve(__dirname, 'tmp')) + '/.*'),
  new RegExp('^' + escapeRegExp(path.resolve(__dirname, '.env.example')) + '$'),
];

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'expo-modules-core': path.resolve(__dirname, 'node_modules/expo/node_modules/expo-modules-core'),
};

module.exports = config;
