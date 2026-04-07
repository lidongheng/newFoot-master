/**
 * 额度控制器
 */
const quotaService = require('../services/balanceService')
const { success, error, paramError } = require('../utils/response')

class QuotaController {
  /**
   * 获取当前额度
   * GET /balance (保持原路由兼容)
   */
  async getQuota(ctx) {
    try {
      const quotaInfo = await quotaService.getQuotaInfo()
      success(ctx, {
        // 保持 balance 字段名兼容客户端
        balance: quotaInfo.quota,
        quota: quotaInfo.quota,
        quotaDate: quotaInfo.quotaDate,
        defaultQuota: quotaInfo.defaultQuota
      })
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 调整额度（管理员）
   * POST /balance/adjust
   */
  async adjustQuota(ctx) {
    try {
      const { amount, remark } = ctx.request.body
      
      if (amount === undefined || amount === null) {
        paramError(ctx, '缺少金额参数')
        return
      }
      
      const quota = await quotaService.adjustQuota(amount, remark)
      success(ctx, { 
        balance: quota,
        quota 
      })
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 重置额度（管理员）
   * POST /balance/reset
   */
  async resetQuota(ctx) {
    try {
      const { remark } = ctx.request.body || {}
      const quota = await quotaService.resetQuota(remark)
      success(ctx, { 
        balance: quota,
        quota 
      })
    } catch (err) {
      error(ctx, err.message)
    }
  }
}

module.exports = new QuotaController()
