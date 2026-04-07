/**
 * 系统控制器
 */
const { success } = require('../utils/response')

class SystemController {
  /**
   * 获取系统时间
   * GET /system/time
   */
  async getTime(ctx) {
    success(ctx, {
      serverTime: new Date().toISOString(),
      timezone: 'GMT-4'
    })
  }
}

module.exports = new SystemController()
