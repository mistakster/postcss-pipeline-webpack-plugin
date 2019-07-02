const path = require('path');
const RawSource = require('webpack-sources').RawSource;

const MASK = /\.css(\?.+)?$/;

function getTargetFileName(name, prefix, suffix, separator) {
  const pathObject = path.parse(name);
  const pos = pathObject.name.lastIndexOf(separator);
  const re = new RegExp('(' + separator +  '[a-f0-9]+$)');
  const hashed = re.test(pathObject.name);

  return path.format(Object.assign(pathObject, {
    base: null,
    name: (prefix ? prefix + separator : '') + (hashed ? [pathObject.name.slice(0, pos), (suffix ? separator + suffix : ''), pathObject.name.slice(pos)].join('') : pathObject.name + (suffix ? separator + suffix : '')),
  }));
}

/**
 * @param {Object} options.processor is a PostCSS processor instance
 * @param {Function} [options.predicate] is a function invoked per CSS file
 * @param {String} [options.suffix] is a string attached to the end of a new file (i.e. style.suffix.css, defaults to 'processed')
 * @param {String} [options.prefix] is a string attached to the beginning of a new file (i.e. prefix.style.css)
 * @param {String} [options.separator] is a string that change the separator element (i.e. dot or dash prefix-style.css)
 * @param {Object} [options.map] is a PostCSS source maps configuration
 */
function PostCssPipelineWebpackPlugin(options) {
  if (!options.processor) {
    throw new Error('You must provide a PostCSS processor instance');
  }

  this._options = Object.assign({
    predicate: () => true,
    suffix: 'processed',
    prefix: '',
    separator: '.',
    hashed: '.',
  }, options);
}

PostCssPipelineWebpackPlugin.prototype.apply = function (compiler) {
  compiler.hooks.emit.tapPromise('PostCssPipelineWebpackPlugin', this.generate.bind(this));
};

PostCssPipelineWebpackPlugin.prototype.generate = function (compilation) {
  const _options = this._options;
  const predicate = _options.predicate;
  const suffix = _options.suffix;
  const prefix = _options.prefix;
  const processor = _options.processor;
  const map = _options.map;
  const separator = _options.separator;

  return Promise
    .all(
      Object.keys(compilation.assets)
        .filter(k => (
          MASK.test(k) && predicate(k)
        ))
        .map(name => {
          const prevMap = compilation.assets[name + '.map'];

          return {
            from: name,
            to: getTargetFileName(name, prefix, suffix, separator),
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
