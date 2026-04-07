/**
 * 控制器统一导出
 */
const matchController = require('./matchController')
const betController = require('./betController')
const accountController = require('./accountController')
const balanceController = require('./balanceController')
const systemController = require('./systemController')

module.exports = {
  matchController,
  betController,
  accountController,
  balanceController,
  systemController
}
