/**
 * 比赛业务逻辑服务
 */
const { Match, League } = require('../models')

class MatchService {
  /**
   * 获取滚球比赛列表
   * @param {string} sportId - 体育类型
   */
  async getLiveMatches(sportId = 'football') {
    const matches = await Match.find({
      isLive: true,
      status: 'live'
    }).sort({ startTime: -1 })
    
    return matches
  }
  
  /**
   * 获取今日比赛列表
   * @param {string} sportId - 体育类型
   */
  async getTodayMatches(sportId = 'football') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const matches = await Match.find({
      startTime: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ startTime: 1 })
    
    return matches
  }
  
  /**
   * 获取早盘联赛列表
   */
  async getLeagues() {
    const leagues = await League.find().sort({ country: 1, name: 1 })
    
    // 按国家分组
    const grouped = {}
    leagues.forEach(league => {
      if (!grouped[league.country]) {
        grouped[league.country] = {
          country: league.country,
          flag: league.flag,
          leagues: []
        }
      }
      grouped[league.country].leagues.push({
        leagueId: league.leagueId,
        name: league.name,
        matchCount: league.matchCount
      })
    })
    
    return Object.values(grouped)
  }
  
  /**
   * 获取早盘比赛列表
   * @param {string} leagueIds - 联赛ID，逗号分隔
   */
  async getEarlyMatches(leagueIds) {
    const query = {
      status: 'upcoming',
      isLive: false
    }
    
    if (leagueIds) {
      const ids = leagueIds.split(',').map(id => id.trim())
      // 根据联赛名称匹配
      const leagues = await League.find({ leagueId: { $in: ids } })
      const leagueNames = leagues.map(l => l.name)
      query.league = { $in: leagueNames }
    }
    
    const matches = await Match.find(query).sort({ startTime: 1 })
    return matches
  }
  
  /**
   * 根据 matchId 获取比赛
   * @param {string} matchId - 比赛ID
   */
  async getMatchById(matchId) {
    return await Match.findOne({ matchId })
  }
}

module.exports = new MatchService()
