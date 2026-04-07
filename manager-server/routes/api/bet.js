/**
 * 投注模块路由
 */
const router = require('koa-router')()
const { betController } = require('../../controllers')

// 提交投注
router.post('/place', betController.placeBet)

// 获取待结算投注记录
router.get('/pending', betController.getPendingBets)

// 获取所有投注记录
router.get('/records', betController.getBetRecords)

// 结算投注（手动/测试用）
router.post('/settle/:orderId', betController.settleBet)

module.exports = router
