const { defineConfig } = require('@vue/cli-service')
const AutoImport = require('unplugin-auto-import/webpack')
const Components = require('unplugin-vue-components/webpack')
const { ElementPlusResolver } = require('unplugin-vue-components/resolvers')
const { VantResolver } = require('@vant/auto-import-resolver')

module.exports = defineConfig({
  publicPath: '/admin/',
  transpileDependencies: true,
  configureWebpack: {
    plugins: [
      AutoImport({
        resolvers: [ElementPlusResolver(), VantResolver()]
      }),
      Components({
        resolvers: [ElementPlusResolver(), VantResolver()]
      })
    ]
  },
  devServer: {
    port: 8082,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
