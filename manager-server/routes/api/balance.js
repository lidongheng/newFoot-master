/**
 * 额度模块路由
 */
const router = require('koa-router')()
const { balanceController } = require('../../controllers')

// 获取当前额度
router.get('/', balanceController.getQuota)

// 调整额度（管理员）
router.post('/adjust', balanceController.adjustQuota)

// 重置额度（管理员）
router.post('/reset', balanceController.resetQuota)

module.exports = router
