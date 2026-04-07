/**
 * 应用配置文件
 */
module.exports = {
  // MongoDB 配置
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/football',
    options: {
      // mongoose 8+ 不再需要这些选项，但保留以防使用旧版本
    }
  },
  
  // 服务器配置
  server: {
    port: process.env.PORT || 3000
  },
  
  // API 版本前缀
  apiPrefix: '/api/v1'
}
