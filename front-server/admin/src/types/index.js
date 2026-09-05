/**
 * 类型定义文件 - 使用 JSDoc 注释定义类型
 */

/**
 * @typedef {Object} PaginatedData
 * @property {number} total - 总条数
 * @property {number} page - 当前页
 * @property {number} pageSize - 每页条数
 * @property {number} totalPages - 总页数
 * @property {Array} list - 数据列表
 */

/**
 * @typedef {Object} MatchOdds
 * @property {Object} handicap - 让球盘
 * @property {{value: string, odds: number}} handicap.home
 * @property {{value: string, odds: number}} handicap.away
 * @property {Object} overUnder - 大小球
 * @property {{value: string, odds: number}} overUnder.over
 * @property {{value: string, odds: number}} overUnder.under
 * @property {Object} moneyline - 独赢盘
 * @property {{label: string, odds: number}} moneyline.home
 * @property {{label: string, odds: number}} moneyline.draw
 * @property {{label: string, odds: number}} moneyline.away
 */

/**
 * @typedef {Object} Match
 * @property {string} _id - MongoDB ID
 * @property {string} matchId - 比赛唯一标识
 * @property {string} league - 联赛名称
 * @property {string} leagueIcon - 联赛图标
 * @property {string} homeTeam - 主队名称
 * @property {string} awayTeam - 客队名称
 * @property {number} homeScore - 主队得分
 * @property {number} awayScore - 客队得分
 * @property {'upcoming'|'live'|'finished'} status - 比赛状态
 * @property {string} period - 比赛时段
 * @property {number} minute - 当前分钟
 * @property {string} startTime - 开赛时间
 * @property {boolean} hasVideo - 是否有视频
 * @property {boolean} hasCashOut - 是否可提前兑现
 * @property {boolean} isLive - 是否滚球
 * @property {MatchOdds} odds - 赔率
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} League
 * @property {string} _id
 * @property {string} leagueId - 联赛唯一标识
 * @property {string} name - 联赛名称
 * @property {string} country - 国家
 * @property {string} flag - 国旗 emoji
 * @property {number} matchCount - 比赛数量
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} BetOrder
 * @property {string} _id
 * @property {string} orderId - 订单号
 * @property {string} matchId
 * @property {string} league
 * @property {string} homeTeam
 * @property {string} awayTeam
 * @property {number} homeScore - 下注时比分
 * @property {number} awayScore
 * @property {string} betType - 投注类型
 * @property {string} selection - 选择项
 * @property {string} value - 盘口值
 * @property {number} odds - 赔率
 * @property {number} amount - 投注金额
 * @property {number} potentialWin - 预计可赢
 * @property {number|null} actualWin - 实际赢取
 * @property {'pending'|'settled'|'cancelled'} status
 * @property {'win'|'lose'|'push'|'half_win'|'half_lose'|null} result
 * @property {number|null} finalHomeScore
 * @property {number|null} finalAwayScore
 * @property {string} createdAt
 * @property {string|null} settledAt
 */

/**
 * @typedef {Object} BetOrderStats
 * @property {number} totalAmount - 总投注金额
 * @property {number} totalPotentialWin - 总预计可赢
 * @property {number} totalActualWin - 总实际赢取
 * @property {number} pendingCount - 待结算数量
 * @property {number} settledCount - 已结算数量
 * @property {number} totalCount - 总数量
 */

/**
 * @typedef {Object} Account
 * @property {string} _id
 * @property {number} balance - 当前余额
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} BalanceLog
 * @property {string} _id
 * @property {'bet'|'win'|'deposit'|'withdraw'|'adjust'} type
 * @property {number} amount - 变动金额
 * @property {number} balanceBefore - 变动前余额
 * @property {number} balanceAfter - 变动后余额
 * @property {string|null} relatedOrderId - 关联订单号
 * @property {string} remark - 备注
 * @property {string} createdAt
 */

/**
 * @typedef {Object} BalanceStats
 * @property {number} totalDeposit - 总充值
 * @property {number} totalWithdraw - 总提现
 * @property {number} totalBet - 总投注
 * @property {number} totalWin - 总赢取
 * @property {number} totalAdjust - 总调整
 * @property {number} count - 日志条数
 */

// 枚举值
export const MatchStatus = {
  upcoming: '未开始',
  live: '进行中',
  finished: '已结束'
}

export const OrderStatus = {
  pending: '待结算',
  settled: '已结算',
  cancelled: '已取消'
}

export const SettleResult = {
  win: '赢',
  lose: '输',
  push: '走水',
  half_win: '赢半',
  half_lose: '输半'
}

export const BalanceLogType = {
  bet: '投注',
  win: '中奖',
  deposit: '充值',
  withdraw: '提现',
  adjust: '调整'
}
