/**
 * 落后抢回分数排行榜：球队曾在比赛中落后，最终追平记 1 分、逆转获胜记 3 分。
 * 输出各队抢回分数、落后场次、追平/逆转次数及比赛明细到终端。
 *
 * config/squadTarget.js 必填字段：
 * - leagueSlug：config/index.js 已登记的赛事目录名，如 epl。
 * - leagueSerial：该赛事的球探序号，必须与 leagueSlug 对应，如英超 '36'。
 * - season：本地 basicData 下的赛季目录名，如 '25-26'，必须与实际目录一致。
 * 前置：本地赛事 data/ 赛程和 basicData/{season}/round-{轮次}/{对阵}/matchEvents.json 已准备好。
 * 仅统计包含 FullTime 比分的比赛；没有事件文件的场次不计入，范围为已采集数据。
 * 仅扫描 round-* 目录；杯赛使用同样的胜 3 平 1 口径，不代表晋级结果。
 * 不读取 teamSerial、roundSerial、isNation，不限制单队或截止轮次。
 * 工作目录：cup-analyzer/crawler-server。
 * 命令：node processors/comebackPointsRanking.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const config = require('../config');
const squadTarget = require('../config/squadTarget');

const { leagueSlug, leagueSerial, season } = squadTarget;
const league = config.cups[leagueSlug];
if (!league || String(league.cupSerial) !== String(leagueSerial)) {
  throw new Error('请在 squadTarget.js 设置相互对应的 leagueSlug 和 leagueSerial。');
}
if (typeof season !== 'string' || season.trim() === '') {
  throw new Error('请在 squadTarget.js 设置与 basicData 赛季目录一致的 season。');
}
const leagueDir = path.join(league.paths.basicData, season);

// 直接读取对应赛事模块的赛程，球队按球探 ID 归并，不按中文队名匹配。
function parseScheduleFile() {
  const filePath = league.paths.cupScheduleData;
  const content = fs.readFileSync(filePath, 'utf8');
  const sandbox = { jh: {}, arrTeam: [] };
  vm.createContext(sandbox);
  vm.runInContext(content, sandbox, { filename: filePath, timeout: 5000 });
  return { arrTeam: sandbox.arrTeam, rounds: sandbox.jh };
}

function buildTeamIdMap(arrTeam) {
  const map = {};
  for (const t of arrTeam) {
    map[t[0]] = { chineseName: t[1], englishName: t[3] };
  }
  return map;
}

function buildMatchIdMap(rounds) {
  const map = {};
  for (const roundKey of Object.keys(rounds)) {
    for (const m of rounds[roundKey]) {
      map[m[0]] = { homeTeamId: m[4], awayTeamId: m[5] };
    }
  }
  return map;
}

const schedule = parseScheduleFile();
const teamIdMap = buildTeamIdMap(schedule.arrTeam);
const matchIdMap = buildMatchIdMap(schedule.rounds);

if (!fs.existsSync(leagueDir)) {
  console.error(`联赛目录不存在: ${leagueDir}`);
  process.exit(1);
}

const teamStats = {};

function resolveTeamKeys(matchId) {
  const match = matchIdMap[matchId];
  if (!match || !teamIdMap[match.homeTeamId] || !teamIdMap[match.awayTeamId]) {
    throw new Error(`赛程中缺少比赛 ${matchId} 或对应球队，请检查赛事和赛季。`);
  }
  return {
    homeKey: String(match.homeTeamId),
    awayKey: String(match.awayTeamId),
    homeDisplay: teamIdMap[match.homeTeamId].chineseName,
    awayDisplay: teamIdMap[match.awayTeamId].chineseName,
  };
}

function ensureTeam(key, displayName) {
  if (!teamStats[key]) {
    teamStats[key] = {
      displayName,
      totalMatches: 0,
      behindCount: 0,
      recoveredDraws: 0,
      recoveredWins: 0,
      lostFromBehind: 0,
      totalRecovered: 0,
      details: [],
    };
  }
}

/**
 * 分析单场比赛，判断主客队是否曾落后，以及最终结果
 */
