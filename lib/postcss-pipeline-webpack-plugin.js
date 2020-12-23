const path = require('path');
const {
  Compilation,
  sources: {
    RawSource,
    SourceMapSource
  }
} = require('webpack');

const PLUGIN_NAME = 'PostCssPipelineWebpackPlugin';

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
  compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
    compilation.hooks.processAssets.tapPromise({
      name: PLUGIN_NAME,
      stage: Compilation.PROCESS_ASSETS_STAGE_DERIVED
    }, this.executePipeline.bind(this));
  });
};

PostCssPipelineWebpackPlugin.prototype.executePipeline = function (assets) {
  const _options = this._options;
  const predicate = _options.predicate;
  const transformName = _options.transformName;
  const suffix = _options.suffix;
  const prefix = _options.prefix;
  const processor = _options.processor;
  const map = _options.map;

  const tasks = Object.keys(assets)
    .filter(k => (
      MASK.test(k) && predicate(k)
    ))
    .map(name => {
      const destFilename = typeof transformName === 'function'
        ? transformName(name)
        : getTargetFileName(name, prefix, suffix);

      const prevMap = assets[name].map();

      return {
        from: name,
        to: destFilename,
        map: prevMap ? Object.assign({ prev: prevMap }, map) : map
      }
    })
    .map(options => {
      // console.log(options);

      return (
        processor
          .process(assets[options.from].source(), options)
          .then(({ css, map }) => {
            assets[options.to] = map
              ? new SourceMapSource(css, options.to, map.toJSON())
              : new RawSource(css);
          })
      );
    });

  return Promise.all(tasks)
    .then(() => assets);
};

module.exports = PostCssPipelineWebpackPlugin;
