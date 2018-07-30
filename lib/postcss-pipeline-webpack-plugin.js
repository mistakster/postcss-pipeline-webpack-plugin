const path = require('path');
const RawSource = require('webpack-sources').RawSource;
const postcss = require('postcss');

const MASK = /\.css(\?.+)?$/;

function getTargetFileName(name, prefix, suffix) {
  const pathObject = path.parse(name);

  return path.format(Object.assign(pathObject, {
    base: null,
    name: (prefix ? prefix + '.' : '') + pathObject.name + (suffix ? '.' + suffix : '')
  }));
}

/**
 * @param {Function} options.predicate is a function invoked per CSS file
 * @param {String} options.suffix is a string attached to the end of a new file ie: style.suffix.css (Defaults to 'processed')
 * @param {String} options.prefix is a string attached to the beginning of a new file ie: prefix.style.css (Overrides Suffix)
 * @param {Array} options.pipeline is a list of PostCSS plugins
 * @param {Object} options.map is a PostCSS source maps configuration
 */
function PostCssPipelineWebpackPlugin(options) {
  this._options = Object.assign({
    predicate: () => true,
    suffix: 'processed',
    prefix: '',
    pipeline: []
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
  const pipeline = _options.pipeline;
  const map = _options.map;

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
            to: getTargetFileName(name, prefix, suffix),
            map: prevMap ? Object.assign({prev: prevMap.source()}, map) : map
          }
        })
        .map(options => (
          postcss(pipeline)
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
