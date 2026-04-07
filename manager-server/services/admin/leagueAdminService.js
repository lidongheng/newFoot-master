/**
 * 联赛管理服务 - 后台管理
 */
const { League } = require('../../models')

class LeagueAdminService {
  /**
   * 获取联赛列表（分页）
   */
  async getList({ country, keyword, page = 1, pageSize = 20 }) {
    const query = {}
    
    if (country) {
      query.country = new RegExp(country, 'i')
    }
    
    if (keyword) {
      query.$or = [
        { name: new RegExp(keyword, 'i') },
        { leagueId: new RegExp(keyword, 'i') }
      ]
    }
    
    const total = await League.countDocuments(query)
    const list = await League.find(query)
      .sort({ country: 1, name: 1 })
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
   * 获取所有联赛（不分页，用于下拉选择）
   */
  async getAll() {
    return await League.find().sort({ country: 1, name: 1 })
  }
  
  /**
   * 获取单个联赛
   */
  async getById(id) {
    let league = await League.findById(id).catch(() => null)
    if (!league) {
      league = await League.findOne({ leagueId: id })
    }
    return league
  }
  
  /**
   * 创建联赛
   */
  async create(data) {
    const exists = await League.findOne({ leagueId: data.leagueId })
    if (exists) {
      throw new Error('联赛ID已存在')
    }
    
    return await League.create(data)
  }
  
  /**
   * 更新联赛
   */
  async update(id, data) {
    const league = await League.findById(id)
    if (!league) {
      throw new Error('联赛不存在')
    }
    
    if (data.leagueId && data.leagueId !== league.leagueId) {
      const exists = await League.findOne({ leagueId: data.leagueId })
      if (exists) {
        throw new Error('联赛ID已存在')
      }
    }
    
    Object.assign(league, data)
    await league.save()
    return league
  }
  
  /**
   * 删除联赛
   */
  async delete(id) {
    const league = await League.findById(id)
    if (!league) {
      throw new Error('联赛不存在')
    }
    
    await League.deleteOne({ _id: id })
    return { message: '删除成功' }
  }
  
  /**
   * 批量删除联赛
   */
  async batchDelete(ids) {
    const result = await League.deleteMany({ _id: { $in: ids } })
    return { deletedCount: result.deletedCount }
  }
  
  /**
   * 获取所有国家列表
   */
  async getCountries() {
    const countries = await League.distinct('country')
    return countries.sort()
  }
}

module.exports = new LeagueAdminService()
