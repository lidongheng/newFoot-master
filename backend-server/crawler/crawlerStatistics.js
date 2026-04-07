const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')

// 读取HTML文件
const htmlPath = path.resolve(__dirname, '../example3.html')
const html = fs.readFileSync(htmlPath, 'utf8')
const $ = cheerio.load(html)

// ==================== 工具函数 ====================

// 从HTML字符串中提取纯文本球队名称
function getTeamName(htmlStr) {
  if (!htmlStr) return ''
  const $t = cheerio.load('<div>' + htmlStr + '</div>', null, false)
  $t('.hp').remove()
  return $t.text().trim()
}

// 亚盘数值转传统盘口: 0.25->0/0.5, 0.75->0.5/1, -0.25->-0/0.5
function formatHandicap(val) {
  if (val === '' || val === undefined || val === null) return ''
  const num = parseFloat(val)
  if (isNaN(num)) return String(val)
  if (num === 0) return '0'
  const sign = num < 0 ? '-' : ''
  const abs = Math.abs(num)
  const whole = Math.floor(abs)
  const decimal = Math.round((abs - whole) * 100) / 100
  if (Math.abs(decimal - 0.25) < 0.01) {
    return sign + whole + '/' + (whole + 0.5)
  } else if (Math.abs(decimal - 0.75) < 0.01) {
    return sign + (whole + 0.5) + '/' + (whole + 1)
  } else {
    return num.toString()
  }
}

// 根据比分和亚盘计算让球结果
function computeHandicapResult(homeScore, awayScore, handicapStr, isAnalyzedHome) {
  if (!handicapStr && handicapStr !== 0 && handicapStr !== '0') return ''
  const handicap = parseFloat(handicapStr)
  if (isNaN(handicap)) return ''
  const adjustedHome = homeScore - handicap
  let result
  if (adjustedHome > awayScore) result = 1
  else if (adjustedHome < awayScore) result = -1
  else result = 0
  const teamResult = isAnalyzedHome ? result : -result
  return teamResult === 1 ? '赢' : teamResult === -1 ? '输' : '走'
}

// 大小球结果文本
function getOuText(val) {
  if (val === 1) return '大'
  if (val === -1) return '小'
  if (val === 0) return '走'
  return ''
}

// ==================== 数据提取 ====================

function extractScriptData() {
  let scriptContent = ''
  $('script').each(function (i, el) {
    const text = $(el).html()
    if (text && text.includes('var v_data')) {
      scriptContent = text
    }
  })
  if (!scriptContent) {
    console.error('未找到包含数据的script标签')
    return null
  }

  const result = {}
  const arrayVars = ['v_data', 'h_data', 'a_data', 'Vs_hOdds']
  for (const name of arrayVars) {
    const regex = new RegExp('var\\s+' + name + '\\s*=\\s*(\\[.+\\])')
    const match = scriptContent.match(regex)
    if (match) {
      try { result[name] = eval(match[1]) }
      catch (e) { console.error('解析 ' + name + ' 失败:', e.message); result[name] = [] }
    } else {
      result[name] = []
    }
  }

  const mHome = scriptContent.match(/var\s+hometeam\s*=\s*"(.+?)"/)
  const mGuest = scriptContent.match(/var\s+guestteam\s*=\s*"(.+?)"/)
  const mTime = scriptContent.match(/var\s+strTime\s*=\s*'(.+?)'/)
  const mH2hHome = scriptContent.match(/var\s+h2h_home\s*=\s*(\d+)/)
  const mH2hAway = scriptContent.match(/var\s+h2h_away\s*=\s*(\d+)/)

  result.hometeam = mHome ? mHome[1] : ''
  result.guestteam = mGuest ? mGuest[1] : ''
  result.strTime = mTime ? mTime[1] : ''
  result.h2h_home = mH2hHome ? parseInt(mH2hHome[1]) : 0
  result.h2h_away = mH2hAway ? parseInt(mH2hAway[1]) : 0

  return result
}

// 处理Vs_hOdds: 按oddsId分组，取皇冠(bookmaker=3)
function processVsOdds(vsHOdds) {
  if (!vsHOdds || vsHOdds.length === 0) return []
  const groups = new Map()
  const order = []
  for (const entry of vsHOdds) {
    const id = entry[0]
    if (!groups.has(id)) { groups.set(id, []); order.push(id) }
    groups.get(id).push(entry)
  }
  return order.map(function (id) {
    const entries = groups.get(id)
    const crown = entries.find(function (e) { return e[1] === 3 }) || entries[0]
    return {
      initHandicap: crown[3],
      finalHandicap: crown[6],
      initOuLine: crown[8],
      finalOuLine: crown[9],
    }
  })
}

