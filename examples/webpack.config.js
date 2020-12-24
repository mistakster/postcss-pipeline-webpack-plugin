const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const PostCssPipelineWebpackPlugin = require('../lib/postcss-pipeline-webpack-plugin');
const postcss = require('postcss');
const criticalSplit = require('postcss-critical-split');
const csso = require('postcss-csso');

module.exports = {
  mode: 'production',

  // devtool: 'source-map',

  entry: '../test/fixtures/main.css',

  output: {
    path: path.resolve('./dest/'),
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

  plugins: [
    new MiniCssExtractPlugin({
      filename: 'styles.css'
    }),
    // Stage #1: extract critical part of the styles
    new PostCssPipelineWebpackPlugin({
      predicate: (css) => {
        // We are interested only in the main styles.
        // So, let’s skip all other generated files.
        return css === 'styles.css';
      },
      processor: postcss([
        criticalSplit({
          output: criticalSplit.output_types.CRITICAL_CSS
        })
      ]),
      suffix: 'critical'
    }),
    // Stage #2: extract the rest of the styles
    new PostCssPipelineWebpackPlugin({
      predicate: (css) => {
        // We are interested only in the main styles.
        // So, let’s skip all other generated files.
        return css === 'styles.css';
      },
      processor: postcss([
        criticalSplit({
          output: criticalSplit.output_types.REST_CSS
        })
      ]),
      suffix: 'rest'
    }),
    // Stage #3: optimize generated files (styles.critical.css, styles.rest.css)
    new PostCssPipelineWebpackPlugin({
      predicate: (css) => {
        // Skip the main file. We won’t distribute it.
        return css !== 'styles.css';
      },
      processor: postcss([
        csso({
          restructure: false
        })
      ]),
      suffix: 'min',
      map: {
        inline: false
      }
    })
  ]
};
