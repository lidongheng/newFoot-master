const test = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')

process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/football_live_test'

const app = require('../app')
const db = require('../config/db')
const { Match, BetOrder, Account, QuotaLog } = require('../models')
const betService = require('../services/betService')

const liveOdds = {
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

const earlyOdds = {
  handicap: {
    home: { value: '-0.5', odds: 0.92 },
    away: { value: '+0.5', odds: 0.96 }
  },
  overUnder: {
    over: { value: '大 2.5', odds: 0.88 },
    under: { value: '小 2.5', odds: 1 }
  },
  moneyline: {
    home: { label: '主', odds: 3.2 },
    draw: { label: '和', odds: 3.4 },
    away: { label: '客', odds: 2.25 }
  }
}

let server
let baseUrl
let liveMatch

async function request(path, method = 'GET', data) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  }
  if (data !== undefined) {
    options.body = JSON.stringify(data)
  }

  const response = await fetch(`${baseUrl}${path}`, options)
  return response.json()
}

function createBetPayload(overrides = {}) {
  return {
    matchId: 'live001',
    betMode: 'live',
    marketType: 'handicap',
    selectionKey: 'home',
    quotedValue: '+0.5',
    quotedOdds: 1.03,
    marketVersion: 1,
    amount: 10,
    ...overrides
  }
}

