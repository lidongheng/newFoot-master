/**
 * 后台管理 API 路由汇总
 */
const router = require('koa-router')()

const matchRouter = require('./match')
const leagueRouter = require('./league')
const betOrderRouter = require('./betOrder')
const accountRouter = require('./account')

// 使用 /api/v1/admin 前缀
router.prefix('/api/v1/admin')

// 挂载各模块路由
router.use('/match', matchRouter.routes(), matchRouter.allowedMethods())
router.use('/league', leagueRouter.routes(), leagueRouter.allowedMethods())
router.use('/bet-order', betOrderRouter.routes(), betOrderRouter.allowedMethods())
router.use('/account', accountRouter.routes(), accountRouter.allowedMethods())

module.exports = router
