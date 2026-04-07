/**
 * 账户历史模块路由
 */
const router = require('koa-router')()
const { accountController } = require('../../controllers')

// 获取账户历史
router.get('/history', accountController.getHistory)

module.exports = router
