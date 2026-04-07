/**
 * 账户管理控制器 - 后台管理
 */
const { accountAdminService } = require('../../services/admin')
const { success, error, paramError } = require('../../utils/response')

class AccountAdminController {
  /**
   * 获取账户信息
   * GET /admin/account/info
   */
  async getInfo(ctx) {
    try {
      const account = await accountAdminService.getAccount()
      success(ctx, account)
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 设置账户余额
   * POST /admin/account/set-balance
   */
  async setBalance(ctx) {
    try {
      const { balance, remark } = ctx.request.body
      
      if (balance === undefined || balance === null) {
        paramError(ctx, '请输入余额')
        return
      }
      
      if (balance < 0) {
        paramError(ctx, '余额不能为负数')
        return
      }
      
      const account = await accountAdminService.setBalance(balance, remark)
      success(ctx, account, '设置成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 获取余额变动日志
   * GET /admin/account/balance-logs
   */
  async getBalanceLogs(ctx) {
    try {
      const { type, startDate, endDate, page, pageSize } = ctx.query
      const data = await accountAdminService.getBalanceLogs({
        type,
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
   * 获取余额日志详情
   * GET /admin/account/balance-log/:id
   */
  async getBalanceLogDetail(ctx) {
    try {
      const { id } = ctx.params
      const log = await accountAdminService.getBalanceLogById(id)
      if (!log) {
        error(ctx, '日志不存在', 404)
        return
      }
      success(ctx, log)
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 更新余额日志
   * PUT /admin/account/balance-log/:id
   */
  async updateBalanceLog(ctx) {
    try {
      const { id } = ctx.params
      const data = ctx.request.body
      
      const log = await accountAdminService.updateBalanceLog(id, data)
      success(ctx, log, '更新成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 删除余额日志
   * DELETE /admin/account/balance-log/:id
   */
  async deleteBalanceLog(ctx) {
    try {
      const { id } = ctx.params
      await accountAdminService.deleteBalanceLog(id)
      success(ctx, null, '删除成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 批量删除余额日志
   * POST /admin/account/balance-logs/batch-delete
   */
  async batchDeleteBalanceLogs(ctx) {
    try {
      const { ids } = ctx.request.body
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        paramError(ctx, '请选择要删除的日志')
        return
      }
      
      const result = await accountAdminService.batchDeleteBalanceLogs(ids)
      success(ctx, result, '批量删除成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  /**
   * 获取余额统计
   * GET /admin/account/balance-stats
   */
  async getBalanceStats(ctx) {
    try {
      const { startDate, endDate } = ctx.query
      const stats = await accountAdminService.getBalanceStats(startDate, endDate)
      success(ctx, stats)
    } catch (err) {
      error(ctx, err.message)
    }
  }
}

module.exports = new AccountAdminController()
