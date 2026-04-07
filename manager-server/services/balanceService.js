/**
 * 额度业务逻辑服务
 * 
 * 业务规则：
 * - 额度默认 50000，每天北京时间 12:00 自动重置
 * - 投注扣减额度
 * - 不管投注结果是赢、输还是走，额度不增加
 * - 额度只减不增（除了每日重置）
 */
const { Account, QuotaLog } = require('../models')

class QuotaService {
  /**
   * 获取当前额度
   * 自动检查并执行每日重置
   */
  async getQuota() {
    const account = await Account.getAccount()
    return account.quota
  }
  
  /**
   * 获取额度信息（包含更多详情）
   */
  async getQuotaInfo() {
    const account = await Account.getAccount()
    return {
      quota: account.quota,
      quotaDate: account.lastResetDate,
      defaultQuota: Account.getDefaultQuota()
    }
  }
  
  /**
   * 投注扣减额度
   * @param {number} amount - 投注金额
   * @param {string} orderId - 订单号
   */
  async deductForBet(amount, orderId) {
    const account = await Account.getAccount()
    const quotaBefore = account.quota
    
    if (quotaBefore < amount) {
      throw new Error('额度不足')
    }
    
    const quotaAfter = quotaBefore - amount
    
    // 更新账户额度
    account.quota = quotaAfter
    await account.save()
    
    // 记录额度变动日志
    await QuotaLog.create({
      type: 'bet',
      amount: -amount,
      quotaBefore,
      quotaAfter,
      relatedOrderId: orderId,
      quotaDate: account.lastResetDate,
      remark: '投注'
    })
    
    return quotaAfter
  }
  
  /**
   * 手动调整额度（仅管理员使用）
   * @param {number} amount - 调整金额（正数增加，负数减少）
   * @param {string} remark - 备注
   */
  async adjustQuota(amount, remark = '管理员调整') {
    const account = await Account.getAccount()
    const quotaBefore = account.quota
    const quotaAfter = Math.max(0, quotaBefore + amount)
    
    // 更新账户额度
    account.quota = quotaAfter
    await account.save()
    
    // 记录额度变动日志
    await QuotaLog.create({
      type: 'adjust',
      amount,
      quotaBefore,
      quotaAfter,
      quotaDate: account.lastResetDate,
      remark
    })
    
    return quotaAfter
  }
  
  /**
   * 取消/删除订单时退还额度
   * 注意：这是取消投注时的退还，不是结算获胜
   * 
   * @param {number} amount - 退还金额
   * @param {string} orderId - 订单号
   */
  async refundForCancel(amount, orderId) {
    if (amount <= 0) return
    
    const account = await Account.getAccount()
    const quotaBefore = account.quota
    const quotaAfter = quotaBefore + amount
    
    // 更新账户额度
    account.quota = quotaAfter
    await account.save()
    
    // 记录额度变动日志
    await QuotaLog.create({
      type: 'adjust',
      amount: amount,
      quotaBefore,
      quotaAfter,
      relatedOrderId: orderId,
      quotaDate: account.lastResetDate,
      remark: '取消/删除订单退还'
    })
    
    return quotaAfter
  }
  
  /**
   * 手动重置额度（仅管理员使用）
   * 正常情况下额度会在北京时间12:00自动重置
   */
  async resetQuota(remark = '手动重置') {
    const account = await Account.getAccount()
    const quotaBefore = account.quota
    const defaultQuota = Account.getDefaultQuota()
    
    // 如果已经是满额度，无需重置
    if (quotaBefore === defaultQuota) {
      return quotaBefore
    }
    
    // 更新账户额度
    account.quota = defaultQuota
    await account.save()
    
    // 记录额度变动日志
    await QuotaLog.create({
      type: 'reset',
      amount: defaultQuota - quotaBefore,
      quotaBefore,
      quotaAfter: defaultQuota,
      quotaDate: account.lastResetDate,
      remark
    })
    
    return defaultQuota
  }
}

// 导出单例
const quotaService = new QuotaService()

module.exports = quotaService

// 兼容旧名称
module.exports.balanceService = quotaService
