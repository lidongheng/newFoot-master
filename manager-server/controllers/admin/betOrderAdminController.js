/**
 * 投注订单管理控制器 - 后台管理
 */
const { betOrderAdminService } = require('../../services/admin')
const { success, error, paramError } = require('../../utils/response')

class BetOrderAdminController {
  /**
   * 获取订单列表
   * GET /admin/bet-order/list
   */
  async getList(ctx) {
    try {
      const { status, result, keyword, startDate, endDate, page, pageSize } = ctx.query
      const data = await betOrderAdminService.getList({
        status,
        result,
        keyword,
        startDate,
        endDate,
        page: page || 1,
        pageSize: pageSize || 20
      })
      success(ctx, data)
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 获取统计数据
   * GET /admin/bet-order/stats
   */
  async getStats(ctx) {
    try {
      const stats = await betOrderAdminService.getStats()
      success(ctx, stats)
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 获取订单详情
   * GET /admin/bet-order/detail/:id
   */
  async getDetail(ctx) {
    try {
      const { id } = ctx.params
      const order = await betOrderAdminService.getById(id)
      if (!order) {
        error(ctx, '订单不存在', 404)
        return
      }
      success(ctx, order)
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 创建订单
   * POST /admin/bet-order/create
   */
  async create(ctx) {
    try {
      const data = ctx.request.body
      
      const requiredFields = ['matchId', 'league', 'homeTeam', 'awayTeam', 'betType', 'selection', 'odds', 'amount']
      for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
          paramError(ctx, `缺少必填参数: ${field}`)
          return
        }
      }
      
      const order = await betOrderAdminService.create(data)
      success(ctx, order, '创建成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 更新订单
   * PUT /admin/bet-order/update/:id
   */
  async update(ctx) {
    try {
      const { id } = ctx.params
      const data = ctx.request.body
      
      const order = await betOrderAdminService.update(id, data)
      success(ctx, order, '更新成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 删除订单
   * DELETE /admin/bet-order/delete/:id
   */
  async delete(ctx) {
    try {
      const { id } = ctx.params
      await betOrderAdminService.delete(id)
      success(ctx, null, '删除成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 批量删除订单
   * POST /admin/bet-order/batch-delete
   */
  async batchDelete(ctx) {
    try {
      const { ids } = ctx.request.body
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        paramError(ctx, '请选择要删除的订单')
        return
      }
      
      const result = await betOrderAdminService.batchDelete(ids)
      success(ctx, result, '批量删除成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 批量结算
   * POST /admin/bet-order/batch-settle
   */
  async batchSettle(ctx) {
    try {
      const { ids, result, finalHomeScore, finalAwayScore } = ctx.request.body
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        paramError(ctx, '请选择要结算的订单')
        return
      }
      
      if (!result) {
        paramError(ctx, '请选择结算结果')
        return
      }
      
      const validResults = ['win', 'lose', 'push', 'half_win', 'half_lose']
      if (!validResults.includes(result)) {
        paramError(ctx, '无效的结算结果')
        return
      }
      
      const data = await betOrderAdminService.batchSettle(ids, result, finalHomeScore, finalAwayScore)
      success(ctx, data, '批量结算成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 重新结算
   * POST /admin/bet-order/re-settle/:id
   */
  async reSettle(ctx) {
    try {
      const { id } = ctx.params
      const { result } = ctx.request.body

      if (!result) {
        paramError(ctx, '请选择新的结算结果')
        return
      }

      const validResults = ['win', 'lose', 'push', 'half_win', 'half_lose']
      if (!validResults.includes(result)) {
        paramError(ctx, '无效的结算结果')
        return
      }

      const data = await betOrderAdminService.reSettle(id, result)
      success(ctx, data, '重新结算成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }

  /**
   * 取消订单
   * POST /admin/bet-order/cancel/:id
   */
  async cancel(ctx) {
    try {
      const { id } = ctx.params
      const order = await betOrderAdminService.cancel(id)
      success(ctx, order, '取消成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
}

module.exports = new BetOrderAdminController()
