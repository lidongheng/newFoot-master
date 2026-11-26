/**
 * 自定义轮次积分榜（原 backend-server/crawlerCustomRank.js）。
 * config/squadTarget.js 必填：leagueSlug、leagueSerial、season（与本地赛程一致，支持全写或短名）。
 * 可选参数 --rounds 1-26、--rounds 26；不传则统计全部已完赛轮次。
 * 不读取 teamSerial、isNation；仅支持联赛 R_*，杯赛请勿套用联赛轮次或分档。
 * 数据读取对应模块 data/ 已登记赛程，不回退旧 match_center；结果输出到终端。
 * 工作目录：cup-analyzer/crawler-server；命令：node processors/customRoundStandings.js。
 * 可选 --config ../{赛事}/teamAgent/{球队}/config.js，与 --rounds 配合使用。
 */
const { readLeagueSchedule, parseScore } = require('../utils/squadLeagueSchedule');

const { resolveProcessorTarget } = require('../utils/processorTarget');
const { target: config, args } = resolveProcessorTarget(process.argv.slice(2), require('../config/squadTarget'));
const LEAGUE_SERIAL = config.leagueSerial;
const LEAGUE_SLUG = config.leagueSlug;
const SEASON = config.season;

// match 数组索引
const IDX = {
  MATCH_ID: 0,
  STATE_CODE: 2,
  HOME_TEAM: 4,
  AWAY_TEAM: 5,
  FULL_SCORE: 6,
};

// ============ 工具函数 ============

function parseMatchCenterFile() {
  return readLeagueSchedule(config);
}

function buildTeamMap(arrTeam) {
  const map = {};
  for (const t of arrTeam) {
    map[t[0]] = { chineseName: t[1], englishName: t[3] };
  }
  return map;
}



function parseRoundsArg(args) {
  if (args.length === 0) return null;
  if (args.length !== 2 || args[0] !== '--rounds' || !/^[1-9]\d*(?:-[1-9]\d*)?$/.test(args[1])) {
    throw new Error('参数格式：--rounds 1-26 或 --rounds 26（正整数轮次）。');
  }
  const parts = args[1].split('-').map(Number);
  const start = parts[0];
  let end = start;
  if (parts.length === 2) end = parts[1];
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end) {
    throw new Error('--rounds 范围无效。');
  }
  return { start, end };
}

function getDisplayWidth(str) {
  let width = 0;
  for (const ch of String(str)) {
    width += (ch.charCodeAt(0) > 0x7F) ? 2 : 1;
  }
  return width;
}

function padRight(str, w) {
  return String(str) + ' '.repeat(Math.max(0, w - getDisplayWidth(String(str))));
}

function padLeft(str, w) {
  return ' '.repeat(Math.max(0, w - getDisplayWidth(String(str)))) + String(str);
}

// ============ 主逻辑 ============

