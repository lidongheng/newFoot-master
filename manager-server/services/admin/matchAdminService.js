/**
 * 比赛管理服务 - 后台管理
 */
const { Match } = require('../../models')

class MatchAdminService {
  /**
   * 获取比赛列表（分页）
   * @param {Object} query - 查询条件
   * @param {number} page - 页码
   * @param {number} pageSize - 每页数量
   */
  async getList({ status, league, keyword, page = 1, pageSize = 20 }) {
    const query = {}
    
    if (status) {
      query.status = status
    }
    
    if (league) {
      query.league = new RegExp(league, 'i')
    }
    
    if (keyword) {
      query.$or = [
        { homeTeam: new RegExp(keyword, 'i') },
        { awayTeam: new RegExp(keyword, 'i') },
        { matchId: new RegExp(keyword, 'i') }
      ]
    }
    
    const total = await Match.countDocuments(query)
    const list = await Match.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
    
    return {
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / pageSize),
      list
    }
  }
  
  /**
   * 获取单个比赛详情
   * @param {string} id - MongoDB _id 或 matchId
   */
  async getById(id) {
    // 尝试通过 _id 查找，失败则通过 matchId 查找
    let match = await Match.findById(id).catch(() => null)
    if (!match) {
      match = await Match.findOne({ matchId: id })
    }
    return match
  }
  
  /**
   * 创建比赛
   * @param {Object} data - 比赛数据
   */
  async create(data) {
    // 检查 matchId 是否已存在
    const exists = await Match.findOne({ matchId: data.matchId })
    if (exists) {
      throw new Error('比赛ID已存在')
    }
    
    return await Match.create(data)
  }
  
  /**
   * 更新比赛
   * @param {string} id - MongoDB _id
   * @param {Object} data - 更新数据
   */
  async update(id, data) {
    const match = await Match.findById(id)
    if (!match) {
      throw new Error('比赛不存在')
    }
    
    // 如果更新 matchId，检查是否重复
    if (data.matchId && data.matchId !== match.matchId) {
      const exists = await Match.findOne({ matchId: data.matchId })
      if (exists) {
        throw new Error('比赛ID已存在')
      }
    }
    
    Object.assign(match, data)
    await match.save()
    return match
  }
  
  /**
   * 删除比赛
   * @param {string} id - MongoDB _id
   */
  async delete(id) {
    const match = await Match.findById(id)
    if (!match) {
      throw new Error('比赛不存在')
    }
    
    await Match.deleteOne({ _id: id })
    return { message: '删除成功' }
  }
  
  /**
   * 批量删除比赛
   * @param {Array} ids - MongoDB _id 数组
   */
  async batchDelete(ids) {
    const result = await Match.deleteMany({ _id: { $in: ids } })
    return { deletedCount: result.deletedCount }
  }
  
  /**
   * 更新比赛状态
   * @param {string} id - MongoDB _id
   * @param {string} status - 新状态
   */
  async updateStatus(id, status) {
    const match = await Match.findById(id)
    if (!match) {
      throw new Error('比赛不存在')
    }
    
    match.status = status
    if (status === 'live') {
      match.isLive = true
    } else if (status === 'finished') {
      match.isLive = false
    }
    
    await match.save()
    return match
  }
  
  /**
   * 更新比分
   * @param {string} id - MongoDB _id
   * @param {number} homeScore - 主队比分
   * @param {number} awayScore - 客队比分
   */
  async updateScore(id, homeScore, awayScore) {
    const match = await Match.findById(id)
    if (!match) {
      throw new Error('比赛不存在')
    }
    
    match.homeScore = homeScore
    match.awayScore = awayScore
    await match.save()
    return match
  }
}

module.exports = new MatchAdminService()
