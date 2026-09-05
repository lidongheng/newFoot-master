/**
 * 投注业务逻辑服务
 * 
 * 业务规则：
 * - 投注时扣减额度
 * - 结算时不管输赢走，额度不增加
 * - actualWin 仅作为记录，不影响额度
 */
const { BetOrder, Match } = require('../models')
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
  calculatePotentialWin(amount, odds, marketType) {
    let profit
    if (marketType === 'moneyline') {
      // 欧赔：赔率含本金，例如赔率3.00，投500，利润=500*(3-1)=1000
      profit = amount * (odds - 1)
    } else {
      // 亚盘/大小：水位不含本金，例如水位0.90，投500，利润=500*0.90=450
      profit = amount * odds
    }
    return parseFloat(profit.toFixed(2))
  }

  /**
   * 创建带业务信息的投注错误
   */
  createBetError(message, code, data) {
    const err = new Error(message)
    err.code = code
    err.data = data
    return err
  }

  /**
   * 获取指定玩法和选项的服务端盘口
   */
  getMarketQuote(match, marketType, selectionKey) {
    const validSelections = {
      handicap: ['home', 'away'],
      overUnder: ['over', 'under'],
      moneyline: ['home', 'draw', 'away']
    }

    if (!validSelections[marketType] || !validSelections[marketType].includes(selectionKey)) {
      throw this.createBetError('无效的玩法或投注选项', 400, {
        reason: 'INVALID_MARKET_SELECTION'
      })
    }

    const quote = match.odds[marketType][selectionKey]
    const value = marketType === 'moneyline' ? quote.label : quote.value

    if (!value || !Number.isFinite(quote.odds) || quote.odds <= 0) {
      throw this.createBetError('当前盘口不可投注', 409, {
        reason: 'MARKET_UNAVAILABLE'
      })
    }

    return {
      marketType,
      selectionKey,
      value,
      odds: quote.odds,
      marketVersion: match.marketVersion,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      period: match.period,
      minute: match.minute,
      bettingOpen: match.bettingOpen,
      status: match.status
    }
  }

  /**
   * 获取投注选项显示名称
   */
  getSelectionName(match, marketType, selectionKey) {
    if (marketType === 'handicap') {
      return selectionKey === 'home' ? match.homeTeam : match.awayTeam
    }

    if (marketType === 'overUnder') {
      return selectionKey === 'over' ? '大' : '小'
    }

    if (selectionKey === 'home') {
      return match.homeTeam
    }
    if (selectionKey === 'away') {
      return match.awayTeam
    }
    return '平局'
  }

  /**
   * 获取投注类型显示名称
   */
  getBetType(betMode, marketType) {
    const modeName = betMode === 'live' ? '滚球' : '早盘'
    const marketNames = {
      handicap: '让球',
      overUnder: '大小',
      moneyline: '独赢'
    }
    return `足球 (${modeName}) ${marketNames[marketType]}`
  }
  
  /**
   * 提交投注
   * @param {Object} betData - 投注数据
   */
  async placeBet(betData) {
    const {
      matchId,
      betMode,
      marketType,
      selectionKey,
      quotedValue,
      quotedOdds,
      marketVersion,
      amount
    } = betData

    const match = await Match.findOne({ matchId })
    if (!match) {
      throw this.createBetError('比赛不存在', 404, {
        reason: 'MATCH_NOT_FOUND'
      })
    }

    if (betMode === 'live') {
      if (match.status !== 'live' || !match.isLive) {
        throw this.createBetError('比赛当前不是滚球状态', 409, {
          reason: 'MATCH_NOT_LIVE'
        })
      }
      if (!match.bettingOpen) {
        throw this.createBetError('比赛已封盘', 409, {
          reason: 'BETTING_CLOSED'
        })
      }
    } else if (match.status !== 'upcoming' || match.isLive) {
      throw this.createBetError('比赛当前不可进行早盘投注', 409, {
        reason: 'EARLY_BETTING_CLOSED'
      })
    }

    const currentQuote = this.getMarketQuote(match, marketType, selectionKey)
    if (
      marketVersion !== currentQuote.marketVersion ||
      quotedValue !== currentQuote.value ||
      quotedOdds !== currentQuote.odds
    ) {
      throw this.createBetError('盘口或赔率已变化，请确认最新赔率', 409, {
        reason: 'QUOTE_CHANGED',
        currentQuote
      })
    }

    // 生成订单号
    const orderId = this.generateOrderId()

    // 计算预计可赢（利润）
    const potentialWin = this.calculatePotentialWin(amount, currentQuote.odds, marketType)

    // 扣除额度
    await quotaService.deductForBet(amount, orderId)

    try {
      // 订单信息全部使用服务端比赛快照
      return await BetOrder.create({
        orderId,
        matchId: match.matchId,
        league: match.league,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        betMode,
        marketType,
        selectionKey,
        betPeriod: match.period,
        betMinute: match.minute,
        marketVersion: match.marketVersion,
        betType: this.getBetType(betMode, marketType),
        selection: this.getSelectionName(match, marketType, selectionKey),
        value: currentQuote.value,
        odds: currentQuote.odds,
        amount,
        potentialWin,
        status: 'pending'
      })
    } catch (err) {
      await quotaService.refundFailedBet(amount, orderId)
      throw err
    }
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
