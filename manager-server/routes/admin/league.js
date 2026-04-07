/**
 * 联赛管理路由 - 后台管理
 */
const router = require('koa-router')()
const { leagueAdminController } = require('../../controllers/admin')

// 获取联赛列表
router.get('/list', leagueAdminController.getList)

// 获取所有联赛（下拉选择用）
router.get('/all', leagueAdminController.getAll)

// 获取所有国家列表
router.get('/countries', leagueAdminController.getCountries)

// 获取联赛详情
router.get('/detail/:id', leagueAdminController.getDetail)

// 创建联赛
router.post('/create', leagueAdminController.create)

// 更新联赛
router.put('/update/:id', leagueAdminController.update)

// 删除联赛
router.delete('/delete/:id', leagueAdminController.delete)

// 批量删除联赛
router.post('/batch-delete', leagueAdminController.batchDelete)

module.exports = router
