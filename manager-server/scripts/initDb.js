/**
 * 数据库初始化脚本
 * 
 * 使用方法：
 * node scripts/initDb.js
 */
const mongoose = require('mongoose')
const config = require('../config')

// 数据模型
const Match = require('../models/match')
const League = require('../models/league')
const Account = require('../models/account')

// 示例比赛数据
const sampleMatches = [
  {
    matchId: 'match001',
    league: '澳大利亚甲组联赛',
    leagueIcon: '🇦🇺',
    homeTeam: '中央海岸水手',
    awayTeam: '麦克阿瑟',
    homeScore: 0,
    awayScore: 0,
    status: 'live',
    period: '上半场',
    minute: 59,
    startTime: new Date(),
    hasVideo: true,
    hasCashOut: true,
    isLive: true,
    odds: {
      handicap: {
        home: { value: '+0.5', odds: 1.03 },
        away: { value: '-0.5', odds: 0.85 }
      },
      overUnder: {
        over: { value: '大 2.5', odds: 1.01 },
        under: { value: '小 2.5', odds: 0.86 }
      },
      moneyline: {
        home: { label: '主', odds: 4.05 },
        draw: { label: '和', odds: 3.45 },
        away: { label: '客', odds: 1.84 }
      }
    }
  },
  {
    matchId: 'match002',
    league: '墨西哥超级联赛',
    leagueIcon: '🇲🇽',
    homeTeam: '阿苏尔',
    awayTeam: '普埃布拉',
    homeScore: 0,
    awayScore: 0,
    status: 'live',
    period: '上半场',
    minute: 19,
    startTime: new Date(),
    hasVideo: true,
    hasCashOut: true,
    isLive: true,
    odds: {
      handicap: {
        home: { value: '-1', odds: 1.04 },
        away: { value: '+1', odds: 0.84 }
      },
      overUnder: {
        over: { value: '大 2.5/3', odds: 0.97 },
        under: { value: '小 2.5/3', odds: 0.89 }
      },
      moneyline: {
        home: { label: '主', odds: 1.56 },
        draw: { label: '和', odds: 4.20 },
        away: { label: '客', odds: 5.00 }
      }
    }
  },
  {
    matchId: 'match003',
    league: '英格兰超级联赛',
    leagueIcon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    homeTeam: '曼联',
    awayTeam: '利物浦',
    homeScore: 0,
    awayScore: 0,
    status: 'upcoming',
    period: '',
    minute: 0,
    startTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3小时后
    hasVideo: true,
    hasCashOut: true,
    isLive: false,
    odds: {
      handicap: {
        home: { value: '+0.5', odds: 0.92 },
        away: { value: '-0.5', odds: 0.96 }
      },
      overUnder: {
        over: { value: '大 2.5', odds: 0.88 },
        under: { value: '小 2.5', odds: 1.00 }
      },
      moneyline: {
        home: { label: '主', odds: 3.20 },
        draw: { label: '和', odds: 3.40 },
        away: { label: '客', odds: 2.25 }
      }
    }
  },
  {
    matchId: 'match004',
    league: '西班牙甲级联赛',
    leagueIcon: '🇪🇸',
    homeTeam: '巴塞罗那',
    awayTeam: '皇家马德里',
    homeScore: 0,
    awayScore: 0,
    status: 'upcoming',
    period: '',
    minute: 0,
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
    hasVideo: true,
    hasCashOut: true,
    isLive: false,
    odds: {
      handicap: {
        home: { value: '-0.5', odds: 0.94 },
        away: { value: '+0.5', odds: 0.94 }
      },
      overUnder: {
        over: { value: '大 2.5', odds: 0.85 },
        under: { value: '小 2.5', odds: 1.03 }
      },
      moneyline: {
        home: { label: '主', odds: 2.40 },
        draw: { label: '和', odds: 3.30 },
        away: { label: '客', odds: 2.90 }
      }
    }
  }
]

// 联赛数据
const sampleLeagues = [
  { leagueId: 'epl', name: '英格兰超级联赛', country: '英格兰', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', matchCount: 10 },
  { leagueId: 'epl-special', name: '英格兰超级联赛-特别投注', country: '英格兰', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', matchCount: 5 },
  { leagueId: 'efl-cup', name: '英格兰联赛杯', country: '英格兰', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', matchCount: 8 },
  { leagueId: 'championship', name: '英格兰冠军联赛', country: '英格兰', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', matchCount: 12 },
  { leagueId: 'laliga', name: '西班牙甲级联赛', country: '西班牙', flag: '🇪🇸', matchCount: 10 },
  { leagueId: 'copa-del-rey', name: '西班牙国王杯', country: '西班牙', flag: '🇪🇸', matchCount: 4 },
  { leagueId: 'bundesliga', name: '德国甲级联赛', country: '德国', flag: '🇩🇪', matchCount: 9 },
  { leagueId: '2-bundesliga', name: '德国乙级联赛', country: '德国', flag: '🇩🇪', matchCount: 9 },
  { leagueId: 'serie-a', name: '意大利甲级联赛', country: '意大利', flag: '🇮🇹', matchCount: 10 },
  { leagueId: 'ligue-1', name: '法国甲级联赛', country: '法国', flag: '🇫🇷', matchCount: 10 }
]

/**
 * 获取当前北京时间的额度日期
 */
function getCurrentQuotaDate() {
  const now = new Date()
  const beijingOffset = 8 * 60 * 60 * 1000
  const beijingTime = new Date(now.getTime() + beijingOffset)
  
  const beijingHours = beijingTime.getUTCHours()
  if (beijingHours < 12) {
    beijingTime.setUTCDate(beijingTime.getUTCDate() - 1)
  }
  
  const year = beijingTime.getUTCFullYear()
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(beijingTime.getUTCDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

async function initDatabase() {
  try {
    console.log('🚀 开始初始化数据库...')
    
    // 连接数据库
    await mongoose.connect(config.mongo.uri, config.mongo.options)
    console.log('✅ MongoDB 连接成功')
    
    // 清空旧数据（可选）
    console.log('🗑️  清空旧数据...')
    await Match.deleteMany({})
    await League.deleteMany({})
    await Account.deleteMany({})
    
    // 初始化账户
    console.log('💰 初始化账户...')
    const currentQuotaDate = getCurrentQuotaDate()
    await Account.create({ 
      quota: 50000.00,
      lastResetDate: currentQuotaDate
    })
    console.log(`   ✓ 账户初始化完成，额度: 50000.00，额度日期: ${currentQuotaDate}`)
    
    // 插入比赛数据
    console.log('⚽ 插入比赛数据...')
    await Match.insertMany(sampleMatches)
    console.log(`   ✓ 插入 ${sampleMatches.length} 场比赛`)
    
    // 插入联赛数据
    console.log('🏆 插入联赛数据...')
    await League.insertMany(sampleLeagues)
    console.log(`   ✓ 插入 ${sampleLeagues.length} 个联赛`)
    
    console.log('')
    console.log('✅ 数据库初始化完成!')
    console.log('')
    console.log('📊 数据统计:')
    console.log(`   - 比赛: ${await Match.countDocuments()} 场`)
    console.log(`   - 联赛: ${await League.countDocuments()} 个`)
    const account = await Account.getAccount()
    console.log(`   - 账户额度: ${account.quota}`)
    console.log(`   - 额度日期: ${account.lastResetDate}`)
    
    process.exit(0)
  } catch (err) {
    console.error('❌ 初始化失败:', err.message)
    process.exit(1)
  }
}

initDatabase()
