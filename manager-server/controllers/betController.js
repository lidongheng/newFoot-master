/**
 * 投注控制器
 */
const { betService } = require('../services')
const { success, error, paramError } = require('../utils/response')

class BetController {
  /**
   * 提交投注
   * POST /bet/place
   */
  async placeBet(ctx) {
    try {
      const betData = ctx.request.body
      
      // 参数校验
      const requiredFields = ['matchId', 'league', 'homeTeam', 'awayTeam', 'betType', 'selection', 'odds', 'amount']
      for (const field of requiredFields) {
        if (betData[field] === undefined || betData[field] === null || betData[field] === '') {
          paramError(ctx, `缺少必填参数: ${field}`)
          return
        }
      }
      
      if (betData.amount <= 0) {
        paramError(ctx, '投注金额必须大于0')
        return
      }
      
      const order = await betService.placeBet(betData)
      success(ctx, order, '投注成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 获取待结算投注记录
   * GET /bet/pending
   */
  async getPendingBets(ctx) {
    try {
      const bets = await betService.getPendingBets()
      success(ctx, bets)
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 获取所有投注记录
   * GET /bet/records
   */
  async getBetRecords(ctx) {
    try {
      const { status, startDate, endDate } = ctx.query
      const records = await betService.getBetRecords({ status, startDate, endDate })
      success(ctx, records)
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 结算投注
   * POST /bet/settle/:orderId
   */
  async settleBet(ctx) {
    try {
      const { orderId } = ctx.params
      const { result, finalHomeScore, finalAwayScore } = ctx.request.body
      
      if (!orderId) {
        paramError(ctx, '缺少订单号')
        return
      }
      
      if (!result) {
        paramError(ctx, '缺少结算结果')
        return
      }
      
      const validResults = ['win', 'lose', 'push', 'half_win', 'half_lose']
      if (!validResults.includes(result)) {
        paramError(ctx, '无效的结算结果')
        return
      }
      
      const data = await betService.settleBet(orderId, result, finalHomeScore, finalAwayScore)
      success(ctx, data, '结算成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
}

module.exports = new BetController()
