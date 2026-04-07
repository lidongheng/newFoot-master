/**
 * 投注订单管理服务 - 后台管理
 * 
 * 业务规则：
 * - 删除/取消待结算订单时，退还额度
 * - 结算时不管输赢走，额度不增加（actualWin 仅作为记录）
 */
const { BetOrder } = require('../../models')
const quotaService = require('../balanceService')

class BetOrderAdminService {
  /**
   * 获取投注订单列表（分页）
   */
  async getList({ status, result, keyword, startDate, endDate, page = 1, pageSize = 20 }) {
    const query = {}
    
    if (status) {
      query.status = status
    }
    
    if (result) {
      query.result = result
    }
    
    if (keyword) {
      query.$or = [
        { orderId: new RegExp(keyword, 'i') },
        { homeTeam: new RegExp(keyword, 'i') },
        { awayTeam: new RegExp(keyword, 'i') },
        { league: new RegExp(keyword, 'i') }
      ]
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
    
    const total = await BetOrder.countDocuments(query)
    const list = await BetOrder.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
    
    // 计算统计数据
    const stats = await this.getStats(query)
    
    return {
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / pageSize),
      stats,
      list
    }
  }
  
  /**
   * 获取统计数据
   */
  async getStats(query = {}) {
    const orders = await BetOrder.find(query)
    
    let totalAmount = 0
    let totalPotentialWin = 0
    let totalActualWin = 0
    let pendingCount = 0
    let settledCount = 0
    
    orders.forEach(order => {
      totalAmount += order.amount || 0
      totalPotentialWin += order.potentialWin || 0
      totalActualWin += order.actualWin || 0
      
      if (order.status === 'pending') pendingCount++
      if (order.status === 'settled') settledCount++
    })
    
    return {
      totalAmount,
      totalPotentialWin,
      totalActualWin,
      pendingCount,
      settledCount,
      totalCount: orders.length
    }
  }
  
  /**
   * 获取单个订单详情
   */
  async getById(id) {
    let order = await BetOrder.findById(id).catch(() => null)
    if (!order) {
      order = await BetOrder.findOne({ orderId: id })
    }
    return order
  }
  
  /**
   * 计算预计可赢金额（利润）
   * 
   * 计算规则：
   * - 亚盘(handicap)/大小(overUnder)：水位不含本金，利润 = 投注额 × 水位
   * - 欧赔(euroOdds)：赔率含本金，利润 = 投注额 × (赔率 - 1)
   */
  calculatePotentialWin(amount, odds, betType) {
    let profit
    if (betType === 'euroOdds') {
      profit = amount * (odds - 1)
    } else {
      profit = amount * odds
    }
    return parseFloat(profit.toFixed(2))
  }
  
  /**
   * 创建订单（后台手动创建）
   */
  async create(data) {
    // 生成订单号
    if (!data.orderId) {
      data.orderId = `OU${Date.now()}${Math.floor(Math.random() * 1000)}`
    }
    
    // 检查订单号是否存在
    const exists = await BetOrder.findOne({ orderId: data.orderId })
    if (exists) {
      throw new Error('订单号已存在')
    }
    
    // 计算预计可赢（利润）
    if (data.amount && data.odds) {
      data.potentialWin = this.calculatePotentialWin(data.amount, data.odds, data.betType)
    }
    
    return await BetOrder.create(data)
  }
  
  /**
   * 更新订单
   */
  async update(id, data) {
    const order = await BetOrder.findById(id)
    if (!order) {
      throw new Error('订单不存在')
    }
    
    // 已结算订单不允许修改关键信息
    if (order.status === 'settled') {
      const protectedFields = ['amount', 'odds', 'potentialWin', 'matchId']
      for (const field of protectedFields) {
        if (data[field] !== undefined && data[field] !== order[field]) {
          throw new Error('已结算订单不允许修改投注信息')
        }
      }
    }
    
    // 重新计算预计可赢（利润）
    if (data.amount || data.odds || data.betType) {
      const amount = data.amount || order.amount
      const odds = data.odds || order.odds
      const betType = data.betType || order.betType
      data.potentialWin = this.calculatePotentialWin(amount, odds, betType)
    }
    
    Object.assign(order, data)
    await order.save()
    return order
  }
  
