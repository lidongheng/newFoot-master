/**
 * 投注订单管理路由 - 后台管理
 */
const router = require('koa-router')()
const { betOrderAdminController } = require('../../controllers/admin')

// 获取订单列表
router.get('/list', betOrderAdminController.getList)

// 获取统计数据
router.get('/stats', betOrderAdminController.getStats)

// 获取订单详情
router.get('/detail/:id', betOrderAdminController.getDetail)

// 创建订单
router.post('/create', betOrderAdminController.create)

// 更新订单
router.put('/update/:id', betOrderAdminController.update)

// 删除订单
router.delete('/delete/:id', betOrderAdminController.delete)

// 批量删除订单
router.post('/batch-delete', betOrderAdminController.batchDelete)

// 批量结算
router.post('/batch-settle', betOrderAdminController.batchSettle)

// 重新结算
router.post('/re-settle/:id', betOrderAdminController.reSettle)

// 取消订单
router.post('/cancel/:id', betOrderAdminController.cancel)

module.exports = router
