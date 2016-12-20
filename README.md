# postcss-pipeline-webpack-plugin

[![Build Status](https://travis-ci.org/mistakster/postcss-pipeline-webpack-plugin.svg?branch=master)](https://travis-ci.org/mistakster/postcss-pipeline-webpack-plugin)

A [webpack] plugin to process generated assets with [PostCSS] pipeline.

## Preface

Webpack loaders are pretty cool but limited to process and generate only one file at a time.
If you are extracting critical CSS or media queries into the separate files,
you are no longer able to process these files. This plugin was made to solve this problem.

## Usage

```js
const PostCssPipelineWebpackPlugin = require('postcss-pipeline-webpack-plugin');

const pipelinePlugin = new PostCssPipelineWebpackPlugin({
  // provide an optional function to filter out unwanted CSS 
  predicate: name => /foobar.css$/.test(name),
  // provide an optional string which will be using as a suffix for newly generated files
  suffix: 'processed',
  // provide any PostCSS plugins here
  pipeline: [],
  // you can pass any relevant SourceMap options
  // see https://github.com/postcss/postcss/blob/master/docs/source-maps.md
  map: {}
});
```

So, you can use initialized instance of the plugin in webpack configuration later.

```js
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
    pipelinePlugin    
  ]
};
```

[PostCSS]: https://github.com/postcss/postcss
[webpack]: https://webpack.js.org
