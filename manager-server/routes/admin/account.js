/**
 * 账户管理路由 - 后台管理
 */
const router = require('koa-router')()
const { accountAdminController } = require('../../controllers/admin')

// 获取账户信息
router.get('/info', accountAdminController.getInfo)

// 设置账户余额
router.post('/set-balance', accountAdminController.setBalance)

// 获取余额变动日志
router.get('/balance-logs', accountAdminController.getBalanceLogs)

// 获取余额统计
router.get('/balance-stats', accountAdminController.getBalanceStats)

// 获取余额日志详情
router.get('/balance-log/:id', accountAdminController.getBalanceLogDetail)

// 更新余额日志
router.put('/balance-log/:id', accountAdminController.updateBalanceLog)

// 删除余额日志
router.delete('/balance-log/:id', accountAdminController.deleteBalanceLog)

// 批量删除余额日志
router.post('/balance-logs/batch-delete', accountAdminController.batchDeleteBalanceLogs)

module.exports = router
