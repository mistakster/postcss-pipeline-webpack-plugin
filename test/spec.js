const criticalSplit = require('postcss-critical-split');
const csso = require('postcss-csso');
const postcss = require('postcss');
const PostCssPipelineWebpackPlugin = require('../lib/postcss-pipeline-webpack-plugin');
const { RawSource, SourceMapSource } = require('webpack').sources;
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const nullPlugin = require('./helpers/postcss-null-plugin');

function readFile(name) {
  return new Promise((resolve, reject) => {
    fs.readFile(name, 'utf8', (err, sourceData) => {
      if (err) {
        return reject(err);
      }

      fs.readFile(name + '.map', 'utf8', (err, mapData) => {
        if (err) {
          return resolve(new RawSource(sourceData));
        }

        return resolve(new SourceMapSource(sourceData, name, mapData));
      });
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
        const plugin = new PostCssPipelineWebpackPlugin({
          processor: postcss([nullPlugin])
        });

        return plugin.executePipeline({
          './styles.css': source
        });
      })
      .then(assets => {
        const keys = Object.keys(assets);

        assert.deepStrictEqual(keys, [
          './styles.css',
          './styles.processed.css'
        ]);

        assert.strictEqual(
          assets[keys[0]].source().toString(),
          assets[keys[1]].source().toString()
        );
      });
  });

  it('should generate properly named files', function () {
    const plugin = new PostCssPipelineWebpackPlugin({
      processor: postcss([nullPlugin]),
      suffix: 'min'
    });

    return plugin
      .executePipeline({
        './styles.css': new RawSource('')
      })
      .then(assets => {
        const keys = Object.keys(assets);

        assert.deepStrictEqual(keys, [
          './styles.css',
          './styles.min.css'
        ]);
      });
  });

  it('should generate properly named files when suffix is undefined', function () {
    const plugin = new PostCssPipelineWebpackPlugin({
      processor: postcss([nullPlugin]),
      suffix: undefined
    });

    return plugin
      .executePipeline({
        './styles.css': new RawSource('')
      })
      .then(assets => {
        const keys = Object.keys(assets);

        assert.deepStrictEqual(keys, [
          './styles.css'
        ]);
      });
  });

  it('should process files with query params', function () {
    const plugin = new PostCssPipelineWebpackPlugin({
      processor: postcss([nullPlugin])
    });

    return plugin
      .executePipeline({
        './styles.js': new RawSource(''),
        './styles.css?hash': new RawSource(''),
        './foobar.css': new RawSource('')
      })
      .then(assets => {
        const keys = Object.keys(assets);

        assert.deepStrictEqual(keys, [
          './styles.js',
          './styles.css?hash',
          './foobar.css',
          './styles.processed.css?hash',
          './foobar.processed.css'
        ]);
      })
  });

  it('should filter files to process', function () {
    const plugin = new PostCssPipelineWebpackPlugin({
      processor: postcss([nullPlugin]),
      predicate: name => /foobar\.css$/.test(name)
    });

    return plugin
      .executePipeline({
        './styles.js': new RawSource(''),
        './styles.css': new RawSource(''),
        './foobar.css': new RawSource('')
      })
      .then(assets => {
        const keys = Object.keys(assets);

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
      processor: postcss([nullPlugin]),
      map: {
        inline: false
      }
    });

    return plugin
      .executePipeline({
        './styles.css': new RawSource('')
      })
      .then(assets => {
        const keys = Object.keys(assets);

        assert.deepStrictEqual(keys, [
          './styles.css',
          './styles.processed.css'
        ]);

        assert.strictEqual(
          assets[keys[1]].source().toString(),
          '\n/*# sourceMappingURL=styles.processed.css.map */'
        );

        assert.strictEqual(
          JSON.stringify(assets[keys[1]].map()),
          '{"version":3,"sources":[],"names":[],"mappings":"","file":"styles.processed.css"}'
        );
      });
  });

  it('should pass sources through pipeline correctly', function () {
    return getFixture()
      .then(source => ({
        './styles.css': source
      }))
      .then(assets => {
        const plugin = new PostCssPipelineWebpackPlugin({
          suffix: 'critical',
          processor: postcss([
            criticalSplit({
              output: criticalSplit.output_types.CRITICAL_CSS
            })
          ])
        });

        return plugin.executePipeline(assets);
      })
      .then(assets => {
        const plugin = new PostCssPipelineWebpackPlugin({
          suffix: 'min',
          processor: postcss([
            csso({
              restructure: false
            })
          ]),
          map: {
            inline: false
          }
        });

        return plugin.executePipeline(assets);
      })
      .then(assets => {
        const keys = Object.keys(assets);

        assert.deepStrictEqual(keys, [
          './styles.css',
          './styles.critical.css',
          './styles.min.css',
          './styles.critical.min.css'
        ]);

        return Promise.all(keys.map(name => {
          const asset = assets[name];
          const expectedSourceName = path.join('./test/fixtures', name);

          return readFile(expectedSourceName)
            .then(file => {
              assert.strictEqual(asset.source(), file.source());
              assert.strictEqual(JSON.stringify(asset.map()), JSON.stringify(file.map()));
            });
        }));
      });
  });
});
