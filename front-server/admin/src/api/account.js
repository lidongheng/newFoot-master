import request from './index'

/**
 * 获取账户信息
 */
export function getAccountInfo() {
  return request.get('/account/info')
}

/**
 * 设置账户余额
 * @param {number} balance - 新余额
 * @param {string} [remark] - 备注
 */
export function setBalance(balance, remark) {
  return request.post('/account/set-balance', { balance, remark })
}

/**
 * 获取余额变动日志
 * @param {Object} params - 查询参数
 * @param {string} [params.type] - 变动类型
 * @param {string} [params.startDate] - 开始日期
 * @param {string} [params.endDate] - 结束日期
 * @param {number} [params.page] - 页码
 * @param {number} [params.pageSize] - 每页数量
 */
export function getBalanceLogs(params) {
  return request.get('/account/balance-logs', { params })
}

/**
 * 获取余额统计
 * @param {Object} [params] - 查询参数
 * @param {string} [params.startDate] - 开始日期
 * @param {string} [params.endDate] - 结束日期
 */
export function getBalanceStats(params) {
  return request.get('/account/balance-stats', { params })
}

/**
 * 获取余额日志详情
 * @param {string} id - 日志ID
 */
export function getBalanceLogDetail(id) {
  return request.get(`/account/balance-log/${id}`)
}

/**
 * 删除余额日志
 * @param {string} id - 日志ID
 */
export function deleteBalanceLog(id) {
  return request.delete(`/account/balance-log/${id}`)
}

/**
 * 批量删除余额日志
 * @param {string[]} ids - 日志ID数组
 */
export function batchDeleteBalanceLogs(ids) {
  return request.post('/account/balance-logs/batch-delete', { ids })
}

/**
 * 更新余额日志
 * @param {string} id - 日志ID
 * @param {Object} data - 更新数据
 */
export function updateBalanceLog(id, data) {
  return request.put(`/account/balance-log/${id}`, data)
}
