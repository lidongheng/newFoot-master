/**
 * 额度变动日志数据模型
 * 
 * 类型说明：
 * - bet: 投注扣减
 * - reset: 每日重置
 * - adjust: 管理员调整
 */
const mongoose = require('mongoose')

const quotaLogSchema = new mongoose.Schema({
  // 变动类型: bet/reset/adjust
  type: {
    type: String,
    enum: ['bet', 'reset', 'adjust'],
    required: true,
    index: true
  },
  
  // 变动金额（负数表示扣减，正数表示增加）
  amount: {
    type: Number,
    required: true
  },
  
  // 变动前额度
  quotaBefore: {
    type: Number,
    required: true
  },
  
  // 变动后额度
  quotaAfter: {
    type: Number,
    required: true
  },
  
  // 关联订单号（投注时记录）
  relatedOrderId: {
    type: String,
    default: null
  },
  
  // 额度日期（格式：YYYY-MM-DD，用于区分哪一天的额度）
  quotaDate: {
    type: String,
    index: true
  },
  
  // 备注
  remark: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  versionKey: false
})

// 索引
quotaLogSchema.index({ createdAt: -1 })

module.exports = mongoose.model('QuotaLog', quotaLogSchema, 'quota_logs')
