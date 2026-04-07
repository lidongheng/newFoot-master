/**
 * 账户数据模型（单用户）
 * 
 * 业务规则：
 * - quota（额度）默认 50000，每天北京时间 12:00 重置
 * - 投注扣减额度，不管输赢走，额度不增加
 * - 额度只减不增（除了每日重置）
 */
const mongoose = require('mongoose')

// 默认额度
const DEFAULT_QUOTA = 50000.00

const accountSchema = new mongoose.Schema({
  // 当前额度
  quota: {
    type: Number,
    default: DEFAULT_QUOTA,
    min: 0
  },
  
  // 上次重置日期（北京时间日期，格式：YYYY-MM-DD）
  lastResetDate: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  versionKey: false
})

const Account = mongoose.model('Account', accountSchema)

/**
 * 获取当前北京时间的"额度日期"
 * 规则：北京时间 12:00 之前属于前一天，12:00 之后属于当天
 * 例如：北京时间 1月18日 11:00 → 额度日期为 1月17日
 *       北京时间 1月18日 13:00 → 额度日期为 1月18日
 */
Account.getCurrentQuotaDate = function() {
  const now = new Date()
  // 获取北京时间（UTC+8）
  const beijingOffset = 8 * 60 * 60 * 1000
  const beijingTime = new Date(now.getTime() + beijingOffset)
  
  // 获取北京时间的小时
  const beijingHours = beijingTime.getUTCHours()
  
  // 如果北京时间小于12点，属于前一天的额度日期
  if (beijingHours < 12) {
    beijingTime.setUTCDate(beijingTime.getUTCDate() - 1)
  }
  
  // 返回日期字符串 YYYY-MM-DD
  const year = beijingTime.getUTCFullYear()
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(beijingTime.getUTCDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * 获取账户（单例模式，确保只有一个账户记录）
 * 自动检查是否需要重置额度
 */
Account.getAccount = async function() {
  let account = await this.findOne()
  
  if (!account) {
    // 首次创建账户
    const currentQuotaDate = this.getCurrentQuotaDate()
    account = await this.create({ 
      quota: DEFAULT_QUOTA,
      lastResetDate: currentQuotaDate
    })
    return account
  }
  
  // 检查是否需要重置额度
  const currentQuotaDate = this.getCurrentQuotaDate()
  
  if (account.lastResetDate !== currentQuotaDate) {
    // 需要重置额度
    account.quota = DEFAULT_QUOTA
    account.lastResetDate = currentQuotaDate
    await account.save()
  }
  
  return account
}

/**
 * 获取默认额度值
 */
Account.getDefaultQuota = function() {
  return DEFAULT_QUOTA
}

module.exports = Account
