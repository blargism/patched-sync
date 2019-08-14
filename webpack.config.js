const webpack = require('webpack');
const path = require('path');

const core_config = {
    mode: 'production',
    devtool: 'none',
    entry: {
        bundle: './index.js',
    },
    output: {
        path: __dirname + '/dist/',
        filename: '[name].js'
    }
}

module.exports = core_config;