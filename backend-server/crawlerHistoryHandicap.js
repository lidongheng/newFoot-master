/**
 * 历史同赔走势 + 同档次对阵分析脚本
 *
 * 根据 wudaconfig.js 中配置的比赛信息，在 match_center 数据中查找：
 * 1. 该场比赛的初盘全场让球
 * 2. 主队在本赛季主场同让球的历史战绩
 * 3. 客队在本赛季客场同让球的历史战绩
 * 4. 主队在主场打同档次球队（客队所在档次）的比赛结果和盘口输赢
 * 5. 客队在客场打同档次球队（主队所在档次）的比赛结果和盘口输赢
 *
 * 使用: node crawlerHistoryHandicap.js
 * 配置: config/wudaconfig.js (leagueSerial, leagueSlug, season, roundSerial, matchSerial)
 * 球队分档: league-team-strength.json
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const config = require('./config/wudaconfig');
const LEAGUE_SERIAL = config.leagueSerial;
const LEAGUE_SLUG = config.leagueSlug;
const SEASON = config.season;
const ROUND_SERIAL = config.roundSerial;
const MATCH_SERIAL = config.matchSerial;

// ============ match 数组索引常量 ============
const IDX = {
  MATCH_ID: 0,
  STATE_CODE: 2,
  DATETIME: 3,
  HOME_TEAM: 4,
  AWAY_TEAM: 5,
  FULL_SCORE: 6,
  HALF_SCORE: 7,
  HOME_RANK: 8,
  AWAY_RANK: 9,
  HANDICAP: 10,        // 初盘全场让球
  HALF_HANDICAP: 11,   // 初盘半场让球
  OVER_UNDER: 12,      // 初盘大小球
  GOALS_LINE: 13,      // 初盘进球数
};

// ============ 工具函数 ============

function parseMatchCenterFile(leagueSerial) {
  const filePath = path.join(__dirname, 'match_center', `s${leagueSerial}.js`);
  if (!fs.existsSync(filePath)) {
    console.error(`[错误] match_center 文件不存在: ${filePath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const sandbox = { jh: {} };
  vm.createContext(sandbox);
  vm.runInContext(content, sandbox);
  return {
    arrLeague: sandbox.arrLeague,
    arrTeam: sandbox.arrTeam,
    rounds: sandbox.jh,
  };
}

function buildTeamMap(arrTeam) {
  const map = {};
  for (const t of arrTeam) {
    map[t[0]] = { chineseName: t[1], englishName: t[3] };
  }
  return map;
}

/**
 * 解析比分字符串 "2-1" => { home: 2, away: 1 }
 */
function parseScore(scoreStr) {
  if (!scoreStr || typeof scoreStr !== 'string') return null;
  const parts = scoreStr.split('-');
  if (parts.length !== 2) return null;
  return { home: parseInt(parts[0]), away: parseInt(parts[1]) };
}

/**
 * 判断让球盘输赢结果（从主队角度）
 * handicap 为正数表示主队让球，负数表示主队受让
 * 返回: '赢', '走水', '输', '赢半', '输半'
 */
function handicapResult(homeGoals, awayGoals, handicap) {
  const diff = homeGoals - awayGoals - handicap;
  if (diff > 0.25) return '赢';
  if (diff === 0.25) return '赢半';
  if (diff === 0) return '走水';
  if (diff === -0.25) return '输半';
  return '输';
}

/**
 * 获取字符串显示宽度（中文字符算2）
 */
function getDisplayWidth(str) {
  let width = 0;
  for (const ch of String(str)) {
    width += (ch.charCodeAt(0) > 0x7F) ? 2 : 1;
  }
  return width;
}

function padRight(str, targetWidth) {
  const diff = targetWidth - getDisplayWidth(String(str));
  return String(str) + ' '.repeat(Math.max(0, diff));
}

function padLeft(str, targetWidth) {
  const diff = targetWidth - getDisplayWidth(String(str));
  return ' '.repeat(Math.max(0, diff)) + String(str);
}

/**
 * 格式化让球数显示
 */
function formatHandicap(h) {
  if (h === 0) return '平手';
  const abs = Math.abs(h);
  const prefix = h > 0 ? '让' : '受让';
  return `${prefix}${abs}`;
}

/**
 * 打印比赛列表表格
 */
