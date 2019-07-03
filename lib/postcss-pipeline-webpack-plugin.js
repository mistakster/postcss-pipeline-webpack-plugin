const path = require('path');
const RawSource = require('webpack-sources').RawSource;

const MASK = /\.css(\?.+)?$/;

function getTargetFileName(name, prefix, suffix) {
  const pathObject = path.parse(name);

  return path.format(Object.assign(pathObject, {
    base: null,
    name: (prefix ? prefix + '.' : '') + pathObject.name + (suffix ? '.' + suffix : '')
  }));
}

/**
 * @param {Object} options.processor is a PostCSS processor instance
 * @param {Function} [options.predicate] is a function invoked per CSS file
 * @param {Function} [options.transformName] is a function which returns a new filename for the processed asset
 * @param {String} [options.suffix] is a string attached to the end of a new file (i.e. style.suffix.css, defaults to 'processed')
 * @param {String} [options.prefix] is a string attached to the beginning of a new file (i.e. prefix.style.css)
 * @param {Object} [options.map] is a PostCSS source maps configuration
 */
function PostCssPipelineWebpackPlugin(options) {
  if (!options.processor) {
    throw new Error('You must provide a PostCSS processor instance');
  }

  this._options = Object.assign({
    predicate: () => true,
    suffix: 'processed',
    prefix: ''
  }, options);
}

PostCssPipelineWebpackPlugin.prototype.apply = function (compiler) {
  compiler.hooks.emit.tapPromise('PostCssPipelineWebpackPlugin', this.generate.bind(this));
};

PostCssPipelineWebpackPlugin.prototype.generate = function (compilation) {
  const _options = this._options;
  const predicate = _options.predicate;
  const transformName = _options.transformName;
  const suffix = _options.suffix;
  const prefix = _options.prefix;
  const processor = _options.processor;
  const map = _options.map;

  return Promise
    .all(
      Object.keys(compilation.assets)
        .filter(k => (
          MASK.test(k) && predicate(k)
        ))
        .map(name => {
          const prevMap = compilation.assets[name + '.map'];

          const destFilename = typeof transformName === 'function'
            ? transformName(name)
            : getTargetFileName(name, prefix, suffix);

          return {
            from: name,
            to: destFilename,
            map: prevMap ? Object.assign({prev: prevMap.source()}, map) : map
          }
        })
        .map(options => (
          processor
            .process(compilation.assets[options.from].source(), options)
            .then(result => {
              compilation.assets[options.to] = new RawSource(result.css);

              if (result.map) {
                compilation.assets[options.to + '.map'] = new RawSource(result.map.toString());
              }
            })
        ))
    )
    .then(() => compilation);
};

module.exports = PostCssPipelineWebpackPlugin;
