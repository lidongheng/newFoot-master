import request from './index'

/**
 * 获取比赛列表
 * @param {Object} params - 查询参数
 * @param {string} [params.status] - 状态
 * @param {string} [params.league] - 联赛
 * @param {string} [params.keyword] - 关键词
 * @param {number} [params.page] - 页码
 * @param {number} [params.pageSize] - 每页数量
 */
export function getMatchList(params) {
  return request.get('/match/list', { params })
}

/**
 * 获取比赛详情
 * @param {string} id - 比赛ID
 */
export function getMatchDetail(id) {
  return request.get(`/match/detail/${id}`)
}

/**
 * 创建比赛
 * @param {Object} data - 比赛数据
 */
export function createMatch(data) {
  return request.post('/match/create', data)
}

/**
 * 更新比赛
 * @param {string} id - 比赛ID
 * @param {Object} data - 更新数据
 */
export function updateMatch(id, data) {
  return request.put(`/match/update/${id}`, data)
}

/**
 * 删除比赛
 * @param {string} id - 比赛ID
 */
export function deleteMatch(id) {
  return request.delete(`/match/delete/${id}`)
}

/**
 * 批量删除比赛
 * @param {string[]} ids - 比赛ID数组
 */
export function batchDeleteMatches(ids) {
  return request.post('/match/batch-delete', { ids })
}

/**
 * 更新比赛状态
 * @param {string} id - 比赛ID
 * @param {string} status - 新状态
 */
export function updateMatchStatus(id, status) {
  return request.put(`/match/status/${id}`, { status })
}

/**
 * 更新比分
 * @param {string} id - 比赛ID
 * @param {number} homeScore - 主队比分
 * @param {number} awayScore - 客队比分
 */
export function updateMatchScore(id, homeScore, awayScore) {
  return request.put(`/match/score/${id}`, { homeScore, awayScore })
}

/**
 * 一次更新滚球比分、阶段、赔率和封盘状态
 * @param {string} id - 比赛ID
 * @param {Object} data - 滚球数据
 */
export function updateLiveMatch(id, data) {
  return request.put(`/match/live/${id}`, data)
}