function main() {
  const matchCenter = parseMatchCenterFile(LEAGUE_SERIAL);
  const teamMap = buildTeamMap(matchCenter.arrTeam);
  const leagueName = matchCenter.arrLeague[1];
  const roundsRange = parseRoundsArg(args);

  // 确定轮次范围
  const allRoundNums = Object.keys(matchCenter.rounds)
    .map(k => parseInt(k.replace('R_', '')))
    .sort((a, b) => a - b);

  let targetRounds;
  if (roundsRange) {
    targetRounds = allRoundNums.filter(n => n >= roundsRange.start && n <= roundsRange.end);
  } else {
    targetRounds = allRoundNums;
  }

  let rangeLabel = '全部已有轮次';
  if (roundsRange) {
    rangeLabel = `第 ${roundsRange.start} 轮`;
    if (roundsRange.start !== roundsRange.end) rangeLabel = `第 ${roundsRange.start} ~ ${roundsRange.end} 轮`;
  }

  console.log('═'.repeat(80));
  console.log(`  ${leagueName}  ${SEASON} 赛季  自定义积分榜`);
  console.log(`  统计范围: ${rangeLabel}`);
  console.log('═'.repeat(80));

  // 统计每支球队数据
  // { teamId: { w, d, l, gf, ga, pts, homeW, homeD, homeL, awayW, awayD, awayL } }
  const stats = {};

  function initTeam(teamId) {
    if (!stats[teamId]) {
      stats[teamId] = {
        w: 0, d: 0, l: 0, gf: 0, ga: 0,
        homeW: 0, homeD: 0, homeL: 0,
        awayW: 0, awayD: 0, awayL: 0,
      };
    }
  }

  let matchCount = 0;
  let skippedCount = 0;

  for (const roundNum of targetRounds) {
    const roundKey = `R_${roundNum}`;
    const matches = matchCenter.rounds[roundKey];
    if (!matches) continue;

    for (const m of matches) {
      if (m[IDX.STATE_CODE] !== -1) { skippedCount++; continue; }
      const score = parseScore(m[IDX.FULL_SCORE]);
      if (!score) { skippedCount++; continue; }

      const homeId = m[IDX.HOME_TEAM];
      const awayId = m[IDX.AWAY_TEAM];
      initTeam(homeId);
      initTeam(awayId);

      stats[homeId].gf += score.home;
      stats[homeId].ga += score.away;
      stats[awayId].gf += score.away;
      stats[awayId].ga += score.home;

      if (score.home > score.away) {
        stats[homeId].w++;
        stats[homeId].homeW++;
        stats[awayId].l++;
        stats[awayId].awayL++;
      } else if (score.home < score.away) {
        stats[homeId].l++;
        stats[homeId].homeL++;
        stats[awayId].w++;
        stats[awayId].awayW++;
      } else {
        stats[homeId].d++;
        stats[homeId].homeD++;
        stats[awayId].d++;
        stats[awayId].awayD++;
      }

      matchCount++;
    }
  }

  if (matchCount === 0) {
    console.log('\n  该轮次范围内没有已完赛的比赛。');
    return;
  }

  // 构建排行榜
  const table = Object.entries(stats).map(([teamId, s]) => {
    const played = s.w + s.d + s.l;
    const pts = s.w * 3 + s.d;
    const gd = s.gf - s.ga;
    const name = teamMap[teamId].chineseName;
    return { teamId, name, played, ...s, pts, gd };
  });

  // 排序: 积分 > 净胜球 > 进球数
  table.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });

  // 输出
  console.log(`\n  已完赛: ${matchCount} 场  未完赛/跳过: ${skippedCount} 场  球队: ${table.length} 支\n`);

  const cols = [
    { h: '#',  k: '_rank', w: 3,  r: true },
    { h: '球队', k: 'name', w: 14, r: false },
    { h: '场', k: 'played', w: 3, r: true },
    { h: '胜', k: 'w',  w: 3, r: true },
    { h: '平', k: 'd',  w: 3, r: true },
    { h: '负', k: 'l',  w: 3, r: true },
    { h: '进球', k: 'gf', w: 4, r: true },
    { h: '失球', k: 'ga', w: 4, r: true },
    { h: '净胜', k: 'gd', w: 4, r: true, fmt: v => (v > 0 ? `+${v}` : String(v)) },
    { h: '积分', k: 'pts', w: 4, r: true },
    { h: '主场',  k: '_home', w: 9, r: false, fmt: (_, row) => `${row.homeW}胜${row.homeD}平${row.homeL}负` },
    { h: '客场',  k: '_away', w: 9, r: false, fmt: (_, row) => `${row.awayW}胜${row.awayD}平${row.awayL}负` },
  ];

  // 表头
  const header = cols.map(c => padRight(c.h, c.w)).join('  ');
  console.log(`  ${header}`);
  console.log(`  ${cols.map(c => '─'.repeat(c.w)).join('  ')}`);

  // 数据行
  table.forEach((row, idx) => {
    row._rank = idx + 1;
    const line = cols.map(c => {
      let val;
      if (c.fmt) {
        val = c.fmt(row[c.k], row);
      } else {
        val = String(row[c.k]);
      }
      return c.r ? padLeft(val, c.w) : padRight(val, c.w);
    }).join('  ');
    console.log(`  ${line}`);
  });

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`  排序规则: 积分 > 净胜球 > 进球数`);
  console.log('═'.repeat(80));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { main, parseRoundsArg };
