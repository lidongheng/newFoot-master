import request from './index'

/**
 * 获取联赛列表
 * @param {Object} params - 查询参数
 * @param {string} [params.country] - 国家
 * @param {string} [params.keyword] - 关键词
 * @param {number} [params.page] - 页码
 * @param {number} [params.pageSize] - 每页数量
 */
export function getLeagueList(params) {
  return request.get('/league/list', { params })
}

/**
 * 获取所有联赛（下拉选择用）
 */
export function getAllLeagues() {
  return request.get('/league/all')
}

/**
 * 获取所有国家列表
 */
export function getCountries() {
  return request.get('/league/countries')
}

/**
 * 获取联赛详情
 * @param {string} id - 联赛ID
 */
export function getLeagueDetail(id) {
  return request.get(`/league/detail/${id}`)
}

/**
 * 创建联赛
 * @param {Object} data - 联赛数据
 */
export function createLeague(data) {
  return request.post('/league/create', data)
}

/**
 * 更新联赛
 * @param {string} id - 联赛ID
 * @param {Object} data - 更新数据
 */
export function updateLeague(id, data) {
  return request.put(`/league/update/${id}`, data)
}

/**
 * 删除联赛
 * @param {string} id - 联赛ID
 */
export function deleteLeague(id) {
  return request.delete(`/league/delete/${id}`)
}

/**
 * 批量删除联赛
 * @param {string[]} ids - 联赛ID数组
 */
export function batchDeleteLeagues(ids) {
  return request.post('/league/batch-delete', { ids })
}
