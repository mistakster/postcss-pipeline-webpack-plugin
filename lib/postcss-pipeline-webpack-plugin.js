const RawSource = require('webpack-sources').RawSource;
const postcss = require('postcss');

const MASK = /\.css$/;

/**
 * @param {Function} options.predicate is a function invoked per CSS file
 * @param {String} options.suffix is a string attached to the new file
 * @param {Array} options.pipeline is a list of PostCSS plugins
 */
function PostCssPipelineWebpackPlugin(options) {
  this._options = Object.assign({
    predicate: () => true,
    suffix: 'processed',
    pipeline: []
  }, options);
}

PostCssPipelineWebpackPlugin.prototype.apply = function (compiler) {
  const options = this._options;

  compiler.plugin('emit', (compilation, callback) => (
    Promise
      .all(
        Object.keys(compilation.assets)
          .filter(k => (
            MASK.test(k) && options.predicate(k)
          ))
          .map(name => ({
            from: name,
            to: name.replace(MASK, '.' + options.suffix + '.css')
          }))
          .map(tuple => (
            postcss(options.pipeline)
              .process(compilation.assets[tuple.from].source(), tuple)
              .then(result => {
                compilation.assets[tuple.to] = new RawSource(result.css);
              })
          ))
      )
      .then(() => callback())
      .catch(err => callback(err))
  ));
};

module.exports = PostCssPipelineWebpackPlugin;
