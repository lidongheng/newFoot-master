/**
 * 数据模型统一导出
 */
const Match = require('./match')
const League = require('./league')
const BetOrder = require('./betOrder')
const Account = require('./account')
const QuotaLog = require('./balanceLog')

module.exports = {
  Match,
  League,
  BetOrder,
  Account,
  QuotaLog,
  // 兼容旧名称
  BalanceLog: QuotaLog
}
