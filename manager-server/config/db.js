/**
 * MongoDB 数据库连接模块
 */
const mongoose = require('mongoose')
const config = require('./index')
const log4js = require('../utils/log4j')

/**
 * 连接数据库
 */
async function connect() {
  try {
    await mongoose.connect(config.mongo.uri, config.mongo.options)
    log4js.info('MongoDB 连接成功: ' + config.mongo.uri)
    console.log('✅ MongoDB 连接成功')
  } catch (err) {
    log4js.error('MongoDB 连接失败: ' + err.message)
    console.error('❌ MongoDB 连接失败:', err.message)
    process.exit(1)
  }
}

// 连接事件监听
mongoose.connection.on('error', (err) => {
  log4js.error('MongoDB 连接错误: ' + err.message)
  console.error('MongoDB 连接错误:', err.message)
})

mongoose.connection.on('disconnected', () => {
  log4js.warn('MongoDB 连接断开')
  console.warn('MongoDB 连接断开')
})

mongoose.connection.on('reconnected', () => {
  log4js.info('MongoDB 重新连接成功')
  console.log('MongoDB 重新连接成功')
})

// 优雅关闭
process.on('SIGINT', async () => {
  await mongoose.connection.close()
  log4js.info('MongoDB 连接已关闭（应用退出）')
  process.exit(0)
})

module.exports = {
  connect,
  mongoose
}
