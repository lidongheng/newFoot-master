/**
 * API 服务封装
 * 对接后端 Koa2 接口
 * 使用 Axios
 */
import request from '@/utils/request'

// ==================== 比赛模块 ====================

/**
 * 获取滚球比赛列表
 * @param {string} sportId - 体育类型
 */
export function getLiveMatches(sportId = 'football') {
  return request.get('/match/live', { params: { sportId } })
}

/**
 * 获取今日比赛列表
 * @param {string} sportId - 体育类型
 */
export function getTodayMatches(sportId = 'football') {
  return request.get('/match/today', { params: { sportId } })
}

/**
 * 获取早盘联赛列表
 */
export function getLeagues() {
  return request.get('/match/leagues')
}

/**
 * 获取早盘比赛列表
 * @param {string} leagueIds - 联赛ID，多个用逗号分隔
 */
export function getEarlyMatches(leagueIds = '') {
  return request.get('/match/early', { params: { leagueIds } })
}

// ==================== 投注模块 ====================

/**
 * 提交投注
 * @param {Object} betData - 投注数据
 */
export function placeBet(betData) {
  return request.post('/bet/place', betData)
}

/**
 * 获取待结算投注记录
 */
export function getPendingBets() {
  return request.get('/bet/pending')
}

/**
 * 获取所有投注记录
 * @param {Object} params - 查询参数
 */
export function getBetRecords(params = {}) {
  return request.get('/bet/records', { params })
}

/**
 * 结算投注（测试用）
 * @param {string} orderId - 订单号
 * @param {Object} data - 结算数据
 */
export function settleBet(orderId, data) {
  return request.post(`/bet/settle/${orderId}`, data)
}

// ==================== 账户模块 ====================

/**
 * 获取账户历史
 * @param {string} startDate - 开始日期 YYYY-MM-DD
 * @param {string} endDate - 结束日期 YYYY-MM-DD
 */
export function getAccountHistory(startDate, endDate) {
  return request.get('/account/history', { params: { startDate, endDate } })
}

// ==================== 余额模块 ====================

/**
 * 获取当前余额
 */
export function getBalance() {
  return request.get('/balance')
}

/**
 * 更新余额
 * @param {Object} data - { amount, type, remark }
 */
export function updateBalance(data) {
  return request.post('/balance/update', data)
}

// ==================== 系统模块 ====================

/**
 * 获取系统时间
 */
export function getSystemTime() {
  return request.get('/system/time')
}

export default {
  // 比赛
  getLiveMatches,
  getTodayMatches,
  getLeagues,
  getEarlyMatches,
  // 投注
  placeBet,
  getPendingBets,
  getBetRecords,
  settleBet,
  // 账户
  getAccountHistory,
  // 余额
  getBalance,
  updateBalance,
  // 系统
  getSystemTime
}
