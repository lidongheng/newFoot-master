/**
 * 投注业务逻辑服务
 * 
 * 业务规则：
 * - 投注时扣减额度
 * - 结算时不管输赢走，额度不增加
 * - actualWin 仅作为记录，不影响额度
 */
const { BetOrder } = require('../models')
const quotaService = require('./balanceService')

class BetService {
  /**
   * 生成订单号
   */
  generateOrderId() {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `OU${timestamp}${random}`
  }
  
  /**
   * 计算预计可赢金额（利润）
   * 
   * 计算规则：
   * - 亚盘(handicap)/大小(overUnder)：水位不含本金，利润 = 投注额 × 水位
   * - 欧赔(euroOdds)：赔率含本金，利润 = 投注额 × (赔率 - 1)
   * 
   * @param {number} amount - 投注金额
   * @param {number} odds - 赔率/水位
   * @param {string} betType - 投注类型
   */
  calculatePotentialWin(amount, odds, betType) {
    let profit
    if (betType === 'euroOdds') {
      // 欧赔：赔率含本金，例如赔率3.00，投500，利润=500*(3-1)=1000
      profit = amount * (odds - 1)
    } else {
      // 亚盘/大小：水位不含本金，例如水位0.90，投500，利润=500*0.90=450
      profit = amount * odds
    }
    return parseFloat(profit.toFixed(2))
  }
  
  /**
   * 提交投注
   * @param {Object} betData - 投注数据
   */
  async placeBet(betData) {
    const {
      matchId,
      league,
      homeTeam,
      awayTeam,
      homeScore = 0,
      awayScore = 0,
      betType,
      selection,
      value,
      odds,
      amount
    } = betData
    
    // 生成订单号
    const orderId = this.generateOrderId()
    
    // 计算预计可赢（利润）
    const potentialWin = this.calculatePotentialWin(amount, odds, betType)
    
    // 扣除额度
    await quotaService.deductForBet(amount, orderId)
    
    // 创建投注订单
    const order = await BetOrder.create({
      orderId,
      matchId,
      league,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      betType,
      selection,
      value,
      odds,
      amount,
      potentialWin,
      status: 'pending'
    })
    
    return order
  }
  
  /**
   * 获取待结算投注记录
   */
  async getPendingBets() {
    return await BetOrder.find({ status: 'pending' })
      .sort({ createdAt: -1 })
  }
  
  /**
   * 获取投注记录
   * @param {Object} query - 查询条件
   */
  async getBetRecords({ status, startDate, endDate }) {
    const query = {}
    
    // 状态筛选
    if (status && status !== 'all') {
      query.status = status
    }
    
    // 日期筛选
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
    
    const list = await BetOrder.find(query).sort({ createdAt: -1 })
    
    return {
      total: list.length,
      list
    }
  }
  
  /**
   * 结算投注
   * 注意：结算只记录结果，不影响额度（额度只在投注时扣减）
   * 
   * @param {string} orderId - 订单号
   * @param {string} result - 结果: win/half_win/push/half_lose/lose
   * @param {number} finalHomeScore - 最终主队比分
   * @param {number} finalAwayScore - 最终客队比分
   */
  async settleBet(orderId, result, finalHomeScore, finalAwayScore) {
    const order = await BetOrder.findOne({ orderId })
    
    if (!order) {
      throw new Error('订单不存在')
    }
    
    if (order.status !== 'pending') {
      throw new Error('订单已结算或已取消')
    }
    
    // 计算实际赢取金额（仅作为记录，不影响额度）
    let actualWin = 0
    switch (result) {
      case 'win':
        actualWin = order.potentialWin + order.amount // 返还本金 + 盈利
        break
      case 'half_win':
        actualWin = order.amount + order.potentialWin / 2 // 返还本金 + 一半盈利
        break
      case 'push':
        actualWin = order.amount // 只返还本金（走水）
        break
      case 'half_lose':
        actualWin = order.amount / 2 // 返还一半本金
        break
      case 'lose':
        actualWin = 0
        break
      default:
        throw new Error('无效的结算结果')
    }
    
    // 注意：不再执行 creditForWin，额度不增加
    // 结算结果仅作为记录保存
    
    // 更新订单状态
    order.status = 'settled'
    order.result = result
    order.actualWin = actualWin
    order.finalHomeScore = finalHomeScore
    order.finalAwayScore = finalAwayScore
    order.settledAt = new Date()
    await order.save()
    
    return {
      orderId,
      result,
      actualWin,
      settledAt: order.settledAt
    }
  }
}

module.exports = new BetService()