// 解析未来五场HTML表格
function parseFutureMatches(year) {
  const result = { home: [], away: [], homeTeam: '', awayTeam: '' }
  const section = $('#porlet_20')
  if (!section.length) { console.error('未找到未来五场区域'); return result }

  const tds = section.find('td[valign="top"]')

  const homeTable = tds.eq(0).find('table')
  result.homeTeam = homeTable.find('b').first().text().trim()
  homeTable.find('tr[align="middle"]').each(function (i, tr) {
    const cells = $(tr).find('td')
    result.home.push({
      date: year + '-' + cells.eq(0).text().trim(),
      league: cells.eq(1).text().trim(),
      matchup: cells.eq(2).text().trim().replace(/\s*-\s*/, 'vs'),
      days: cells.eq(5).text().trim().replace(/\s+/g, ''),
    })
  })

  const awayTable = tds.eq(1).find('table')
  result.awayTeam = awayTable.find('b').first().text().trim()
  awayTable.find('tr[align="middle"]').each(function (i, tr) {
    const cells = $(tr).find('td')
    result.away.push({
      date: year + '-' + cells.eq(0).text().trim(),
      league: cells.eq(1).text().trim(),
      matchup: cells.eq(2).text().trim().replace(/\s*-\s*/, 'vs'),
      days: cells.eq(5).text().trim().replace(/\s+/g, ''),
    })
  })
  return result
}

// ==================== 格式化 ====================

function formatRecentMatch(match, analyzedTeamId) {
  const date = match[0]
  const homeId = match[4]
  const home = getTeamName(match[5])
  const away = getTeamName(match[7])
  const homeScore = match[8]
  const awayScore = match[9]
  const handicapVal = match[11]
  const ouResultVal = match[14]
  const totalGoals = homeScore + awayScore
  const isAnalyzedHome = (homeId === analyzedTeamId)
  const hResult = computeHandicapResult(homeScore, awayScore, String(handicapVal), isAnalyzedHome)
  const handicapDisplay = formatHandicap(handicapVal)
  return date + ' ' + home + ' ' + homeScore + '-' + awayScore + ' ' + away + ' ' + handicapDisplay + hResult + ' ' + totalGoals + getOuText(ouResultVal)
}

// ==================== 主逻辑 ====================

function main() {
  const data = extractScriptData()
  if (!data) { console.error('数据提取失败'); process.exit(1) }

  const v_data = data.v_data
  const h_data = data.h_data
  const a_data = data.a_data
  const Vs_hOdds = data.Vs_hOdds
  const hometeam = data.hometeam
  const guestteam = data.guestteam
  const strTime = data.strTime
  const h2h_home = data.h2h_home
  const h2h_away = data.h2h_away
  const year = strTime ? strTime.substring(2, 4) : '26'

  console.log('主队: ' + hometeam + ' | 客队: ' + guestteam + ' | 比赛时间: ' + strTime)
  console.log('')

  const vsOdds = processVsOdds(Vs_hOdds)

  // ===== 1. 对赛往绩（近10场） =====
  console.log('对赛往绩')
  v_data.slice(0, 10).forEach(function (match, i) {
    const date = match[0]
    const league = match[2]
    const homeId = match[4]
    const home = getTeamName(match[5])
    const away = getTeamName(match[7])
    const homeScore = match[8]
    const awayScore = match[9]
    const totalGoals = homeScore + awayScore
    let handicapStr = ''
    let ouStr = ''
    if (vsOdds[i]) {
      const handicapVal = vsOdds[i].initHandicap
      const ouLine = vsOdds[i].initOuLine
      const isAnalyzedHome = (homeId === h2h_home)
      const hResult = computeHandicapResult(homeScore, awayScore, handicapVal, isAnalyzedHome)
      handicapStr = formatHandicap(handicapVal) + hResult
      const ouLineNum = parseFloat(ouLine)
      if (!isNaN(ouLineNum)) {
        const ouResult = totalGoals > ouLineNum ? '大' : totalGoals < ouLineNum ? '小' : '走'
        ouStr = ouLine + ouResult
      }
    }
    console.log(date + ' ' + league + ' ' + home + ' ' + homeScore + '-' + awayScore + ' ' + away + ' ' + handicapStr + ' ' + ouStr)
  })

  // ===== 2. 近期战绩 =====
  console.log('')
  console.log('近期战绩')
  console.log(hometeam)
  h_data.slice(0, 10).forEach(function (match) {
    console.log(formatRecentMatch(match, h2h_home))
  })
  console.log('')
  console.log(guestteam)
  a_data.slice(0, 10).forEach(function (match) {
    console.log(formatRecentMatch(match, h2h_away))
  })

  // ===== 3. 未来比赛 =====
  console.log('')
  console.log('未来比赛')
  const future = parseFutureMatches(year)
  console.log(future.homeTeam || hometeam)
  future.home.forEach(function (match) {
    console.log(match.date + ' ' + match.league + ' ' + match.matchup + ' ' + match.days)
  })
  console.log('')
  console.log(future.awayTeam || guestteam)
  future.away.forEach(function (match) {
    console.log(match.date + ' ' + match.league + ' ' + match.matchup + ' ' + match.days)
  })
}

main()
