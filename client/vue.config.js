module.exports = {
  devServer: {
    proxy: 'http://localhost:33000'
  },
  configureWebpack: {
    devtool: 'source-map'
  }
};
