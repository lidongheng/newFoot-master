/**
 * 系统模块路由
 */
const router = require('koa-router')()
const { systemController } = require('../../controllers')

// 获取系统时间
router.get('/time', systemController.getTime)

module.exports = router
