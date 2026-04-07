/**
 * 比赛数据模型
 */
const mongoose = require('mongoose')

const matchSchema = new mongoose.Schema({
  // 比赛ID（唯一）
  matchId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // 联赛信息
  league: {
    type: String,
    required: true
  },
  leagueIcon: {
    type: String,
    default: ''
  },
  
  // 球队
  homeTeam: {
    type: String,
    required: true
  },
  awayTeam: {
    type: String,
    required: true
  },
  
  // 比分
  homeScore: {
    type: Number,
    default: 0
  },
  awayScore: {
    type: Number,
    default: 0
  },
  
  // 比赛状态: upcoming/live/finished
  status: {
    type: String,
    enum: ['upcoming', 'live', 'finished'],
    default: 'upcoming'
  },
  
  // 比赛时段
  period: {
    type: String,
    default: ''
  },
  
  // 当前分钟
  minute: {
    type: Number,
    default: 0
  },
  
  // 开赛时间
  startTime: {
    type: Date,
    required: true
  },
  
  // 功能标识
  hasVideo: {
    type: Boolean,
    default: false
  },
  hasCashOut: {
    type: Boolean,
    default: false
  },
  isLive: {
    type: Boolean,
    default: false
  },
  
  // 赔率
  odds: {
    handicap: {
      home: {
        value: { type: String, default: '' },
        odds: { type: Number, default: 0 }
      },
      away: {
        value: { type: String, default: '' },
        odds: { type: Number, default: 0 }
      }
    },
    overUnder: {
      over: {
        value: { type: String, default: '' },
        odds: { type: Number, default: 0 }
      },
      under: {
        value: { type: String, default: '' },
        odds: { type: Number, default: 0 }
      }
    },
    moneyline: {
      home: {
        label: { type: String, default: '主' },
        odds: { type: Number, default: 0 }
      },
      draw: {
        label: { type: String, default: '和' },
        odds: { type: Number, default: 0 }
      },
      away: {
        label: { type: String, default: '客' },
        odds: { type: Number, default: 0 }
      }
    }
  }
}, {
  timestamps: true,  // 自动添加 createdAt 和 updatedAt
  versionKey: false
})

// 复合索引
matchSchema.index({ status: 1, startTime: -1 })
matchSchema.index({ isLive: 1 })

module.exports = mongoose.model('Match', matchSchema)
