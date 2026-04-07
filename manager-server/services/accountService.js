/**
 * 账户历史业务逻辑服务
 * 
 * 时区规则：
 * - 比赛开始时间录入时使用北京时间（东八区 UTC+8）
 * - 数据库存储时自动转换为 UTC（北京时间 - 8小时）
 * - 查询规则：查询1月18日 = 北京1月18日12:00 ~ 1月19日12:00
 *   - 转换为UTC: 1月18日04:00 ~ 1月19日04:00
 */
const { BetOrder, Match } = require('../models')

class AccountService {
  /**
   * 将查询日期转换为 UTC 时间范围
   * 查询日期 D = 北京 D 12:00 ~ (D+1) 12:00
   *          = UTC D 04:00 ~ (D+1) 04:00 （北京时间 - 8小时）
   * 
   * @param {string} dateStr - 查询日期 YYYY-MM-DD
   * @returns {Object} { start: Date, end: Date } UTC 时间范围
   */
  dateToUtcRange(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number)
    
    // 北京时间 D 的 12:00 = UTC D 的 04:00
    const start = new Date(Date.UTC(year, month - 1, day, 4, 0, 0, 0))
    
    // 北京时间 D+1 的 12:00 = UTC D+1 的 04:00
    const end = new Date(Date.UTC(year, month - 1, day + 1, 4, 0, 0, 0))
    
    return { start, end }
  }
  
  /**
   * 获取账户历史
   * @param {string} startDate - 开始日期 YYYY-MM-DD
   * @param {string} endDate - 结束日期 YYYY-MM-DD
   */
  async getHistory(startDate, endDate) {
    // 计算整个查询范围对应的 UTC 时间
    const startRange = this.dateToUtcRange(startDate)
    const endRange = this.dateToUtcRange(endDate)
    
    // 查询范围：startDate 对应的 UTC 开始时间 ~ endDate 对应的 UTC 结束时间
    const queryStart = startRange.start
    const queryEnd = endRange.end
    
    // 1. 先查询时间范围内的所有比赛（按比赛开始时间筛选）
    const matches = await Match.find({
      startTime: { $gte: queryStart, $lt: queryEnd }
    }).lean()
    
    // 建立 matchId -> match 的映射
    const matchMap = {}
    matches.forEach(match => {
      matchMap[match.matchId] = match
    })
    const matchIds = matches.map(m => m.matchId)
    
    // 2. 查询这些比赛关联的已结算订单
    const orders = await BetOrder.find({
      status: 'settled',
      matchId: { $in: matchIds }
    }).lean()
    
    // 为每个订单附加比赛信息
    orders.forEach(order => {
      const match = matchMap[order.matchId]
      if (match) {
        order.matchStartTime = match.startTime
      }
    })
    
    // 3. 计算汇总数据
    let totalBetAmount = 0
    let totalValidAmount = 0
    let totalWinLoss = 0
    
    orders.forEach(order => {
      totalBetAmount += order.amount
      totalValidAmount += order.amount
      totalWinLoss += (order.actualWin || 0) - order.amount
    })
    
    // 4. 生成每日记录
    const dailyRecords = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // 从结束日期往前遍历
    const currentDate = new Date(end)
    
    while (currentDate >= start) {
      const dateStr = this.formatDate(currentDate)
      
      // 计算当天对应的 UTC 时间范围
      const dayRange = this.dateToUtcRange(dateStr)
      
      // 筛选当天的订单（按比赛开始时间）
      const dayOrders = orders.filter(order => {
        if (!order.matchStartTime) return false
        const matchStartTime = new Date(order.matchStartTime)
        return matchStartTime >= dayRange.start && matchStartTime < dayRange.end
      })
      
      let dayBetAmount = null
      let dayValidAmount = null
      let dayWinLoss = null
      
      if (dayOrders.length > 0) {
        dayBetAmount = 0
        dayValidAmount = 0
        dayWinLoss = 0
        
        dayOrders.forEach(order => {
          dayBetAmount += order.amount
          dayValidAmount += order.amount
          dayWinLoss += (order.actualWin || 0) - order.amount
        })
      }
      
      dailyRecords.push({
        date: dateStr,
        dateDisplay: this.formatDateDisplay(currentDate),
        weekday: this.getWeekday(currentDate),
        betAmount: dayBetAmount,
        validAmount: dayValidAmount,
        winLoss: dayWinLoss
      })
      
      currentDate.setDate(currentDate.getDate() - 1)
    }
    
    return {
      summary: {
        totalBetAmount,
        totalValidAmount,
        totalWinLoss: parseFloat(totalWinLoss.toFixed(2))
      },
      dailyRecords
    }
  }
  
  /**
   * 格式化日期为 YYYY-MM-DD
   */
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  /**
   * 格式化日期显示 (X月X日)
   */
  formatDateDisplay(date) {
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}月${day}日`
  }
  
  /**
   * 获取星期几
   */
  getWeekday(date) {
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    return weekdays[date.getDay()]
  }
}

module.exports = new AccountService()
