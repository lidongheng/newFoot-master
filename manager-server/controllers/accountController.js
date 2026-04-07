/**
 * 账户历史控制器
 */
const { accountService } = require('../services')
const { success, error, paramError } = require('../utils/response')

class AccountController {
  /**
   * 获取账户历史
   * GET /account/history
   */
  async getHistory(ctx) {
    try {
      const { startDate, endDate } = ctx.query
      
      if (!startDate || !endDate) {
        paramError(ctx, '缺少日期参数')
        return
      }
      
      // 验证日期格式
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        paramError(ctx, '日期格式错误，请使用 YYYY-MM-DD 格式')
        return
      }
      
      const history = await accountService.getHistory(startDate, endDate)
      success(ctx, history)
    } catch (err) {
      error(ctx, err.message)
    }
  }
}

module.exports = new AccountController()
