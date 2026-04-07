/**
 * API 路由汇总
 */
const router = require('koa-router')()
const config = require('../../config')

const matchRouter = require('./match')
const betRouter = require('./bet')
const accountRouter = require('./account')
const balanceRouter = require('./balance')
const systemRouter = require('./system')

// 使用 API 前缀
router.prefix(config.apiPrefix)

// 挂载各模块路由
router.use('/match', matchRouter.routes(), matchRouter.allowedMethods())
router.use('/bet', betRouter.routes(), betRouter.allowedMethods())
router.use('/account', accountRouter.routes(), accountRouter.allowedMethods())
router.use('/balance', balanceRouter.routes(), balanceRouter.allowedMethods())
router.use('/system', systemRouter.routes(), systemRouter.allowedMethods())

module.exports = router
