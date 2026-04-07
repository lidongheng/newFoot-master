const fs = require('fs');
const path = require('path');
const vm = require('vm');
const config = require('./config/wudaconfig');

/**
 * crawlerClub5.js
 * 分析联赛中各球队在落后情况下抢回的分数排行榜
 *
 * "落后抢回"定义：球队在比赛中曾经比分落后（对手进球后），
 * 但最终以平局（抢回1分）或胜利（抢回3分）结束比赛。
 *
 * 从 wudaconfig.js 读取 leagueSlug, leagueSerial, season，
 * 扫描 basicData/{leagueSlug}/{season} 下所有轮次的 matchEvents.json
 * 使用 match_center 中的 teamId 作为球队唯一标识，避免中文队名不唯一的问题
 */

const BASE_DIR = path.join(__dirname, 'basicData');
const { leagueSlug, leagueSerial, season } = config;
const leagueDir = path.join(BASE_DIR, leagueSlug, season);

// ============ match_center 解析（用于获取 teamId） ============

function parseMatchCenterFile(serial) {
  const filePath = path.join(__dirname, 'match_center', `s${serial}.js`);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  const sandbox = { jh: {} };
  vm.createContext(sandbox);
  try {
    vm.runInContext(content, sandbox);
  } catch {
    return null;
  }
  return { arrTeam: sandbox.arrTeam, rounds: sandbox.jh };
}

function buildTeamIdMap(arrTeam) {
  const map = {};
  if (!Array.isArray(arrTeam)) return map;
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

const matchCenter = parseMatchCenterFile(leagueSerial);
const teamIdMap = matchCenter ? buildTeamIdMap(matchCenter.arrTeam) : {};
const matchIdMap = matchCenter ? buildMatchIdMap(matchCenter.rounds) : {};
const useTeamId = matchCenter !== null;

if (!fs.existsSync(leagueDir)) {
  console.error(`联赛目录不存在: ${leagueDir}`);
  process.exit(1);
}

const teamStats = {};

function resolveTeamKeys(matchId, homeCnName, awayCnName) {
  if (useTeamId && matchId && matchIdMap[matchId]) {
    const { homeTeamId, awayTeamId } = matchIdMap[matchId];
    const homeInfo = teamIdMap[homeTeamId];
    const awayInfo = teamIdMap[awayTeamId];
    return {
      homeKey: String(homeTeamId),
      awayKey: String(awayTeamId),
      homeDisplay: homeInfo ? homeInfo.chineseName : homeCnName,
      awayDisplay: awayInfo ? awayInfo.chineseName : awayCnName,
    };
  }
  return {
    homeKey: homeCnName,
    awayKey: awayCnName,
    homeDisplay: homeCnName,
    awayDisplay: awayCnName,
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
  const { homeName, awayName, events, matchId } = eventsData;
  if (!events || !Array.isArray(events)) return;

  const { homeKey, awayKey, homeDisplay, awayDisplay } =
    resolveTeamKeys(matchId, homeName, awayName);

  ensureTeam(homeKey, homeDisplay);
  ensureTeam(awayKey, awayDisplay);
  teamStats[homeKey].totalMatches++;
  teamStats[awayKey].totalMatches++;

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

  if (!finalScore) return;

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
      analyzeMatch(data, round);
      totalMatchesProcessed++;
    } catch (e) {
      console.error(`解析失败: ${eventsPath} - ${e.message}`);
    }
  }
}

// 排行榜输出
const ranking = Object.entries(teamStats)
  .map(([key, stats]) => ({ name: stats.displayName || key, ...stats }))
  .sort((a, b) => {
    if (b.totalRecovered !== a.totalRecovered) return b.totalRecovered - a.totalRecovered;
    if (b.recoveredWins !== a.recoveredWins) return b.recoveredWins - a.recoveredWins;
    return b.recoveredDraws - a.recoveredDraws;
  });

const leagueLabel = leagueSlug.toUpperCase();
console.log('====================================');
console.log(`  ${leagueLabel} ${season} 落后抢回分数排行榜`);
console.log(`  数据范围: ${rounds[0]} ~ ${rounds[rounds.length - 1]} (${totalMatchesProcessed}场)`);
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
