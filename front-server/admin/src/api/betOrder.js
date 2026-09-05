import request from './index'

/**
 * 获取投注订单列表
 * @param {Object} params - 查询参数
 * @param {string} [params.status] - 状态
 * @param {string} [params.result] - 结果
 * @param {string} [params.keyword] - 关键词
 * @param {string} [params.startDate] - 开始日期
 * @param {string} [params.endDate] - 结束日期
 * @param {number} [params.page] - 页码
 * @param {number} [params.pageSize] - 每页数量
 */
export function getBetOrderList(params) {
  return request.get('/bet-order/list', { params })
}

/**
 * 获取订单统计数据
 */
export function getBetOrderStats() {
  return request.get('/bet-order/stats')
}

/**
 * 获取订单详情
 * @param {string} id - 订单ID
 */
export function getBetOrderDetail(id) {
  return request.get(`/bet-order/detail/${id}`)
}

/**
 * 创建订单
 * @param {Object} data - 订单数据
 */
export function createBetOrder(data) {
  return request.post('/bet-order/create', data)
}

/**
 * 更新订单
 * @param {string} id - 订单ID
 * @param {Object} data - 更新数据
 */
export function updateBetOrder(id, data) {
  return request.put(`/bet-order/update/${id}`, data)
}

/**
 * 删除订单
 * @param {string} id - 订单ID
 */
export function deleteBetOrder(id) {
  return request.delete(`/bet-order/delete/${id}`)
}

/**
 * 批量删除订单
 * @param {string[]} ids - 订单ID数组
 */
export function batchDeleteBetOrders(ids) {
  return request.post('/bet-order/batch-delete', { ids })
}

/**
 * 批量结算订单
 * @param {Object} data - 结算数据
 * @param {string[]} data.ids - 订单ID数组
 * @param {string} data.result - 结算结果
 * @param {number} [data.finalHomeScore] - 最终主队比分
 * @param {number} [data.finalAwayScore] - 最终客队比分
 */
export function batchSettleBetOrders(data) {
  return request.post('/bet-order/batch-settle', data)
}

/**
 * 重新结算订单（修改已结算订单的结果）
 * @param {string} id - 订单ID
 * @param {Object} data - 重新结算数据
 * @param {string} data.result - 新的结算结果
 * @param {number} [data.finalHomeScore] - 最终主队比分
 * @param {number} [data.finalAwayScore] - 最终客队比分
 */
export function reSettleBetOrder(id, data) {
  return request.post(`/bet-order/re-settle/${id}`, data)
}

/**
 * 取消订单
 * @param {string} id - 订单ID
 */
export function cancelBetOrder(id) {
  return request.post(`/bet-order/cancel/${id}`)
}
