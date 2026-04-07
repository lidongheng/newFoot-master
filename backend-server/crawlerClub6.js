const fs = require('fs');
const path = require('path');
const vm = require('vm');
const config = require('./config/wudaconfig');

/**
 * crawlerClub6.js
 * 生成联赛下半场积分榜
 *
 * 从 match_center/s{leagueSerial}.js 读取比赛数据，
 * 用全场比分减去半场比分得到下半场比分，
 * 按下半场结果（胜3分/平1分/负0分）排出积分榜。
 */

const { leagueSerial } = config;
const dataFile = path.join(__dirname, 'match_center', `s${leagueSerial}.js`);

if (!fs.existsSync(dataFile)) {
  console.error(`数据文件不存在: ${dataFile}`);
  process.exit(1);
}

const jsContent = fs.readFileSync(dataFile, 'utf-8');

const sandbox = { jh: {}, arrTeam: [], arrLeague: [], totalScore: [], homeScore: [], guestScore: [], halfScore: [], homeHalfScore: [], guestHalfScore: [], scoreColor: [], scoreCountType: 0, lastUpdateTime: '', isConference: false };
vm.createContext(sandbox);
vm.runInContext(jsContent, sandbox);

const { jh, arrTeam } = sandbox;

const teamMap = {};
for (const t of arrTeam) {
  teamMap[t[0]] = t[1];
}

const stats = {};

function ensureTeam(id) {
  if (!stats[id]) {
    stats[id] = { name: teamMap[id] || `ID:${id}`, played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0 };
  }
}

function parseScore(str) {
  if (!str || str === '') return null;
  const parts = str.split('-');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const a = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(a)) return null;
  return { home: h, away: a };
}

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

const leagueName = sandbox.arrLeague[1] || 'Unknown League';
const seasonStr = sandbox.arrLeague[4] || '';
const totalRounds = sandbox.arrLeague[8] || '?';

console.log('====================================');
console.log(`  ${leagueName} ${seasonStr}`);
console.log(`  下半场积分榜（已完成${totalRounds}轮）`);
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
  const teamId = parseInt(Object.keys(stats).find(id => stats[id].name === t.name));
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
