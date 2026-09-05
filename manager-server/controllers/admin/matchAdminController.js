/**
 * 比赛管理控制器 - 后台管理
 */
const { matchAdminService } = require('../../services/admin')
const { success, error, paramError } = require('../../utils/response')

class MatchAdminController {
  /**
   * 获取比赛列表
   * GET /admin/match/list
   */
  async getList(ctx) {
    try {
      const { status, league, keyword, page, pageSize } = ctx.query
      const result = await matchAdminService.getList({
        status,
        league,
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
   * 获取比赛详情
   * GET /admin/match/detail/:id
   */
  async getDetail(ctx) {
    try {
      const { id } = ctx.params
      const match = await matchAdminService.getById(id)
      if (!match) {
        error(ctx, '比赛不存在', 404)
        return
      }
      success(ctx, match)
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 创建比赛
   * POST /admin/match/create
   */
  async create(ctx) {
    try {
      const data = ctx.request.body
      
      // 参数校验
      const requiredFields = ['matchId', 'league', 'homeTeam', 'awayTeam', 'startTime']
      for (const field of requiredFields) {
        if (!data[field]) {
          paramError(ctx, `缺少必填参数: ${field}`)
          return
        }
      }
      
      const match = await matchAdminService.create(data)
      success(ctx, match, '创建成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 更新比赛
   * PUT /admin/match/update/:id
   */
  async update(ctx) {
    try {
      const { id } = ctx.params
      const data = ctx.request.body
      
      const match = await matchAdminService.update(id, data)
      success(ctx, match, '更新成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 删除比赛
   * DELETE /admin/match/delete/:id
   */
  async delete(ctx) {
    try {
      const { id } = ctx.params
      await matchAdminService.delete(id)
      success(ctx, null, '删除成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 批量删除比赛
   * POST /admin/match/batch-delete
   */
  async batchDelete(ctx) {
    try {
      const { ids } = ctx.request.body
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        paramError(ctx, '请选择要删除的比赛')
        return
      }
      
      const result = await matchAdminService.batchDelete(ids)
      success(ctx, result, '批量删除成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 更新比赛状态
   * PUT /admin/match/status/:id
   */
  async updateStatus(ctx) {
    try {
      const { id } = ctx.params
      const { status } = ctx.request.body
      
      if (!status) {
        paramError(ctx, '缺少状态参数')
        return
      }
      
      const validStatus = ['upcoming', 'live', 'finished']
      if (!validStatus.includes(status)) {
        paramError(ctx, '无效的状态值')
        return
      }
      
      const match = await matchAdminService.updateStatus(id, status)
      success(ctx, match, '状态更新成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 更新比分
   * PUT /admin/match/score/:id
   */
  async updateScore(ctx) {
    try {
      const { id } = ctx.params
      const { homeScore, awayScore } = ctx.request.body
      
      if (homeScore === undefined || awayScore === undefined) {
        paramError(ctx, '缺少比分参数')
        return
      }
      
      const match = await matchAdminService.updateScore(id, homeScore, awayScore)
      success(ctx, match, '比分更新成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }

  /**
   * PUT /admin/match/live/:id
   * 一次更新滚球比分、阶段、赔率和封盘状态
   */
  async updateLive(ctx) {
    try {
      const { id } = ctx.params
      const data = ctx.request.body
      const requiredFields = ['homeScore', 'awayScore', 'minute', 'period', 'odds', 'bettingOpen']

      for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
          paramError(ctx, `缺少必填参数: ${field}`)
          return
        }
      }

      if (
        !Number.isInteger(data.homeScore) ||
        data.homeScore < 0 ||
        !Number.isInteger(data.awayScore) ||
        data.awayScore < 0
      ) {
        paramError(ctx, '比分必须为非负整数')
        return
      }

      if (!Number.isInteger(data.minute) || data.minute < 0) {
        paramError(ctx, '比赛分钟必须为非负整数')
        return
      }

      if (typeof data.bettingOpen !== 'boolean') {
        paramError(ctx, '封盘状态必须为布尔值')
        return
      }

      const quotes = [
        data.odds?.handicap?.home,
        data.odds?.handicap?.away,
        data.odds?.overUnder?.over,
        data.odds?.overUnder?.under,
        data.odds?.moneyline?.home,
        data.odds?.moneyline?.draw,
        data.odds?.moneyline?.away
      ]

      if (quotes.some(quote => !quote || !Number.isFinite(quote.odds) || quote.odds <= 0)) {
        paramError(ctx, '所有赔率必须为有效正数')
        return
      }

      const marketValues = [
        data.odds.handicap.home.value,
        data.odds.handicap.away.value,
        data.odds.overUnder.over.value,
        data.odds.overUnder.under.value,
        data.odds.moneyline.home.label,
        data.odds.moneyline.draw.label,
        data.odds.moneyline.away.label
      ]

      if (marketValues.some(value => typeof value !== 'string' || value.trim() === '')) {
        paramError(ctx, '所有盘口名称不能为空')
        return
      }

      const match = await matchAdminService.updateLive(id, data)
      success(ctx, match, '滚球数据更新成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
}

module.exports = new MatchAdminController()
