const assert = require('assert');
const path = require('path');
const MemoryFS = require('memory-fs');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const PostCssPipelineWebpackPlugin = require('../lib/postcss-pipeline-webpack-plugin');
const criticalSplit = require('postcss-critical-split');
const csso = require('postcss-csso');

const destPath = path.resolve('./dest/');

function runner(config) {
  const fs = new MemoryFS();
  const compiler = webpack(config);

  compiler.outputFileSystem = fs;

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        return reject(err);
      }

      const jsonStats = stats.toJson();

      if (jsonStats.errors.length > 0) {
        return reject(new Error(jsonStats.errors[0]));
      }

      if (jsonStats.warnings.length > 0) {
        return reject(new Error(jsonStats.warnings[0]));
      }

      resolve(fs);
    })
  });
}

const baseConfig = {
  entry: './test/fixtures/main.css',

  output: {
    path: destPath,
    filename: '[name].js'
  },

  // 'source-map', 'inline-source-map', 'cheap-module-source-map'
  devtool: 'source-map',

  module: {
    rules: [{
      test: /\.css$/,
      use: ExtractTextPlugin.extract({
        fallback: "style-loader",
        use: {
          loader: "css-loader",
          options: {
            sourceMap: true,
            autoprefixer: false
          }
        }
      })
    }]
  },

  plugins: [
    new ExtractTextPlugin('styles.css')
  ]
};

function buildConfig(plugins, options) {
  return Object.assign({}, baseConfig, {
    plugins: baseConfig.plugins.concat(plugins)
  }, options);
}

function readMap(fs, filename) {
  return Promise.resolve(
    JSON.parse(
      fs.readFileSync(
        path.resolve(destPath, filename)
      ).toString()
    )
  );
}

describe('Integration test', function () {
  this.timeout(5000);

  it('should generate expected files', function () {
    const config = buildConfig([
      new PostCssPipelineWebpackPlugin({
        map: {
          inline: false
        }
      })
    ], {
      devtool: 'source-map'
    });

    return runner(baseConfig)
      .then(fs => {
        const files = fs.readdirSync(destPath);

        assert.equal(files.length, 4);
        assert(files.indexOf('styles.css') >= 0, 'Generated styles is missing');
        assert(files.indexOf('styles.css.map') >= 0, 'Source map for the styles is missing');

        return readMap(fs, 'styles.css.map')
          .then(map => {
            const sources = map.sources;

            assert(sources.some(s => /fixtures\/main.css$/.test(s)), 'Main styles is missing in the source map');
            assert(sources.some(s => /fixtures\/partial.css$/.test(s)), 'Partial styles is missing in the source map');
          });
      });
  });

  it('should pass generated map files to the plugin', function () {
    const config = buildConfig([
      new PostCssPipelineWebpackPlugin({
        suffix: 'critical',
        pipeline: [
          criticalSplit({
            output: criticalSplit.output_types.CRITICAL_CSS
          })
        ]
      }),
      new PostCssPipelineWebpackPlugin({
        suffix: 'min',
        pipeline: [
          csso({
            restructure: false
          })
        ],
        map: {
          inline: false
        }
      })
    ], {
      devtool: 'source-map'
    });

    return runner(config)
      .then(fs => {
        const files = fs.readdirSync(destPath);

        assert.equal(files.length, 10);
        assert(files.indexOf('styles.css') >= 0, 'Generated styles is missing');
        assert(files.indexOf('styles.css.map') >= 0, 'Source map for the styles is missing');
        assert(files.indexOf('styles.critical.css') >= 0, 'Generated critical styles is missing');
        assert(files.indexOf('styles.critical.css.map') >= 0, 'Source map for the critical styles is missing');
        assert(files.indexOf('styles.min.css') >= 0, 'Optimized styles is missing');
        assert(files.indexOf('styles.min.css.map') >= 0, 'Source map for the optimized styles is missing');
        assert(files.indexOf('styles.critical.min.css') >= 0, 'Optimized critical styles is missing');
        assert(files.indexOf('styles.critical.min.css.map') >= 0, 'Source map for the optimized critical styles is missing');

        return readMap(fs, 'styles.css.map')
          .then(map => {
            const sources = map.sources;

            assert(sources.some(s => /fixtures\/main.css$/.test(s)), 'Main styles is missing in the source map');
            assert(sources.some(s => /fixtures\/partial.css$/.test(s)), 'Partial styles is missing in the source map');
          })
          .then(() => readMap(fs, 'styles.critical.css.map'))
          .then(map => {
            const sources = map.sources;

            assert(sources.some(s => /fixtures\/main.css$/.test(s)), 'Main styles is missing in the source map');
            assert(!sources.some(s => /fixtures\/partial.css$/.test(s)), 'Partial styles is present in the source map');
          })
          .then(() => readMap(fs, 'styles.min.css.map'))
          .then(map => {
            const sources = map.sources;

            assert(sources.some(s => /fixtures\/main.css$/.test(s)), 'Main styles is missing in the source map');
            assert(sources.some(s => /fixtures\/partial.css$/.test(s)), 'Partial styles is missing in the source map');
          })
          .then(() => readMap(fs, 'styles.critical.min.css.map'))
          .then(map => {
            const sources = map.sources;

            assert(sources.some(s => /fixtures\/main.css$/.test(s)), 'Main styles is missing in the source map');
            assert(!sources.some(s => /fixtures\/partial.css$/.test(s)), 'Partial styles is present in the source map');
          })
      });
  });

  it('should deal with inline maps', function () {
    const config = buildConfig([
      new PostCssPipelineWebpackPlugin({
        suffix: 'critical',
        pipeline: [
          criticalSplit({
            output: criticalSplit.output_types.CRITICAL_CSS
          })
        ]
      }),
      new PostCssPipelineWebpackPlugin({
        suffix: 'min',
        pipeline: [
          csso({
            restructure: false
          })
        ],
        map: {
          inline: false
        }
      })
    ], {
      devtool: 'inline-source-map'
    });

    return runner(config)
      .then(fs => {
        const files = fs.readdirSync(destPath);

        assert.equal(files.length, 7);
        assert(files.indexOf('styles.css') >= 0, 'Generated styles is missing');
        assert(files.indexOf('styles.critical.css') >= 0, 'Generated critical styles is missing');
        assert(files.indexOf('styles.min.css') >= 0, 'Optimized styles is missing');
        assert(files.indexOf('styles.min.css.map') >= 0, 'Source map for the optimized styles is missing');
        assert(files.indexOf('styles.critical.min.css') >= 0, 'Optimized critical styles is missing');
        assert(files.indexOf('styles.critical.min.css.map') >= 0, 'Source map for the optimized critical styles is missing');

        return readMap(fs, 'styles.min.css.map')
          .then(map => {
            const sources = map.sources;

            assert(sources.some(s => /fixtures\/main.css$/.test(s)), 'Main styles is missing in the source map');
            assert(sources.some(s => /fixtures\/partial.css$/.test(s)), 'Partial styles is missing in the source map');
          })
          .then(() => readMap(fs, 'styles.critical.min.css.map'))
          .then(map => {
            const sources = map.sources;

            assert(sources.some(s => /fixtures\/main.css$/.test(s)), 'Main styles is missing in the source map');
            assert(!sources.some(s => /fixtures\/partial.css$/.test(s)), 'Partial styles is present in the source map');
          })
      });
  });
});
