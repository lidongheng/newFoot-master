/**
 * 账户管理服务 - 后台管理
 * 
 * 业务规则：
 * - quota（额度）默认 50000，每天北京时间 12:00 自动重置
 * - 投注扣减额度，不管输赢走，额度不增加
 */
const { Account, QuotaLog, BetOrder } = require('../../models')

class AccountAdminService {
  /**
   * 获取账户信息
   */
  async getAccount() {
    const account = await Account.getAccount()
    return {
      _id: account._id,
      quota: account.quota,
      // 保持 balance 字段兼容
      balance: account.quota,
      quotaDate: account.lastResetDate,
      defaultQuota: Account.getDefaultQuota(),
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    }
  }
  
  /**
   * 设置账户额度（直接设置，用于初始化或修正）
   */
  async setQuota(quota, remark = '后台设置') {
    const account = await Account.getAccount()
    const quotaBefore = account.quota
    
    account.quota = quota
    await account.save()
    
    // 记录日志
    await QuotaLog.create({
      type: 'adjust',
      amount: quota - quotaBefore,
      quotaBefore,
      quotaAfter: quota,
      quotaDate: account.lastResetDate,
      remark
    })
    
    return {
      quota: account.quota,
      balance: account.quota,
      quotaDate: account.lastResetDate
    }
  }
  
  // 兼容旧方法名
  async setBalance(balance, remark = '后台设置') {
    return this.setQuota(balance, remark)
  }
  
  /**
   * 获取额度变动日志（分页）- 包含关联订单详情
   */
  async getQuotaLogs({ type, startDate, endDate, page = 1, pageSize = 20 }) {
    const query = {}
    
    if (type) {
      query.type = type
    }
    
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) {
        query.createdAt.$gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        query.createdAt.$lt = end
      }
    }
    
    const total = await QuotaLog.countDocuments(query)
    const logs = await QuotaLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()
    
    // 获取所有关联的订单号
    const orderIds = logs
      .filter(log => log.relatedOrderId)
      .map(log => log.relatedOrderId)
    
    // 批量查询关联订单
    const orders = await BetOrder.find({ orderId: { $in: orderIds } }).lean()
    const orderMap = {}
    orders.forEach(order => {
      orderMap[order.orderId] = {
        league: order.league,
        homeTeam: order.homeTeam,
        awayTeam: order.awayTeam,
        homeScore: order.homeScore,
        awayScore: order.awayScore,
        finalHomeScore: order.finalHomeScore,
        finalAwayScore: order.finalAwayScore,
        betType: order.betType,
        selection: order.selection,
        odds: order.odds,
        amount: order.amount
      }
    })
    
    // 将订单详情附加到日志，并转换字段名兼容
    const list = logs.map(log => {
      const item = {
        ...log,
        // 兼容旧字段名
        balanceBefore: log.quotaBefore,
        balanceAfter: log.quotaAfter
      }
      if (log.relatedOrderId && orderMap[log.relatedOrderId]) {
        item.orderDetail = orderMap[log.relatedOrderId]
      }
      return item
    })
    
    return {
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / pageSize),
      list
    }
  }
  
  // 兼容旧方法名
  async getBalanceLogs(params) {
    return this.getQuotaLogs(params)
  }
  
  /**
   * 获取额度日志详情（包含关联订单详情）
   */
  async getQuotaLogById(id) {
    const log = await QuotaLog.findById(id).lean()
    if (!log) return null
    
    // 添加兼容字段
    log.balanceBefore = log.quotaBefore
    log.balanceAfter = log.quotaAfter
    
    // 如果有关联订单，查询订单详情
    if (log.relatedOrderId) {
      const order = await BetOrder.findOne({ orderId: log.relatedOrderId }).lean()
      if (order) {
        log.orderDetail = {
          league: order.league,
          homeTeam: order.homeTeam,
          awayTeam: order.awayTeam,
          homeScore: order.homeScore,
          awayScore: order.awayScore,
          finalHomeScore: order.finalHomeScore,
          finalAwayScore: order.finalAwayScore,
          betType: order.betType,
          selection: order.selection,
          odds: order.odds,
          amount: order.amount
        }
      }
    }
    
    return log
  }
  
  // 兼容旧方法名
  async getBalanceLogById(id) {
    return this.getQuotaLogById(id)
  }
  
  /**
   * 更新额度日志
   */
  async updateQuotaLog(id, data) {
    const log = await QuotaLog.findById(id)
    if (!log) {
      throw new Error('日志不存在')
    }
    
    // 只允许更新部分字段
    const allowedFields = ['type', 'remark']
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        log[field] = data[field]
      }
    })
    
    await log.save()
    return log
  }
  
  // 兼容旧方法名
  async updateBalanceLog(id, data) {
    return this.updateQuotaLog(id, data)
  }
  
  /**
   * 删除额度日志（仅用于清理测试数据）
   */
  async deleteQuotaLog(id) {
    const log = await QuotaLog.findById(id)
    if (!log) {
      throw new Error('日志不存在')
    }
    
    await QuotaLog.deleteOne({ _id: id })
    return { message: '删除成功' }
  }
  
  // 兼容旧方法名
  async deleteBalanceLog(id) {
    return this.deleteQuotaLog(id)
  }
  
  /**
   * 批量删除额度日志
   */
  async batchDeleteQuotaLogs(ids) {
    const result = await QuotaLog.deleteMany({ _id: { $in: ids } })
    return { deletedCount: result.deletedCount }
  }
  
  // 兼容旧方法名
  async batchDeleteBalanceLogs(ids) {
    return this.batchDeleteQuotaLogs(ids)
  }
  
  /**
   * 获取额度统计
   */
  async getQuotaStats(startDate, endDate) {
    const query = {}
    
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) {
        query.createdAt.$gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        query.createdAt.$lt = end
      }
    }
    
    const logs = await QuotaLog.find(query)
    
    const stats = {
      totalBet: 0,        // 总投注扣减
      totalReset: 0,      // 总重置次数
      totalAdjust: 0,     // 总调整
      count: logs.length
    }
    
    logs.forEach(log => {
      switch (log.type) {
        case 'bet':
          stats.totalBet += Math.abs(log.amount)
          break
        case 'reset':
          stats.totalReset += 1
          break
        case 'adjust':
          stats.totalAdjust += log.amount
          break
      }
    })
    
    return stats
  }
  
  // 兼容旧方法名
  async getBalanceStats(startDate, endDate) {
    return this.getQuotaStats(startDate, endDate)
  }
}

module.exports = new AccountAdminService()