function printMatchTable(title, matches, teamMap, perspective) {
  console.log(`\n${'─'.repeat(90)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(90));

  if (matches.length === 0) {
    console.log('  （无符合条件的比赛）');
    return { win: 0, draw: 0, lose: 0, winHalf: 0, loseHalf: 0, total: 0 };
  }

  // 统计
  const stats = { win: 0, draw: 0, lose: 0, winHalf: 0, loseHalf: 0, total: matches.length };

  // 表头
  const headers = ['#', '轮次', '日期', '主队', '比分', '客队', '让球', '盘路', '半场'];
  const colWidths = [3, 4, 16, 14, 5, 14, 8, 6, 5];

  const headerLine = headers.map((h, i) => padRight(h, colWidths[i])).join('  ');
  console.log(`  ${headerLine}`);
  console.log(`  ${colWidths.map(w => '─'.repeat(w)).join('  ')}`);

  matches.forEach((m, idx) => {
    const homeName = teamMap[m.homeTeamId]?.chineseName || String(m.homeTeamId);
    const awayName = teamMap[m.awayTeamId]?.chineseName || String(m.awayTeamId);
    const score = parseScore(m.fullScore);
    const halfScore = m.halfScore || '';

    let result = '-';
    if (score) {
      const rawResult = handicapResult(score.home, score.away, m.handicap);
      // 根据视角调整结果显示
      if (perspective === 'away') {
        const flipMap = { '赢': '输', '输': '赢', '赢半': '输半', '输半': '赢半', '走水': '走水' };
        result = flipMap[rawResult] || rawResult;
      } else {
        result = rawResult;
      }

      if (result === '赢') stats.win++;
      else if (result === '输') stats.lose++;
      else if (result === '走水') stats.draw++;
      else if (result === '赢半') stats.winHalf++;
      else if (result === '输半') stats.loseHalf++;
    }

    const cols = [
      padLeft(String(idx + 1), colWidths[0]),
      padRight(`R${m.round}`, colWidths[1]),
      padRight(m.datetime.slice(0, 16), colWidths[2]),
      padRight(homeName, colWidths[3]),
      padRight(m.fullScore || '-', colWidths[4]),
      padRight(awayName, colWidths[5]),
      padRight(formatHandicap(m.handicap), colWidths[6]),
      padRight(result, colWidths[7]),
      padRight(halfScore, colWidths[8]),
    ];
    console.log(`  ${cols.join('  ')}`);
  });

  return stats;
}

/**
 * 输出统计摘要
 */
function printStats(label, stats) {
  if (stats.total === 0) return;
  const parts = [];
  if (stats.win > 0) parts.push(`赢 ${stats.win}`);
  if (stats.winHalf > 0) parts.push(`赢半 ${stats.winHalf}`);
  if (stats.draw > 0) parts.push(`走水 ${stats.draw}`);
  if (stats.loseHalf > 0) parts.push(`输半 ${stats.loseHalf}`);
  if (stats.lose > 0) parts.push(`输 ${stats.lose}`);

  const winRate = ((stats.win + stats.winHalf * 0.5) / stats.total * 100).toFixed(1);
  console.log(`\n  [${label}统计] 共 ${stats.total} 场: ${parts.join(' / ')}  (赢盘率: ${winRate}%)`);
}

// ============ 球队分档 ============

/**
 * 加载球队分档数据，并与 teamMap 交叉匹配，返回 { teamId -> tierNumber } 的映射
 * 使用 teamId 而非中文名，避免同一球队不同中文名导致匹配失败
 */
function loadTeamStrength(teamMap) {
  const filePath = path.join(__dirname, 'league-team-strength.json');
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const leagueData = data[LEAGUE_SLUG];
    if (!leagueData) return null;
    const seasonData = leagueData[SEASON];
    if (!seasonData) return null;
    // 兼容两种结构：
    // 1) 有版本号: seasonData = { "1": { "1": [...], "2": [...] } }
    // 2) 无版本号: seasonData = { "1": [...], "2": [...] }
    const firstValue = Object.values(seasonData)[0];
    let tiers;
    if (Array.isArray(firstValue)) {
      tiers = seasonData;
    } else {
      const versions = Object.keys(seasonData).sort((a, b) => Number(b) - Number(a));
      if (versions.length === 0) return null;
      tiers = seasonData[versions[0]];
    }

    // 构建 chineseName -> teamId 的反向映射（从 match_center 数据）
    const nameToId = {};
    for (const [id, info] of Object.entries(teamMap)) {
      nameToId[info.chineseName] = Number(id);
    }

    // 构建 teamId -> tier 映射
    const teamIdToTier = {};
    const unmatchedNames = [];
    for (const [tier, teams] of Object.entries(tiers)) {
      for (const name of teams) {
        const id = nameToId[name];
        if (id != null) {
          teamIdToTier[id] = Number(tier);
        } else {
          unmatchedNames.push(name);
        }
      }
    }

    if (unmatchedNames.length > 0) {
      console.warn(`  [警告] 以下球队在 league-team-strength.json 中的名称与 match_center 不匹配: ${unmatchedNames.join('、')}`);
    }

    return teamIdToTier;
  } catch {
    return null;
  }
}

/**
 * 通过 teamId 查找球队档次
 */
function getTeamTier(teamId, teamIdToTier) {
  if (!teamIdToTier) return null;
  return teamIdToTier[teamId] ?? null;
}

/**
 * 获取某个档次的所有球队 teamId 列表
 */
function getTeamIdsByTier(tier, teamIdToTier) {
  if (!teamIdToTier || tier == null) return [];
  const ids = [];
  for (const [id, t] of Object.entries(teamIdToTier)) {
    if (t === tier) ids.push(Number(id));
  }
  return ids;
}

/**
 * 打印同档次对阵表格（含比赛胜负和盘口输赢）
 */
function printTierMatchTable(title, matches, teamMap, perspective) {
  console.log(`\n${'─'.repeat(105)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(105));

  if (matches.length === 0) {
    console.log('  （无符合条件的比赛）');
    return { matchWin: 0, matchDraw: 0, matchLose: 0, win: 0, draw: 0, lose: 0, winHalf: 0, loseHalf: 0, total: 0, gf: 0, ga: 0 };
  }

  const stats = {
    matchWin: 0, matchDraw: 0, matchLose: 0,
    win: 0, draw: 0, lose: 0, winHalf: 0, loseHalf: 0,
    total: matches.length, gf: 0, ga: 0,
  };

  const headers = ['#', '轮次', '日期', '主队', '比分', '客队', '让球', '胜负', '盘路', '半场'];
  const colWidths = [3, 4, 16, 14, 5, 14, 8, 4, 6, 5];

  const headerLine = headers.map((h, i) => padRight(h, colWidths[i])).join('  ');
  console.log(`  ${headerLine}`);
  console.log(`  ${colWidths.map(w => '─'.repeat(w)).join('  ')}`);

  matches.forEach((m, idx) => {
    const homeName = teamMap[m.homeTeamId]?.chineseName || String(m.homeTeamId);
    const awayName = teamMap[m.awayTeamId]?.chineseName || String(m.awayTeamId);
    const score = parseScore(m.fullScore);
    const halfScore = m.halfScore || '';

    let matchResult = '-';
    let handicapRes = '-';

    if (score) {
      stats.gf += perspective === 'away' ? score.away : score.home;
      stats.ga += perspective === 'away' ? score.home : score.away;

      // 比赛胜负（从视角球队）
      if (perspective === 'away') {
        if (score.away > score.home) { matchResult = '胜'; stats.matchWin++; }
        else if (score.away < score.home) { matchResult = '负'; stats.matchLose++; }
        else { matchResult = '平'; stats.matchDraw++; }
      } else {
        if (score.home > score.away) { matchResult = '胜'; stats.matchWin++; }
        else if (score.home < score.away) { matchResult = '负'; stats.matchLose++; }
        else { matchResult = '平'; stats.matchDraw++; }
      }

      // 盘口输赢
      const rawResult = handicapResult(score.home, score.away, m.handicap);
      if (perspective === 'away') {
        const flipMap = { '赢': '输', '输': '赢', '赢半': '输半', '输半': '赢半', '走水': '走水' };
        handicapRes = flipMap[rawResult] || rawResult;
      } else {
        handicapRes = rawResult;
      }

      if (handicapRes === '赢') stats.win++;
      else if (handicapRes === '输') stats.lose++;
      else if (handicapRes === '走水') stats.draw++;
      else if (handicapRes === '赢半') stats.winHalf++;
      else if (handicapRes === '输半') stats.loseHalf++;
    }

    const cols = [
      padLeft(String(idx + 1), colWidths[0]),
      padRight(`R${m.round}`, colWidths[1]),
      padRight(m.datetime.slice(0, 16), colWidths[2]),
      padRight(homeName, colWidths[3]),
      padRight(m.fullScore || '-', colWidths[4]),
      padRight(awayName, colWidths[5]),
      padRight(formatHandicap(m.handicap), colWidths[6]),
      padRight(matchResult, colWidths[7]),
      padRight(handicapRes, colWidths[8]),
      padRight(halfScore, colWidths[9]),
    ];
    console.log(`  ${cols.join('  ')}`);
  });

  return stats;
}

/**
 * 输出同档次对阵统计摘要
 */
function printTierStats(label, stats) {
  if (stats.total === 0) return;

  const matchParts = [];
  if (stats.matchWin > 0) matchParts.push(`${stats.matchWin}胜`);
  if (stats.matchDraw > 0) matchParts.push(`${stats.matchDraw}平`);
  if (stats.matchLose > 0) matchParts.push(`${stats.matchLose}负`);
  const matchStr = matchParts.join('') || '0胜0平0负';
  const winPct = ((stats.matchWin / stats.total) * 100).toFixed(1);
  const unbeatenPct = (((stats.matchWin + stats.matchDraw) / stats.total) * 100).toFixed(1);

  const handicapParts = [];
  if (stats.win > 0) handicapParts.push(`赢 ${stats.win}`);
  if (stats.winHalf > 0) handicapParts.push(`赢半 ${stats.winHalf}`);
  if (stats.draw > 0) handicapParts.push(`走水 ${stats.draw}`);
  if (stats.loseHalf > 0) handicapParts.push(`输半 ${stats.loseHalf}`);
  if (stats.lose > 0) handicapParts.push(`输 ${stats.lose}`);
  const handicapWinRate = ((stats.win + stats.winHalf * 0.5) / stats.total * 100).toFixed(1);

  console.log(`\n  [${label}] 共 ${stats.total} 场: ${matchStr}  进${stats.gf}球 失${stats.ga}球  (胜率: ${winPct}%  不败率: ${unbeatenPct}%)`);
  console.log(`  [盘口] ${handicapParts.join(' / ')}  (赢盘率: ${handicapWinRate}%)`);
}

// ============ 主逻辑 ============

function main() {
  const matchCenter = parseMatchCenterFile(LEAGUE_SERIAL);
  const teamMap = buildTeamMap(matchCenter.arrTeam);
  const leagueName = matchCenter.arrLeague[1];
  const teamIdToTier = loadTeamStrength(teamMap);

  // 1. 查找目标比赛
  const roundKey = `R_${ROUND_SERIAL}`;
  const roundMatches = matchCenter.rounds[roundKey];
  if (!roundMatches) {
    console.error(`[错误] 第 ${ROUND_SERIAL} 轮数据不存在`);
    process.exit(1);
  }

  const targetMatch = roundMatches.find(m => String(m[IDX.MATCH_ID]) === String(MATCH_SERIAL));
  if (!targetMatch) {
    console.error(`[错误] 在第 ${ROUND_SERIAL} 轮中未找到比赛 ${MATCH_SERIAL}`);
    process.exit(1);
  }

  const homeTeamId = targetMatch[IDX.HOME_TEAM];
  const awayTeamId = targetMatch[IDX.AWAY_TEAM];
  const handicap = targetMatch[IDX.HANDICAP];
  const targetDatetime = targetMatch[IDX.DATETIME];
  const homeName = teamMap[homeTeamId]?.chineseName || String(homeTeamId);
  const awayName = teamMap[awayTeamId]?.chineseName || String(awayTeamId);

  const homeTier = getTeamTier(homeTeamId, teamIdToTier);
  const awayTier = getTeamTier(awayTeamId, teamIdToTier);

  console.log('═'.repeat(105));
  console.log(`  历史同赔走势 + 同档次对阵分析`);
  console.log(`  ${leagueName}  第 ${ROUND_SERIAL} 轮`);
  console.log(`  ${homeName} vs ${awayName}  (ID: ${MATCH_SERIAL})`);
  console.log(`  比赛时间: ${targetDatetime}`);
  console.log(`  初盘让球: ${formatHandicap(handicap)} (${handicap})`);
  if (homeTier && awayTier) {
    console.log(`  球队分档: ${homeName} 第${homeTier}档  |  ${awayName} 第${awayTier}档`);
  }
  console.log('═'.repeat(105));

  // 2. 收集所有已完赛且在目标比赛之前的比赛
  const allFinishedBefore = [];
  for (const rk of Object.keys(matchCenter.rounds)) {
    for (const m of matchCenter.rounds[rk]) {
      if (m[IDX.STATE_CODE] !== -1) continue;
      if (!m[IDX.FULL_SCORE]) continue;
      if (m[IDX.DATETIME] >= targetDatetime) continue;
      if (m[IDX.MATCH_ID] === targetMatch[IDX.MATCH_ID]) continue;
      allFinishedBefore.push({
        matchId: m[IDX.MATCH_ID],
        round: rk.replace('R_', ''),
        datetime: m[IDX.DATETIME],
        homeTeamId: m[IDX.HOME_TEAM],
        awayTeamId: m[IDX.AWAY_TEAM],
        fullScore: m[IDX.FULL_SCORE],
        halfScore: m[IDX.HALF_SCORE],
        handicap: m[IDX.HANDICAP],
      });
    }
  }

  allFinishedBefore.sort((a, b) => a.datetime.localeCompare(b.datetime));

  // ======== Part 1: 历史同赔 ========
  console.log(`\n\n${'▶'.repeat(3)}  Part 1: 历史同赔走势`);

  const homeHandicapMatches = allFinishedBefore.filter(
    m => m.homeTeamId === homeTeamId && m.handicap === handicap
  );
  const awayHandicapMatches = allFinishedBefore.filter(
    m => m.awayTeamId === awayTeamId && m.handicap === handicap
  );

  const homeStats = printMatchTable(
    `${homeName} 主场  初盘 ${formatHandicap(handicap)} (${handicap}) 的历史比赛`,
    homeHandicapMatches, teamMap, 'home'
  );
  printStats(`${homeName}主场同赔`, homeStats);

  const awayStats = printMatchTable(
    `${awayName} 客场  初盘 ${formatHandicap(handicap)} (${handicap}) 的历史比赛  (盘路从${awayName}角度)`,
    awayHandicapMatches, teamMap, 'away'
  );
  printStats(`${awayName}客场同赔`, awayStats);

  // ======== Part 2: 同档次对阵 ========
  if (teamIdToTier && homeTier != null && awayTier != null) {
    console.log(`\n\n${'▶'.repeat(3)}  Part 2: 同档次对阵分析`);

    // 主队主场 vs 客队所在档次的所有球队
    const awayTierTeamIds = getTeamIdsByTier(awayTier, teamIdToTier);
    const homeTierTeamIds = getTeamIdsByTier(homeTier, teamIdToTier);

    const homeTierMatches = allFinishedBefore.filter(
      m => m.homeTeamId === homeTeamId && awayTierTeamIds.includes(m.awayTeamId)
    );
    const awayTierMatches = allFinishedBefore.filter(
      m => m.awayTeamId === awayTeamId && homeTierTeamIds.includes(m.homeTeamId)
    );

    const awayTierNames = awayTierTeamIds.map(id => teamMap[id]?.chineseName).filter(Boolean).join('、');
    const homeTierNames = homeTierTeamIds.map(id => teamMap[id]?.chineseName).filter(Boolean).join('、');

    const homeTierStats = printTierMatchTable(
      `${homeName} 主场 vs 第${awayTier}档球队（${awayTierNames}）`,
      homeTierMatches, teamMap, 'home'
    );
    printTierStats(`${homeName}主场vs第${awayTier}档`, homeTierStats);

    const awayTierStats = printTierMatchTable(
      `${awayName} 客场 vs 第${homeTier}档球队（${homeTierNames}）  (胜负/盘路从${awayName}角度)`,
      awayTierMatches, teamMap, 'away'
    );
    printTierStats(`${awayName}客场vs第${homeTier}档`, awayTierStats);
  } else {
    console.log(`\n  [提示] 未找到球队分档数据（league-team-strength.json 中无 ${LEAGUE_SLUG}/${SEASON} 配置），跳过同档次分析`);
  }

  // ======== 说明 ========
  console.log(`\n${'═'.repeat(105)}`);
  console.log(`  说明: 盘路结果中，主队表中从主队角度判断，客队表中从客队角度判断`);
  console.log(`        让球为正表示主队让球，为负表示主队受让（客队让球）`);
  if (homeTier && awayTier) {
    console.log(`        同档次分析基于 league-team-strength.json 中的球队分档`);
  }
  console.log('═'.repeat(105));
}

main();
