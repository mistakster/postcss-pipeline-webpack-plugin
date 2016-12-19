const PostCssPipelineWebpackPlugin = require('../lib/postcss-pipeline-webpack-plugin');
const RawSource = require('webpack-sources').RawSource;
const assert = require('assert');
const fs = require('fs');

function getFixture() {
  return new Promise((resolve, reject) => {
    fs.readFile('./test/fixtures/index.css', 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(new RawSource(data));
      }
    });
  });
}

describe('PostCss Pipeline Webpack Plugin', function () {
  it('should leave given CSS untouched with default options', function (done) {
    getFixture()
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
      })
      .then(done, done);
  });
});
