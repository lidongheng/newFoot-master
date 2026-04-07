/**
 * 联赛数据模型
 */
const mongoose = require('mongoose')

const leagueSchema = new mongoose.Schema({
  // 联赛ID（唯一）
  leagueId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // 联赛名称
  name: {
    type: String,
    required: true
  },
  
  // 国家
  country: {
    type: String,
    required: true,
    index: true
  },
  
  // 国旗 emoji
  flag: {
    type: String,
    default: ''
  },
  
  // 比赛数量
  matchCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  versionKey: false
})

module.exports = mongoose.model('League', leagueSchema)
