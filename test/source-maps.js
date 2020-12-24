const assert = require('assert');
const path = require('path');
const MemoryFS = require('memory-fs');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const postcss = require('postcss');
const nullPlugin = require('./helpers/postcss-null-plugin');
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
  mode: 'production',

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
      use: [
        MiniCssExtractPlugin.loader,
        'css-loader'
      ]
    }]
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: 'styles.css'
    })
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

describe.skip('Source map integration test', function () {
  this.timeout(5000);

  it('should generate expected files', function () {
    return runner(baseConfig)
      .then(fs => {
        const files = fs.readdirSync(destPath);

        assert.strictEqual(files.length, 3);
        assert(files.some(file => file === 'styles.css'), 'Generated styles is missing');
        assert(files.some(file => file === 'styles.css.map'), 'Source map for the styles is missing');

        return fs;
      })
      .then(fs => readMap(fs, 'styles.css.map'))
      .then(map => {
        const sources = map.sources;

        assert(sources.some(s => /fixtures\/main\.css$/.test(s)), 'Main styles is missing in the source map');
        assert(sources.some(s => /fixtures\/partial\.css$/.test(s)), 'Partial styles is missing in the source map');
      });
  });

  it('should generate expected files after a pipeline', function () {
    const config = buildConfig([
      new PostCssPipelineWebpackPlugin({
        processor: postcss([nullPlugin]),
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

        assert.strictEqual(files.length, 5);
        assert(files.some(file => file === 'styles.css'), 'Generated styles is missing');
        assert(files.some(file => file === 'styles.css.map'), 'Source map for the styles is missing');
        assert(files.some(file => file === 'styles.processed.css'), 'Generated styles is missing');
        assert(files.some(file => file === 'styles.processed.css.map'), 'Source map for the styles is missing');

        return fs;
      })
      .then(fs => {
        const file1 = fs.readFileSync(path.resolve(destPath, 'styles.css'))
          .toString()
          .replace(/\s+\/\*# sourceMappingURL=styles.css.map\*\//, '');
        const file2 = fs.readFileSync(path.resolve(destPath, 'styles.processed.css'))
          .toString()
          .replace(/\s+\/\*# sourceMappingURL=styles.processed.css.map \*\//, '');

        assert.strictEqual(file1, file2, 'The content of the generated files doesn\'t match');

        return fs;
      })
      .then(fs => readMap(fs, 'styles.css.map'))
      .then(map => {
        const sources = map.sources;

        assert(sources.some(s => /fixtures\/main\.css$/.test(s)), 'Main styles is missing in the source map');
        assert(sources.some(s => /fixtures\/partial\.css$/.test(s)), 'Partial styles is missing in the source map');
      });
  });

  it('should pass generated map files to the plugin', function () {
    const config = buildConfig([
      new PostCssPipelineWebpackPlugin({
        suffix: 'critical',
        processor: postcss([
          criticalSplit({
            output: criticalSplit.output_types.CRITICAL_CSS
          })
        ])
      }),
      new PostCssPipelineWebpackPlugin({
        suffix: 'min',
        processor: postcss([
          csso({
            restructure: false
          })
        ]),
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

        assert.strictEqual(files.length, 10);
        assert(files.some(file => file === 'styles.css'), 'Generated styles is missing');
        assert(files.some(file => file === 'styles.css.map'), 'Source map for the styles is missing');
        assert(files.some(file => file === 'styles.critical.css'), 'Generated critical styles is missing');
        assert(files.some(file => file === 'styles.critical.css.map'), 'Source map for the critical styles is missing');
        assert(files.some(file => file === 'styles.min.css'), 'Optimized styles is missing');
        assert(files.some(file => file === 'styles.min.css.map'), 'Source map for the optimized styles is missing');
        assert(files.some(file => file === 'styles.critical.min.css'), 'Optimized critical styles is missing');
        assert(files.some(file => file === 'styles.critical.min.css.map'), 'Source map for the optimized critical styles is missing');

        return fs;
      })
      .then(fs => readMap(fs, 'styles.css.map')
        .then(map => {
          const sources = map.sources;

          assert(sources.some(s => /fixtures\/main\.css$/.test(s)), 'Main styles is missing in the source map');
          assert(sources.some(s => /fixtures\/partial\.css$/.test(s)), 'Partial styles is missing in the source map');
        })
        .then(() => fs)
      )
      .then(fs => readMap(fs, 'styles.critical.css.map')
        .then(map => {
          const sources = map.sources;

          assert(sources.some(s => /fixtures\/main\.css$/.test(s)), 'Main styles is missing in the source map');
          assert(!sources.some(s => /fixtures\/partial\.css$/.test(s)), 'Partial styles is present in the source map');
        })
        .then(() => fs)
      )
      .then(fs => readMap(fs, 'styles.min.css.map')
        .then(map => {
          const sources = map.sources;

          assert(sources.some(s => /fixtures\/main\.css$/.test(s)), 'Main styles is missing in the source map');
          assert(sources.some(s => /fixtures\/partial\.css$/.test(s)), 'Partial styles is missing in the source map');
        })
        .then(() => fs)
      )
      .then(fs => readMap(fs, 'styles.critical.min.css.map')
        .then(map => {
          const sources = map.sources;

          assert(sources.some(s => /fixtures\/main\.css$/.test(s)), 'Main styles is missing in the source map');
          assert(!sources.some(s => /fixtures\/partial\.css$/.test(s)), 'Partial styles is present in the source map');
        })
        .then(() => fs)
      );
  });

  it('should deal with inline maps', function () {
    const config = buildConfig([
      new PostCssPipelineWebpackPlugin({
        suffix: 'critical',
        processor: postcss([
          criticalSplit({
            output: criticalSplit.output_types.CRITICAL_CSS
          })
        ])
      }),
      new PostCssPipelineWebpackPlugin({
        suffix: 'min',
        processor: postcss([
          csso({
            restructure: false
          })
        ]),
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

        assert.strictEqual(files.length, 7);
        assert(files.some(file => file === 'styles.css'), 'Generated styles is missing');
        assert(files.some(file => file === 'styles.critical.css'), 'Generated critical styles is missing');
        assert(files.some(file => file === 'styles.min.css'), 'Optimized styles is missing');
        assert(files.some(file => file === 'styles.min.css.map'), 'Source map for the optimized styles is missing');
        assert(files.some(file => file === 'styles.critical.min.css'), 'Optimized critical styles is missing');
        assert(files.some(file => file === 'styles.critical.min.css.map'), 'Source map for the optimized critical styles is missing');

        return fs;
      })
      .then(fs => readMap(fs, 'styles.min.css.map')
        .then(map => {
          const sources = map.sources;

          assert(sources.some(s => /fixtures\/main\.css$/.test(s)), 'Main styles is missing in the source map');
          assert(sources.some(s => /fixtures\/partial\.css$/.test(s)), 'Partial styles is missing in the source map');
        })
        .then(() => fs)
      )
      .then(fs => readMap(fs, 'styles.critical.min.css.map')
        .then(map => {
          const sources = map.sources;

          assert(sources.some(s => /fixtures\/main\.css$/.test(s)), 'Main styles is missing in the source map');
          assert(!sources.some(s => /fixtures\/partial\.css$/.test(s)), 'Partial styles is present in the source map');
        })
        .then(() => fs)
      );
  });
});
