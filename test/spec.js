const criticalSplit = require('postcss-critical-split');
const csso = require('postcss-csso');
const PostCssPipelineWebpackPlugin = require('../lib/postcss-pipeline-webpack-plugin');
const RawSource = require('webpack-sources').RawSource;
const assert = require('assert');
const fs = require('fs');

function readFile(name) {
  return new Promise((resolve, reject) => {
    fs.readFile(name, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(new RawSource(data));
      }
    });
  });
}

function getFixture() {
  return readFile('./test/fixtures/index.css');
}

describe('PostCss Pipeline Webpack Plugin', function () {
  it('should leave given CSS untouched with default options', function () {
    return getFixture()
      .then(source => {
        const plugin = new PostCssPipelineWebpackPlugin();

        return plugin.generate({
          assets: {
            './index.css': source
          }
        });
      })
      .then(compilation => {
        const keys = Object.keys(compilation.assets);

        assert.deepStrictEqual(keys, [
          './index.css',
          './index.processed.css'
        ]);

        assert.strictEqual(
          compilation.assets[keys[0]].source().toString(),
          compilation.assets[keys[1]].source().toString()
        );
      });
  });

  it('should generate properly named files', function () {
    const plugin = new PostCssPipelineWebpackPlugin({
      suffix: 'min'
    });

    return plugin
      .generate({
        assets: {
          './index.css': new RawSource('')
        }
      })
      .then(compilation => {
        const keys = Object.keys(compilation.assets);

        assert.deepStrictEqual(keys, [
          './index.css',
          './index.min.css'
        ]);
      });
  });

  it('should filter files to process', function () {
    const plugin = new PostCssPipelineWebpackPlugin({
      predicate: name => /foobar.css$/.test(name)
    });

    return plugin
      .generate({
        assets: {
          './index.js': new RawSource(''),
          './index.css': new RawSource(''),
          './foobar.css': new RawSource('')
        }
      })
      .then(compilation => {
        const keys = Object.keys(compilation.assets);

        assert.deepStrictEqual(keys, [
          './index.js',
          './index.css',
          './foobar.css',
          './foobar.processed.css'
        ]);
      });
  });

  it('should process SourceMaps as well', function () {
    const plugin = new PostCssPipelineWebpackPlugin({
      map: {
        inline: false
      }
    });

    return plugin
      .generate({
        assets: {
          './index.css': new RawSource('')
        }
      })
      .then(compilation => {
        const keys = Object.keys(compilation.assets);

        assert.deepStrictEqual(keys, [
          './index.css',
          './index.processed.css',
          './index.processed.css.map'
        ]);

        assert.strictEqual(
          compilation.assets[keys[1]].source().toString(),
          '\n/*# sourceMappingURL=index.processed.css.map */'
        );
      });
  });

  it('should pass sources through pipeline correctly', function () {
    return getFixture()
      .then(source => ({
        assets: {
          './index.css': source
        }
      }))
      .then(compilation => {
        const plugin = new PostCssPipelineWebpackPlugin({
          suffix: 'critical',
          pipeline: [
            criticalSplit({
              output: criticalSplit.output_types.CRITICAL_CSS
            })
          ]
        });

        return plugin.generate(compilation);
      })
      .then(compilation => {
        const plugin = new PostCssPipelineWebpackPlugin({
          suffix: 'min',
          pipeline: [
            csso({
              restructure: false
            })
          ],
          map: {
            inline: false
          }
        });

        return plugin.generate(compilation);
      })
      .then(compilation => {
        const keys = Object.keys(compilation.assets);

        assert.deepStrictEqual(keys, [
          './index.css',
          './index.critical.css',
          './index.min.css',
          './index.min.css.map',
          './index.critical.min.css',
          './index.critical.min.css.map',
        ]);

        const fixtures = [
          './test/fixtures/index.css',
          './test/fixtures/index.critical.css',
          './test/fixtures/index.min.css',
          './test/fixtures/index.critical.min.css'
        ];

        return Promise.all(fixtures.map(readFile))
          .then(files => {
            assert.strictEqual(
              compilation.assets[keys[0]].source().toString().replace(/\r\n/g, '\n'),
              files[0].source().toString().replace(/\r\n/g, '\n')
            );

            assert.strictEqual(
              compilation.assets[keys[1]].source().toString().replace(/\r\n/g, '\n'),
              files[1].source().toString().replace(/\r\n/g, '\n')
            );

            assert.strictEqual(
              compilation.assets[keys[2]].source().toString().replace(/\r\n/g, '\n'),
              files[2].source().toString().replace(/\r\n/g, '\n')
            );

            assert.strictEqual(
              compilation.assets[keys[4]].source().toString().replace(/\r\n/g, '\n'),
              files[3].source().toString().replace(/\r\n/g, '\n')
            );
          });
      });
  });
});
