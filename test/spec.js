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
  return readFile('./test/fixtures/styles.css');
}

describe('PostCss Pipeline Webpack Plugin', function () {
  it('should leave given CSS untouched with default options', function () {
    return getFixture()
      .then(source => {
        const plugin = new PostCssPipelineWebpackPlugin();

        return plugin.generate({
          assets: {
            './styles.css': source
          }
        });
      })
      .then(compilation => {
        const keys = Object.keys(compilation.assets);

        assert.deepStrictEqual(keys, [
          './styles.css',
          './styles.processed.css'
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
          './styles.css': new RawSource('')
        }
      })
      .then(compilation => {
        const keys = Object.keys(compilation.assets);

        assert.deepStrictEqual(keys, [
          './styles.css',
          './styles.min.css'
        ]);
      });
  });

  it('should generate properly named files when suffix is undefined', function () {
    const plugin = new PostCssPipelineWebpackPlugin({
      suffix: undefined
    });

    return plugin
      .generate({
        assets: {
          './styles.css': new RawSource('')
        }
      })
      .then(compilation => {
        const keys = Object.keys(compilation.assets);

        assert.deepStrictEqual(keys, [
          './styles.css'
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
          './styles.js': new RawSource(''),
          './styles.css': new RawSource(''),
          './foobar.css': new RawSource('')
        }
      })
      .then(compilation => {
        const keys = Object.keys(compilation.assets);

        assert.deepStrictEqual(keys, [
          './styles.js',
          './styles.css',
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
          './styles.css': new RawSource('')
        }
      })
      .then(compilation => {
        const keys = Object.keys(compilation.assets);

        assert.deepStrictEqual(keys, [
          './styles.css',
          './styles.processed.css',
          './styles.processed.css.map'
        ]);

        assert.strictEqual(
          compilation.assets[keys[1]].source().toString(),
          '\n/*# sourceMappingURL=styles.processed.css.map */'
        );
      });
  });

  it('should pass sources through pipeline correctly', function () {
    return getFixture()
      .then(source => ({
        assets: {
          './styles.css': source
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
          './styles.css',
          './styles.critical.css',
          './styles.min.css',
          './styles.min.css.map',
          './styles.critical.min.css',
          './styles.critical.min.css.map',
        ]);

        const fixtures = [
          './test/fixtures/styles.css',
          './test/fixtures/styles.critical.css',
          './test/fixtures/styles.min.css',
          './test/fixtures/styles.min.css.map',
          './test/fixtures/styles.critical.min.css',
          './test/fixtures/styles.critical.min.css.map',
        ];

        return Promise.all(fixtures.map(readFile))
          .then(files => {
            files.forEach((file, index) => {
              assert.strictEqual(
                compilation.assets[keys[index]].source().toString(),
                files[index].source().toString(),
                fixtures[index]
              );
            });
          });
      });
  });
});
