const webpack = require('webpack');
const path = require('path');
const bodyParser = require('body-parser');
const jiff = require('jiff');

const core_config = {
  mode: 'development',
  devtool: 'none',
  entry: {
    bundle: './test/test.js',
  },
  output: {
    path: __dirname + '/',
    filename: '[name].js'
  },
  devServer: {
    contentBase: __dirname,
    compress: true,
    port: 9000,
    //open: true,
    before: (app, server) => {
      app.use(bodyParser.urlencoded({ extended: false }));
      app.use(bodyParser.json());
      let test_1 = {
        a: 'a',
        b: 'b',
        c: 'c',
      };

      app.patch('/fetch/test/1', (req, res) => {
        const changed = jiff.patch(req.body || [], jiff.clone(test_1));
        test_1.b = 'not b';
        const diff = jiff.diff(changed, test_1);
        res.json(diff);
      });
    }
  }
}

module.exports = core_config;