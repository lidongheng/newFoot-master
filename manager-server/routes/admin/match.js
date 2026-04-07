/**
 * 比赛管理路由 - 后台管理
 */
const router = require('koa-router')()
const { matchAdminController } = require('../../controllers/admin')

// 获取比赛列表
router.get('/list', matchAdminController.getList)

// 获取比赛详情
router.get('/detail/:id', matchAdminController.getDetail)

// 创建比赛
router.post('/create', matchAdminController.create)

// 更新比赛
router.put('/update/:id', matchAdminController.update)

// 删除比赛
router.delete('/delete/:id', matchAdminController.delete)

// 批量删除比赛
router.post('/batch-delete', matchAdminController.batchDelete)

// 更新比赛状态
router.put('/status/:id', matchAdminController.updateStatus)

// 更新比分
router.put('/score/:id', matchAdminController.updateScore)

module.exports = router
