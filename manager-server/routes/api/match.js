/**
 * 比赛模块路由
 */
const router = require('koa-router')()
const { matchController } = require('../../controllers')

// 获取滚球比赛列表
router.get('/live', matchController.getLiveMatches)

// 获取今日比赛列表
router.get('/today', matchController.getTodayMatches)

// 获取早盘联赛列表
router.get('/leagues', matchController.getLeagues)

// 获取早盘比赛列表
router.get('/early', matchController.getEarlyMatches)

module.exports = router
