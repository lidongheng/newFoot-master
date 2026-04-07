/**
 * 联赛管理控制器 - 后台管理
 */
const { leagueAdminService } = require('../../services/admin')
const { success, error, paramError } = require('../../utils/response')

class LeagueAdminController {
  /**
   * 获取联赛列表
   * GET /admin/league/list
   */
  async getList(ctx) {
    try {
      const { country, keyword, page, pageSize } = ctx.query
      const result = await leagueAdminService.getList({
        country,
        keyword,
        page: page || 1,
        pageSize: pageSize || 20
      })
      success(ctx, result)
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 获取所有联赛（下拉选择用）
   * GET /admin/league/all
   */
  async getAll(ctx) {
    try {
      const leagues = await leagueAdminService.getAll()
      success(ctx, leagues)
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 获取联赛详情
   * GET /admin/league/detail/:id
   */
  async getDetail(ctx) {
    try {
      const { id } = ctx.params
      const league = await leagueAdminService.getById(id)
      if (!league) {
        error(ctx, '联赛不存在', 404)
        return
      }
      success(ctx, league)
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 创建联赛
   * POST /admin/league/create
   */
  async create(ctx) {
    try {
      const data = ctx.request.body
      
      const requiredFields = ['leagueId', 'name', 'country']
      for (const field of requiredFields) {
        if (!data[field]) {
          paramError(ctx, `缺少必填参数: ${field}`)
          return
        }
      }
      
      const league = await leagueAdminService.create(data)
      success(ctx, league, '创建成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 更新联赛
   * PUT /admin/league/update/:id
   */
  async update(ctx) {
    try {
      const { id } = ctx.params
      const data = ctx.request.body
      
      const league = await leagueAdminService.update(id, data)
      success(ctx, league, '更新成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 删除联赛
   * DELETE /admin/league/delete/:id
   */
  async delete(ctx) {
    try {
      const { id } = ctx.params
      await leagueAdminService.delete(id)
      success(ctx, null, '删除成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 批量删除联赛
   * POST /admin/league/batch-delete
   */
  async batchDelete(ctx) {
    try {
      const { ids } = ctx.request.body
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        paramError(ctx, '请选择要删除的联赛')
        return
      }
      
      const result = await leagueAdminService.batchDelete(ids)
      success(ctx, result, '批量删除成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 获取所有国家列表
   * GET /admin/league/countries
   */
  async getCountries(ctx) {
    try {
      const countries = await leagueAdminService.getCountries()
      success(ctx, countries)
    } catch (err) {
      error(ctx, err.message)
    }
  }
}

module.exports = new LeagueAdminController()
