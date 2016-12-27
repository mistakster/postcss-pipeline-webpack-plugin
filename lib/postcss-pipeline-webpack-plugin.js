const RawSource = require('webpack-sources').RawSource;
const postcss = require('postcss');

const MASK = /\.css$/;

/**
 * @param {Function} options.predicate is a function invoked per CSS file
 * @param {String} options.suffix is a string attached to the new file
 * @param {Array} options.pipeline is a list of PostCSS plugins
 * @param {Object} options.map is a PostCSS source maps configuration
 */
function PostCssPipelineWebpackPlugin(options) {
  this._options = Object.assign({
    predicate: () => true,
    suffix: 'processed',
    pipeline: []
  }, options);
}

PostCssPipelineWebpackPlugin.prototype.apply = function (compiler) {
  compiler.plugin('emit', (compilation, callback) => (
    this.generate(compilation)
      .then(() => callback())
      .catch(err => callback(err))
  ));
};

PostCssPipelineWebpackPlugin.prototype.generate = function (compilation) {
  const _options = this._options;
  const predicate = _options.predicate;
  const suffix = _options.suffix;
  const pipeline = _options.pipeline;
  const map = _options.map;

  return Promise
    .all(
      Object.keys(compilation.assets)
        .filter(k => (
          MASK.test(k) && predicate(k)
        ))
        .map(name => {
          // check if external sourcemap file exists
          const prevMap = compilation.assets[name + '.map'];
          let mapOpt = Object.assign({}, map);
          // define previous map for postcss to use
          if (prevMap) {
            mapOpt.prev = prevMap.source();
          }

          return {
            from: name,
            to: suffix ? name.replace(MASK, '.' + suffix + '.css') : name,
            map: mapOpt
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
