const postcss = require('postcss');

module.exports = postcss.plugin('postcss-null-plugin', () => root => Promise.resolve(root));