function analyzeMatch(eventsData, roundName) {
  const { events, matchId } = eventsData;
  if (!Array.isArray(events)) return false;

  const { homeKey, awayKey, homeDisplay, awayDisplay } =
    resolveTeamKeys(matchId);

  const goalScores = [];
  let finalScore = null;

  for (const event of events) {
    if (event.type === 'goal' && event.score) {
      goalScores.push({ home: event.score.home, away: event.score.away });
    }
    if (event.process === 'FullTime' && event.score) {
      finalScore = event.score;
    }
  }

  // 未完赛的事件数据不进入排名和已处理场次数。
  if (!finalScore) return false;

  ensureTeam(homeKey, homeDisplay);
  ensureTeam(awayKey, awayDisplay);
  teamStats[homeKey].totalMatches++;
  teamStats[awayKey].totalMatches++;

  let homeWasBehind = false;
  let awayWasBehind = false;

  for (const s of goalScores) {
    if (s.home < s.away) homeWasBehind = true;
    if (s.away < s.home) awayWasBehind = true;
  }

  const isDraw = finalScore.home === finalScore.away;
  const homeWin = finalScore.home > finalScore.away;
  const awayWin = finalScore.away > finalScore.home;
  const scoreStr = `${finalScore.home}-${finalScore.away}`;
  const roundNum = roundName.replace('round-', 'R');

  if (homeWasBehind) {
    teamStats[homeKey].behindCount++;
    if (isDraw) {
      teamStats[homeKey].recoveredDraws++;
      teamStats[homeKey].totalRecovered += 1;
      teamStats[homeKey].details.push(`${roundNum} ${homeDisplay} vs ${awayDisplay} ${scoreStr} 追平+1分`);
    } else if (homeWin) {
      teamStats[homeKey].recoveredWins++;
      teamStats[homeKey].totalRecovered += 3;
      teamStats[homeKey].details.push(`${roundNum} ${homeDisplay} vs ${awayDisplay} ${scoreStr} 逆转+3分`);
    } else {
      teamStats[homeKey].lostFromBehind++;
    }
  }

  if (awayWasBehind) {
    teamStats[awayKey].behindCount++;
    if (isDraw) {
      teamStats[awayKey].recoveredDraws++;
      teamStats[awayKey].totalRecovered += 1;
      teamStats[awayKey].details.push(`${roundNum} ${homeDisplay} vs ${awayDisplay} ${scoreStr} 追平+1分`);
    } else if (awayWin) {
      teamStats[awayKey].recoveredWins++;
      teamStats[awayKey].totalRecovered += 3;
      teamStats[awayKey].details.push(`${roundNum} ${homeDisplay} vs ${awayDisplay} ${scoreStr} 逆转+3分`);
    } else {
      teamStats[awayKey].lostFromBehind++;
    }
  }
  return true;
}

// 扫描所有轮次
const rounds = fs.readdirSync(leagueDir)
  .filter(d => d.startsWith('round-') && fs.statSync(path.join(leagueDir, d)).isDirectory())
  .sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]));

let totalMatchesProcessed = 0;

for (const round of rounds) {
  const roundDir = path.join(leagueDir, round);
  const matches = fs.readdirSync(roundDir).filter(d =>
    fs.statSync(path.join(roundDir, d)).isDirectory()
  );

  for (const match of matches) {
    const eventsPath = path.join(roundDir, match, 'matchEvents.json');
    if (!fs.existsSync(eventsPath)) continue;

    try {
      const data = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
      if (analyzeMatch(data, round)) {
        totalMatchesProcessed++;
      }
    } catch (e) {
      console.error(`解析失败: ${eventsPath} - ${e.message}`);
    }
  }
}

// 排行榜输出
const ranking = Object.entries(teamStats)
  .map(([, stats]) => ({ name: stats.displayName, ...stats }))
  .sort((a, b) => {
    if (b.totalRecovered !== a.totalRecovered) return b.totalRecovered - a.totalRecovered;
    if (b.recoveredWins !== a.recoveredWins) return b.recoveredWins - a.recoveredWins;
    return b.recoveredDraws - a.recoveredDraws;
  });

const leagueLabel = leagueSlug.toUpperCase();
console.log('====================================');
console.log(`  ${leagueLabel} ${season} 落后抢回分数排行榜`);
if (rounds.length > 0) {
  console.log(`  数据范围: ${rounds[0]} ~ ${rounds[rounds.length - 1]}（已采集且完赛 ${totalMatchesProcessed}场）`);
} else {
  console.log('  未找到 round-* 比赛数据目录');
}
console.log('====================================\n');

console.log('排名 | 球队 | 抢回分 | 落后场次 | 追平(+1) | 逆转(+3) | 未抢回');
console.log('-----|------|--------|----------|----------|----------|------');

for (let i = 0; i < ranking.length; i++) {
  const t = ranking[i];
  const rank = String(i + 1).padStart(2);
  const name = t.name.padEnd(8);
  const recovered = String(t.totalRecovered).padStart(3);
  const behind = String(t.behindCount).padStart(4);
  const draws = String(t.recoveredDraws).padStart(4);
  const wins = String(t.recoveredWins).padStart(4);
  const lost = String(t.lostFromBehind).padStart(4);
  console.log(`${rank}   | ${name} | ${recovered}分  | ${behind}场    | ${draws}次    | ${wins}次    | ${lost}场`);
}

console.log('\n====================================');
console.log('  各队落后抢回明细');
console.log('====================================\n');

for (const t of ranking) {
  if (t.details.length === 0) continue;
  console.log(`【${t.name}】 共抢回${t.totalRecovered}分（${t.recoveredWins}次逆转 + ${t.recoveredDraws}次追平）`);
  for (const d of t.details) {
    console.log(`  ${d}`);
  }
  console.log('');
}