test.before(async () => {
  await db.connect()
  await db.mongoose.connection.dropDatabase()

  await Account.create({
    quota: 1000,
    lastResetDate: Account.getCurrentQuotaDate()
  })

  liveMatch = await Match.create({
    matchId: 'live001',
    league: '测试滚球联赛',
    leagueIcon: '⚽',
    homeTeam: '主队',
    awayTeam: '客队',
    homeScore: 1,
    awayScore: 0,
    status: 'live',
    period: '下半场',
    minute: 55,
    startTime: new Date(),
    hasVideo: false,
    hasCashOut: false,
    isLive: true,
    bettingOpen: true,
    marketVersion: 1,
    odds: liveOdds
  })

  await Match.create({
    matchId: 'early001',
    league: '测试早盘联赛',
    leagueIcon: '⚽',
    homeTeam: '早盘主队',
    awayTeam: '早盘客队',
    homeScore: 0,
    awayScore: 0,
    status: 'upcoming',
    period: '',
    minute: 0,
    startTime: new Date(Date.now() + 3600000),
    hasVideo: false,
    hasCashOut: false,
    isLive: false,
    bettingOpen: false,
    marketVersion: 1,
    odds: earlyOdds
  })

  await Match.create({
    matchId: 'finished001',
    league: '测试结束联赛',
    leagueIcon: '⚽',
    homeTeam: '结束主队',
    awayTeam: '结束客队',
    homeScore: 2,
    awayScore: 1,
    status: 'finished',
    period: '完场',
    minute: 90,
    startTime: new Date(Date.now() - 3600000),
    hasVideo: false,
    hasCashOut: false,
    isLive: false,
    bettingOpen: false,
    marketVersion: 1,
    odds: liveOdds
  })

  server = http.createServer(app.callback())
  await new Promise(resolve => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  baseUrl = `http://127.0.0.1:${address.port}`
})

test.after(async () => {
  await new Promise(resolve => {
    server.close(resolve)
  })
  await db.mongoose.connection.dropDatabase()
  await db.mongoose.disconnect()
})

test('滚球、早盘、变盘、封盘、并发额度与回滚完整流程', async t => {
  await t.test('三种玩法利润计算正确', () => {
    assert.equal(betService.calculatePotentialWin(100, 1.9, 'handicap'), 190)
    assert.equal(betService.calculatePotentialWin(100, 1.9, 'overUnder'), 190)
    assert.equal(betService.calculatePotentialWin(100, 4.05, 'moneyline'), 305)
  })

  await t.test('滚球列表返回进行中的比赛', async () => {
    const body = await request('/api/v1/match/live')
    assert.equal(body.code, 200)
    assert.equal(body.data.length, 1)
    assert.equal(body.data[0].matchId, 'live001')
    assert.equal(body.data[0].bettingOpen, true)
  })

  const marketCases = [
    {
      marketType: 'handicap',
      selectionKey: 'home',
      quotedValue: '+0.5',
      quotedOdds: 1.03,
      potentialWin: 10.3
    },
    {
      marketType: 'overUnder',
      selectionKey: 'under',
      quotedValue: '小 2.5',
      quotedOdds: 0.86,
      potentialWin: 8.6
    },
    {
      marketType: 'moneyline',
      selectionKey: 'away',
      quotedValue: '客',
      quotedOdds: 1.84,
      potentialWin: 8.4
    }
  ]

  for (const marketCase of marketCases) {
    await t.test(`滚球${marketCase.marketType}成功并保存服务端快照`, async () => {
      const body = await request(
        '/api/v1/bet/place',
        'POST',
        createBetPayload({
          ...marketCase,
          league: '伪造联赛',
          homeScore: 99,
          awayScore: 99
        })
      )
      assert.equal(body.code, 200)
      assert.equal(body.data.league, '测试滚球联赛')
      assert.equal(body.data.homeScore, 1)
      assert.equal(body.data.awayScore, 0)
      assert.equal(body.data.betPeriod, '下半场')
      assert.equal(body.data.betMinute, 55)
      assert.equal(body.data.marketType, marketCase.marketType)
      assert.equal(body.data.potentialWin, marketCase.potentialWin)
    })
  }

  await t.test('早盘投注保持可用', async () => {
    const body = await request('/api/v1/bet/place', 'POST', {
      matchId: 'early001',
      betMode: 'early',
      marketType: 'moneyline',
      selectionKey: 'home',
      quotedValue: '主',
      quotedOdds: 3.2,
      marketVersion: 1,
      amount: 10
    })
    assert.equal(body.code, 200)
    assert.equal(body.data.betMode, 'early')
    assert.equal(body.data.potentialWin, 22)
  })

  await t.test('结束比赛和无效玩法不能投注', async () => {
    const finishedBody = await request('/api/v1/bet/place', 'POST', createBetPayload({
      matchId: 'finished001'
    }))
    assert.equal(finishedBody.code, 409)
    assert.equal(finishedBody.data.reason, 'MATCH_NOT_LIVE')

    const invalidBody = await request('/api/v1/bet/place', 'POST', createBetPayload({
      marketType: 'handicap',
      selectionKey: 'draw'
    }))
    assert.equal(invalidBody.code, 400)
    assert.equal(invalidBody.data.reason, 'INVALID_MARKET_SELECTION')
  })

  await t.test('不存在、未开赛、无效金额和余额不足均拒绝且不生成订单', async () => {
    const orderCountBefore = await BetOrder.countDocuments()
    const quotaBefore = (await Account.findOne()).quota

    const notFoundBody = await request('/api/v1/bet/place', 'POST', createBetPayload({
      matchId: 'missing001'
    }))
    assert.equal(notFoundBody.code, 404)
    assert.equal(notFoundBody.data.reason, 'MATCH_NOT_FOUND')

    const upcomingBody = await request('/api/v1/bet/place', 'POST', createBetPayload({
      matchId: 'early001'
    }))
    assert.equal(upcomingBody.code, 409)
    assert.equal(upcomingBody.data.reason, 'MATCH_NOT_LIVE')

    const invalidAmountBody = await request('/api/v1/bet/place', 'POST', createBetPayload({
      amount: 0
    }))
    assert.equal(invalidAmountBody.code, 400)

    const insufficientBody = await request('/api/v1/bet/place', 'POST', createBetPayload({
      amount: quotaBefore + 1
    }))
    assert.equal(insufficientBody.code, 400)
    assert.equal(insufficientBody.message, '额度不足')

    assert.equal(await BetOrder.countDocuments(), orderCountBefore)
    assert.equal((await Account.findOne()).quota, quotaBefore)
  })

  await t.test('盘口值或赔率不一致均返回最新盘口且不扣额度', async () => {
    const orderCountBefore = await BetOrder.countDocuments()
    const quotaBefore = (await Account.findOne()).quota
    const cases = [
      { quotedValue: '-0.5' },
      { quotedOdds: 1.04 }
    ]

    for (const overrides of cases) {
      const body = await request('/api/v1/bet/place', 'POST', createBetPayload(overrides))
      assert.equal(body.code, 409)
      assert.equal(body.data.reason, 'QUOTE_CHANGED')
      assert.equal(body.data.currentQuote.value, '+0.5')
      assert.equal(body.data.currentQuote.odds, 1.03)
      assert.equal(body.data.currentQuote.marketVersion, 1)
    }

    assert.equal(await BetOrder.countDocuments(), orderCountBefore)
    assert.equal((await Account.findOne()).quota, quotaBefore)
  })

  await t.test('变盘返回最新盘口且不扣额度', async () => {
    const accountBefore = await Account.findOne()
    const orderCountBefore = await BetOrder.countDocuments()
    const changedOdds = JSON.parse(JSON.stringify(liveOdds))
    changedOdds.handicap.home.odds = 1.08

    const updateBody = await request(`/api/v1/admin/match/live/${liveMatch._id}`, 'PUT', {
      homeScore: 1,
      awayScore: 0,
      minute: 56,
      period: '下半场',
      odds: changedOdds,
      bettingOpen: true
    })
    assert.equal(updateBody.code, 200)
    assert.equal(updateBody.data.marketVersion, 2)

    const body = await request('/api/v1/bet/place', 'POST', createBetPayload())
    assert.equal(body.code, 409)
    assert.equal(body.data.reason, 'QUOTE_CHANGED')
    assert.equal(body.data.currentQuote.odds, 1.08)
    assert.equal(body.data.currentQuote.marketVersion, 2)

    const accountAfter = await Account.findOne()
    assert.equal(accountAfter.quota, accountBefore.quota)
    assert.equal(await BetOrder.countDocuments(), orderCountBefore)
  })

  await t.test('接受最新赔率后可以成交', async () => {
    const body = await request('/api/v1/bet/place', 'POST', createBetPayload({
      quotedOdds: 1.08,
      marketVersion: 2
    }))
    assert.equal(body.code, 200)
    assert.equal(body.data.odds, 1.08)
    assert.equal(body.data.marketVersion, 2)
  })

  await t.test('封盘后拒绝投注且状态切换保持封盘', async () => {
    const currentMatch = await Match.findOne({ matchId: 'live001' })
    const updateBody = await request(`/api/v1/admin/match/live/${liveMatch._id}`, 'PUT', {
      homeScore: 1,
      awayScore: 0,
      minute: 57,
      period: '下半场',
      odds: currentMatch.odds,
      bettingOpen: false
    })
    assert.equal(updateBody.code, 200)
    assert.equal(updateBody.data.marketVersion, 3)

    const closedBody = await request('/api/v1/bet/place', 'POST', createBetPayload({
      quotedOdds: 1.08,
      marketVersion: 3
    }))
    assert.equal(closedBody.code, 409)
    assert.equal(closedBody.data.reason, 'BETTING_CLOSED')

    const statusBody = await request(`/api/v1/admin/match/status/${liveMatch._id}`, 'PUT', {
      status: 'live'
    })
    assert.equal(statusBody.code, 200)
    assert.equal(statusBody.data.bettingOpen, false)
  })

  await t.test('并发下注不会使额度变为负数', async () => {
    await Account.updateOne({}, { $set: { quota: 50 } })
    const currentMatch = await Match.findOne({ matchId: 'live001' })
    const updateBody = await request(`/api/v1/admin/match/live/${liveMatch._id}`, 'PUT', {
      homeScore: 1,
      awayScore: 0,
      minute: 58,
      period: '下半场',
      odds: currentMatch.odds,
      bettingOpen: true
    })
    const version = updateBody.data.marketVersion
    const payload = createBetPayload({
      quotedOdds: 1.08,
      marketVersion: version,
      amount: 40
    })

    const results = await Promise.all([
      request('/api/v1/bet/place', 'POST', payload),
      request('/api/v1/bet/place', 'POST', payload)
    ])
    const successCount = results.filter(result => result.code === 200).length
    const failedCount = results.filter(result => result.code === 400).length
    assert.equal(successCount, 1)
    assert.equal(failedCount, 1)

    const account = await Account.findOne()
    assert.equal(account.quota, 10)
  })

  await t.test('订单创建失败后额度自动退还并记录日志', async () => {
    await Account.updateOne({}, { $set: { quota: 100 } })
    const currentMatch = await Match.findOne({ matchId: 'live001' })
    const originalCreate = BetOrder.create
    BetOrder.create = async () => {
      throw new Error('模拟订单创建失败')
    }

    try {
      await assert.rejects(
        betService.placeBet(createBetPayload({
          quotedOdds: 1.08,
          marketVersion: currentMatch.marketVersion,
          amount: 10
        })),
        /模拟订单创建失败/
      )
    } finally {
      BetOrder.create = originalCreate
    }

    const account = await Account.findOne()
    const refundLog = await QuotaLog.findOne({ remark: '订单创建失败退还' })
    assert.equal(account.quota, 100)
    assert.equal(refundLog.amount, 10)
  })

  await t.test('滚球订单继续支持人工结算', async () => {
    const order = await BetOrder.findOne({ betMode: 'live', status: 'pending' })
    const body = await request(`/api/v1/bet/settle/${order.orderId}`, 'POST', {
      result: 'win',
      finalHomeScore: 2,
      finalAwayScore: 0
    })
    assert.equal(body.code, 200)
    assert.equal(body.data.result, 'win')
  })

  await t.test('状态切换为结束或未开赛时关闭滚球并各递增一次版本', async () => {
    const before = await Match.findOne({ matchId: 'live001' })
    const finishedBody = await request(`/api/v1/admin/match/status/${liveMatch._id}`, 'PUT', {
      status: 'finished'
    })
    assert.equal(finishedBody.code, 200)
    assert.equal(finishedBody.data.isLive, false)
    assert.equal(finishedBody.data.bettingOpen, false)
    assert.equal(finishedBody.data.marketVersion, before.marketVersion + 1)

    const upcomingBody = await request(`/api/v1/admin/match/status/${liveMatch._id}`, 'PUT', {
      status: 'upcoming'
    })
    assert.equal(upcomingBody.code, 200)
    assert.equal(upcomingBody.data.isLive, false)
    assert.equal(upcomingBody.data.bettingOpen, false)
    assert.equal(upcomingBody.data.marketVersion, before.marketVersion + 2)
  })
})
