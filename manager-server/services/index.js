/**
 * 服务层统一导出
 */
const matchService = require('./matchService')
const betService = require('./betService')
const quotaService = require('./balanceService')
const accountService = require('./accountService')

module.exports = {
  matchService,
  betService,
  quotaService,
  // 兼容旧名称
  balanceService: quotaService,
  accountService
}