  /**
   * 删除订单
   * 待结算订单删除时退还额度
   */
  async delete(id) {
    const order = await BetOrder.findById(id)
    if (!order) {
      throw new Error('订单不存在')
    }
    
    // 待结算订单删除时需要退还额度
    if (order.status === 'pending') {
      await quotaService.refundForCancel(order.amount, order.orderId)
    }
    
    await BetOrder.deleteOne({ _id: id })
    return { message: '删除成功' }
  }
  
  /**
   * 批量删除订单
   * 待结算订单删除时退还额度
   */
  async batchDelete(ids) {
    // 查找待结算订单，退还额度
    const pendingOrders = await BetOrder.find({
      _id: { $in: ids },
      status: 'pending'
    })
    
    for (const order of pendingOrders) {
      await quotaService.refundForCancel(order.amount, order.orderId)
    }
    
    const result = await BetOrder.deleteMany({ _id: { $in: ids } })
    return { deletedCount: result.deletedCount }
  }
  
  /**
   * 批量结算
   * 注意：结算时不管输赢走，额度不增加（actualWin 仅作为记录）
   */
  async batchSettle(ids, result, finalHomeScore, finalAwayScore) {
    const orders = await BetOrder.find({
      _id: { $in: ids },
      status: 'pending'
    })
    
    const results = []
    for (const order of orders) {
      let actualWin = 0
      switch (result) {
        case 'win':
          actualWin = order.potentialWin + order.amount
          break
        case 'half_win':
          actualWin = order.amount + order.potentialWin / 2
          break
        case 'push':
          actualWin = order.amount
          break
        case 'half_lose':
          actualWin = order.amount / 2
          break
        case 'lose':
          actualWin = 0
          break
      }
      
      // 注意：不再增加额度，actualWin 仅作为记录
      // 结算不影响额度，额度只在投注时扣减
      
      order.status = 'settled'
      order.result = result
      order.actualWin = actualWin
      order.finalHomeScore = finalHomeScore
      order.finalAwayScore = finalAwayScore
      order.settledAt = new Date()
      await order.save()
      
      results.push(order)
    }
    
    return { settledCount: results.length, orders: results }
  }
  
  /**
   * 重新结算
   * 撤销原来的结算结果，用新的 result 重新计算 actualWin 并记录日志
   *
   * @param {string} id - 订单 _id
   * @param {string} newResult - 新的结算结果: win/lose/push/half_win/half_lose
   */
  async reSettle(id, newResult) {
    const order = await BetOrder.findById(id)
    if (!order) {
      throw new Error('订单不存在')
    }

    if (order.status !== 'settled') {
      throw new Error('只能对已结算的订单进行重新结算')
    }

    const oldResult = order.result
    const oldActualWin = order.actualWin || 0

    // 用新 result 重新计算 actualWin
    let newActualWin = 0
    switch (newResult) {
      case 'win':
        newActualWin = order.potentialWin + order.amount
        break
      case 'half_win':
        newActualWin = order.amount + order.potentialWin / 2
        break
      case 'push':
        newActualWin = order.amount
        break
      case 'half_lose':
        newActualWin = order.amount / 2
        break
      case 'lose':
        newActualWin = 0
        break
      default:
        throw new Error('无效的结算结果')
    }

    // 计算差额并调整额度
    const diff = newActualWin - oldActualWin
    if (diff !== 0) {
      await quotaService.adjustQuota(
        diff,
        `重新结算订单 ${order.orderId}：${oldResult} → ${newResult}`
      )
    }

    // 更新订单
    order.result = newResult
    order.actualWin = newActualWin
    order.settledAt = new Date()
    await order.save()

    return {
      order,
      oldResult,
      newResult,
      oldActualWin,
      newActualWin,
      balanceChange: diff
    }
  }

  /**
   * 取消订单
   * 退还投注额度
   */
  async cancel(id) {
    const order = await BetOrder.findById(id)
    if (!order) {
      throw new Error('订单不存在')
    }
    
    if (order.status !== 'pending') {
      throw new Error('只能取消待结算的订单')
    }
    
    // 退还额度
    await quotaService.refundForCancel(order.amount, order.orderId)
    
    order.status = 'cancelled'
    await order.save()
    return order
  }
}

module.exports = new BetOrderAdminService()
