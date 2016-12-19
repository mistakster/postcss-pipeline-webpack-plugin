const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const PostCssPipelineWebpackPlugin = require('../lib/postcss-pipeline-webpack-plugin');
const criticalSplit = require('postcss-critical-split');
const csso = require('postcss-csso');

module.exports = {
  entry: './src/index.css',

  output: {
    path: path.resolve('./dest/'),
    filename: '[name].js'
  },

  module: {
    loaders: [
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract('style', 'css?sourceMap&-autoprefixer')
      }
    ]
  },

  plugins: [
    new ExtractTextPlugin('styles.css'),
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
  ]
};
