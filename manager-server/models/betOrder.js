/**
 * 投注订单数据模型
 */
const mongoose = require('mongoose')

const betOrderSchema = new mongoose.Schema({
  // 订单号（唯一）
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // 比赛信息
  matchId: {
    type: String,
    required: true
  },
  league: {
    type: String,
    required: true
  },
  homeTeam: {
    type: String,
    required: true
  },
  awayTeam: {
    type: String,
    required: true
  },
  
  // 下注时比分
  homeScore: {
    type: Number,
    default: 0
  },
  awayScore: {
    type: Number,
    default: 0
  },
  
  // 投注信息
  betType: {
    type: String,
    required: true
  },
  selection: {
    type: String,
    required: true
  },
  value: {
    type: String,
    default: ''
  },
  odds: {
    type: Number,
    required: true
  },
  
  // 金额
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  potentialWin: {
    type: Number,
    default: 0
  },
  actualWin: {
    type: Number,
    default: null
  },
  
  // 状态: pending/settled/cancelled
  status: {
    type: String,
    enum: ['pending', 'settled', 'cancelled'],
    default: 'pending'
  },
  
  // 结果: win/lose/push/half_win/half_lose
  result: {
    type: String,
    enum: ['win', 'lose', 'push', 'half_win', 'half_lose', null],
    default: null
  },
  
  // 最终比分
  finalHomeScore: {
    type: Number,
    default: null
  },
  finalAwayScore: {
    type: Number,
    default: null
  },
  
  // 结算时间
  settledAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  versionKey: false
})

// 复合索引
betOrderSchema.index({ status: 1, createdAt: -1 })
betOrderSchema.index({ createdAt: -1 })

module.exports = mongoose.model('BetOrder', betOrderSchema)
