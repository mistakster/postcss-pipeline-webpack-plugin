# postcss-pipeline-webpack-plugin

[![Build Status](https://travis-ci.org/mistakster/postcss-pipeline-webpack-plugin.svg?branch=master)](https://travis-ci.org/mistakster/postcss-pipeline-webpack-plugin)

A [webpack] plugin to process generated assets with [PostCSS] pipeline.

## Preface

Webpack loaders are pretty cool but limited to process and generate only one file at a time.
If you are extracting critical CSS or media queries into separate files,
you are no longer able to process these files. This plugin was made to solve this problem.

## Install

```
npm install --save postcss-pipeline-webpack-plugin 
```

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

So, you can use this initialized instance of the plugin in webpack configuration later.

```js
module.exports = {
  entry: './src/index.css',

  output: {
    path: path.resolve('./dest/'),
    filename: '[name].js'
  },

  module: {
    rules: [
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: "style-loader",
          use: "css-loader"
        })
      }
    ]
  },

  plugins: [
    new ExtractTextPlugin('styles.css'),
    pipelinePlugin    
  ]
};
```

## Advanced techniques

For example, you may want to process your styles with [postcss-critical-css] plugin.
It generates an additional file, which contains only styles between start- and stop-tags.
You can’t use the optimization of generated styles before the plugin because minification removes all comments.
So, you have to minify “all” and “critical” parts separately.

It’s pretty easy with **postcss-pipeline-webpack-plugin**. You can provide as many PostCSS pipelines as you need.

For your task, we need to set up two pipelines with one plugin in each other:

* postcss-critical-split
* postcss-csso 
 
```js
const PostCssPipelineWebpackPlugin = require('postcss-pipeline-webpack-plugin');
const criticalSplit = require('postcss-critical-split');
const csso = require('postcss-csso');

module.exports = {
  // ...  
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
```

1) Webpack extracts all CSS into:

```text
styles.css
```

2) PostCSS generates critical CSS into `styles.critical.css`. So, you get two files:

```text
styles.css
styles.critical.css
```

3) PostCSS optimize both files with [csso] and create relevant SourceMaps for them:

```text
styles.css
styles.critical.css
styles.min.css
styles.min.css.map
styles.critical.min.css
styles.critical.min.css.map
```

As you can see, webpack generates artifacts in **one pass**. 

See full [webpack.config.js](./examples/webpack.config.js) for more details.

## Change log

### 3.0.0

> 2017-05-30

- *[breaking]* set minimal required node.js version to 4.7
- *[breaking]* upgraded PostCSS and other minor dependencies

### 2.0.0

> 2017-03-20

- *[breaking]* switched to webpack 2 and upgraded minor dependencies

### 1.2.0

> 2016-12-28

- *[fix]* added previously generated Source Maps

### 1.1.0

> 2016-12-27

- *[feature]* `suffix` can contain any falsy value to skip rename
- *[fix]* added module.exports to main file

### 1.0.0

> 2016-12-20

- initial release

## License

ISC

[PostCSS]: https://github.com/postcss/postcss
[webpack]: https://webpack.js.org
[postcss-critical-css]: https://medium.com/@nocreativity/manage-your-critical-css-with-this-postcss-plugin-6be1ca226c06#.abnvj11p7
[csso]: https://github.com/css/csso
