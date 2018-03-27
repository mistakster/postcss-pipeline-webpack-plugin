const assert = require('assert');
const path = require('path');
const MemoryFS = require('memory-fs');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const PostCssPipelineWebpackPlugin = require('../lib/postcss-pipeline-webpack-plugin');

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

      fs.getAssets = function () {
        return jsonStats.assets.map(a => a.name);
      };

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

  module: {
    rules: [{
      test: /\.css$/,
      use: [
        MiniCssExtractPlugin.loader,
        'css-loader'
      ]
    }]
  },

  plugins: []
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

describe('Tests for different file names', function () {
  this.timeout(5000);

  it('should generate expected files for the template without query params', function () {
    const config = buildConfig([
      new MiniCssExtractPlugin({
        filename: '[name].[chunkhash].css'
      }),
      new PostCssPipelineWebpackPlugin()
    ]);

    return runner(config)
      .then(fs => {
        const files = fs.readdirSync(destPath);

        assert.equal(files.length, 3);
        assert(files.some(file => /^main\.[0-9a-f]{20}\.css$/.test(file)), 'Generated styles is missing');
        assert(files.some(file => /^main\.[0-9a-f]{20}\.processed.css$/.test(file)), 'Generated styles is missing');

        return fs;
      })
      .then(fs => {
        const assets = fs.getAssets();

        assert.equal(assets.length, 3);
        assert(assets.some(a => /^main\.[0-9a-f]{20}\.css$/.test(a)), 'Generated styles is missing');
        assert(assets.some(a => /^main\.[0-9a-f]{20}\.processed.css$/.test(a)), 'Generated styles is missing');
      });
  });

  it('should generate expected files for the template with query params', function () {
    const config = buildConfig([
      new MiniCssExtractPlugin({
        filename: '[name].css?[chunkhash]'
      }),
      new PostCssPipelineWebpackPlugin()
    ]);

    return runner(config)
      .then(fs => {
        const files = fs.readdirSync(destPath);

        assert.equal(files.length, 3);
        assert(files.some(file => /^main\.css$/.test(file)), 'Generated styles is missing');
        assert(files.some(file => /^main\.processed.css$/.test(file)), 'Generated styles is missing');

        return fs;
      })
      .then(fs => {
        const assets = fs.getAssets();

        assert.equal(assets.length, 3);
        assert(assets.some(a => /^main\.css\?[0-9a-f]{20}$/.test(a)), 'Generated styles is missing');
        assert(assets.some(a => /^main\.processed.css\?[0-9a-f]{20}$/.test(a)), 'Generated styles is missing');
      });
  });
});
