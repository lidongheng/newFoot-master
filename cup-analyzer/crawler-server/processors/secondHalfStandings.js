/**
 * 下半场积分榜（原 backend-server/crawlerClub6.js），并与赛程提供的全场积分榜比较。
 * config/squadTarget.js 必填：leagueSlug（已登记联赛目录）、leagueSerial（对应球探序号）、
 * season（与赛程元数据一致，支持全写或短名）。不读取 teamSerial、roundSerial、isNation。
 * 读取该联赛 data/ 下已登记的 s 开头赛程，不回退旧 match_center；仅处理联赛 R_*。
 * 全场比分减半场比分得到下半场比分，缺少比分的场次跳过；不将当前轮次当成已完成轮数。
 * 工作目录：cup-analyzer/crawler-server；命令：node processors/secondHalfStandings.js。
 * 结果输出到终端；杯赛没有本脚本所需的联赛轮次/全场积分榜口径。
 * 可选 --config ../{赛事}/teamAgent/{球队}/config.js，改读该球队配置。
 */
const { resolveProcessorTarget } = require('../utils/processorTarget');
const { target: config, args } = resolveProcessorTarget(process.argv.slice(2), require('../config/squadTarget'));
const { readLeagueSchedule, parseScore } = require('../utils/squadLeagueSchedule');

function main() {
if (args.length > 0) throw new Error('本脚本仅支持可选参数 --config <球队配置路径>。');
const sandbox = readLeagueSchedule(config);
const { jh, arrTeam } = sandbox;

const teamMap = {};
for (const t of arrTeam) {
  teamMap[t[0]] = t[1];
}

const stats = {};

function ensureTeam(id) {
  if (!stats[id]) {
    if (!teamMap[id]) throw new Error(`赛程缺少球队 ${id} 的名称。`);
    stats[id] = { id, name: teamMap[id], played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0 };
  }
}

let validMatches = 0;

for (const roundKey of Object.keys(jh)) {
  const matches = jh[roundKey];
  if (!Array.isArray(matches)) continue;

  for (const m of matches) {
    const status = m[2];
    if (status !== -1) continue;

    const homeId = m[4];
    const awayId = m[5];
    const fullScore = parseScore(m[6]);
    const halfScore = parseScore(m[7]);

    if (!fullScore || !halfScore) continue;

    const h2Home = fullScore.home - halfScore.home;
    const h2Away = fullScore.away - halfScore.away;

    if (h2Home < 0 || h2Away < 0) throw new Error(`比赛 ${m[0]} 的全场比分小于半场比分。`);
    validMatches++;
    ensureTeam(homeId);
    ensureTeam(awayId);

    stats[homeId].played++;
    stats[awayId].played++;
    stats[homeId].gf += h2Home;
    stats[homeId].ga += h2Away;
    stats[awayId].gf += h2Away;
    stats[awayId].ga += h2Home;

    if (h2Home > h2Away) {
      stats[homeId].win++;
      stats[awayId].loss++;
    } else if (h2Home < h2Away) {
      stats[awayId].win++;
      stats[homeId].loss++;
    } else {
      stats[homeId].draw++;
      stats[awayId].draw++;
    }
  }
}

const ranking = Object.values(stats)
  .map(t => ({
    ...t,
    pts: t.win * 3 + t.draw,
    gd: t.gf - t.ga,
  }))
  .sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.name.localeCompare(b.name, 'zh-CN');
  });

const leagueName = sandbox.arrLeague[1];
const seasonStr = sandbox.season;

console.log('====================================');
console.log(`  ${leagueName} ${seasonStr}`);
console.log(`  下半场积分榜（有效完赛样本 ${validMatches} 场）`);
console.log('====================================\n');

console.log('排名 | 球队           | 场 | 胜 | 平 | 负 | 进 | 失 | 净胜 | 积分');
console.log('-----|----------------|----|----|----|----|----|----|------|-----');

for (let i = 0; i < ranking.length; i++) {
  const t = ranking[i];
  const rank = String(i + 1).padStart(2);
  const name = t.name.padEnd(10);
  const played = String(t.played).padStart(2);
  const w = String(t.win).padStart(2);
  const d = String(t.draw).padStart(2);
  const l = String(t.loss).padStart(2);
  const gf = String(t.gf).padStart(2);
  const ga = String(t.ga).padStart(2);
  const gd = (t.gd >= 0 ? '+' : '') + t.gd;
  const gdStr = gd.padStart(4);
  const pts = String(t.pts).padStart(3);
  console.log(`${rank}   | ${name} | ${played} | ${w} | ${d} | ${l} | ${gf} | ${ga} | ${gdStr} | ${pts}`);
}

// 与全场积分榜对比（totalScore: [flag, rank, teamId, ?, played, W, D, L, GF, GA, GD, ..., pts(16)] ）
console.log('\n====================================');
console.log('  下半场 vs 全场 排名对比');
console.log('====================================\n');

if (!Array.isArray(sandbox.totalScore)) {
  console.log('赛程未提供全场积分榜，无法进行排名对比。');
  return;
}
const fullStatsMap = {};
for (let i = 0; i < sandbox.totalScore.length; i++) {
  const row = sandbox.totalScore[i];
  fullStatsMap[row[2]] = {
    rank: i + 1,
    played: row[4], win: row[5], draw: row[6], loss: row[7],
    gf: row[8], ga: row[9], gd: row[10], pts: row[16],
  };
}

const pad = (v, w) => String(v).padStart(w);
const gdFmt = (v) => ((v >= 0 ? '+' : '') + v).padStart(4);

console.log('排名 | 球队           | 下半场                              | 全场                                | 变化');
console.log('     |                | 胜  平  负  进  失  净胜  积分      | 胜  平  负  进  失  净胜  积分      |');
console.log('-----|----------------|-------------------------------------|-------------------------------------|-----');

for (let i = 0; i < ranking.length; i++) {
  const t = ranking[i];
  const h2Rank = i + 1;
  const teamId = t.id;
  const f = fullStatsMap[teamId];

  let change = '?';
  if (f) {
    const diff = f.rank - h2Rank;
    if (diff > 0) change = `↑${diff}`;
    else if (diff < 0) change = `↓${Math.abs(diff)}`;
    else change = '—';
  }

  const name = t.name.padEnd(10);
  const h2Line = `${pad(t.win,2)} ${pad(t.draw,2)} ${pad(t.loss,2)} ${pad(t.gf,2)} ${pad(t.ga,2)} ${gdFmt(t.gd)} ${pad(t.pts,3)}`;
  const fLine = f
    ? `${pad(f.win,2)} ${pad(f.draw,2)} ${pad(f.loss,2)} ${pad(f.gf,2)} ${pad(f.ga,2)} ${gdFmt(f.gd)} ${pad(f.pts,3)}`
    : '  ?   ?   ?   ?   ?    ?    ?';
  const fullRankStr = f ? pad(f.rank, 2) : ' ?';

  console.log(`${pad(h2Rank,2)}/${fullRankStr} | ${name} | ${h2Line}       | ${fLine}       | ${change}`);
}

}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { main };
