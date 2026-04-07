/**
 * 比赛控制器
 */
const { matchService } = require('../services')
const { success, error } = require('../utils/response')

class MatchController {
  /**
   * 获取滚球比赛列表
   * GET /match/live
   */
  async getLiveMatches(ctx) {
    try {
      const { sportId } = ctx.query
      const matches = await matchService.getLiveMatches(sportId)
      success(ctx, matches)
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 获取今日比赛列表
   * GET /match/today
   */
  async getTodayMatches(ctx) {
    try {
      const { sportId } = ctx.query
      const matches = await matchService.getTodayMatches(sportId)
      success(ctx, matches)
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 获取早盘联赛列表
   * GET /match/leagues
   */
  async getLeagues(ctx) {
    try {
      const leagues = await matchService.getLeagues()
      success(ctx, leagues)
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 获取早盘比赛列表
   * GET /match/early
   */
  async getEarlyMatches(ctx) {
    try {
      const { leagueIds } = ctx.query
      const matches = await matchService.getEarlyMatches(leagueIds)
      success(ctx, matches)
    } catch (err) {
      error(ctx, err.message)
    }
  }
}

module.exports = new MatchController()
