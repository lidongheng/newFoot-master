/**
 * 球探单场分析页（与 generate:cycle-report 同源）：拉取并输出交锋、近况、未来赛程、伤病。
 *
 * 数据来源：https://zq.titan007.com/analysis/{matchSerial}cn.htm
 * 解析：analyzers/matchStatisticsAnalyzer.js（fetchMatchStatistics）
 *
 * 亚盘显示（handicapDisplay）约定（与 backend-server/crawlerStatistics.js 一致）：
 * - 对赛往绩、主队近期：按「页面主队」在当场让球下的输赢走（页面主队即本场主队）。
 * - 客队近期：按「页面客队」在当场让球下的输赢走。
 * 结构化字段里的 handicapResult（halfWin 等）供 cycle 图等使用，本脚本以 handicapDisplay 文本为准。
 */

const fs = require('fs');
const path = require('path');

const squadTarget = require('../config/squadTarget');
const { fetchMatchStatistics, MAX_MATCHES } = require('../analyzers/matchStatisticsAnalyzer');

function parseArgs(argv) {
  const out = { match: null, json: false, limit: null, outPath: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--match' && argv[i + 1]) {
      out.match = argv[i + 1];
      i += 1;
    } else if (a === '--json') {
      out.json = true;
    } else if (a === '--limit' && argv[i + 1]) {
      out.limit = parseInt(argv[i + 1], 10);
      i += 1;
    } else if (a === '--out' && argv[i + 1]) {
      out.outPath = argv[i + 1];
      i += 1;
    }
  }
  return out;
}

function applyLimit(data, limit) {
  const L = {
    headToHead: (data.headToHead || []).slice(0, limit),
    homeTeamMatches: (data.homeTeamMatches || []).slice(0, limit),
    awayTeamMatches: (data.awayTeamMatches || []).slice(0, limit),
    futureMatches: data.futureMatches
      ? {
          teamName: data.futureMatches.teamName,
          awayTeamName: data.futureMatches.awayTeamName,
          home: (data.futureMatches.home || []).slice(0, limit),
          away: (data.futureMatches.away || []).slice(0, limit),
        }
      : { home: [], away: [] },
    injuries: data.injuries || { home: [], away: [] },
  };
  return L;
}

function matchLine(m) {
  const hc = m.handicapDisplay != null ? String(m.handicapDisplay) : '';
  const ou = m.totalDisplay != null ? String(m.totalDisplay) : '';
  return `${m.date} ${m.league} ${m.homeTeam} ${m.score} ${m.awayTeam} ${hc} ${ou}`.trim();
}

function formatMarkdown(data, limit) {
  const d = applyLimit(data, limit);
  const lines = [];

  lines.push(`> matchSerial：${data.matchSerial || ''} ｜ ${data.pageHomeTeam} vs ${data.pageAwayTeam}`);
  lines.push('');

  lines.push('## 对赛往绩');
  if (!d.headToHead.length) lines.push('（无）');
  else d.headToHead.forEach((m) => lines.push(matchLine(m)));
  lines.push('');

  lines.push(`## 主队近期战绩（${data.pageHomeTeam}）`);
  if (!d.homeTeamMatches.length) lines.push('（无）');
  else d.homeTeamMatches.forEach((m) => lines.push(matchLine(m)));
  lines.push('');

  lines.push(`## 客队近期战绩（${data.pageAwayTeam}）`);
  if (!d.awayTeamMatches.length) lines.push('（无）');
  else d.awayTeamMatches.forEach((m) => lines.push(matchLine(m)));
  lines.push('');

  lines.push('## 未来赛程');
  lines.push(`### ${d.futureMatches.teamName || data.pageHomeTeam}`);
  if (!(d.futureMatches.home || []).length) lines.push('（无）');
  else {
    d.futureMatches.home.forEach((r) => {
      lines.push(`${r.dateLine} ${r.league} ${r.teams} ${r.interval}`);
    });
  }
  lines.push('');
  lines.push(`### ${d.futureMatches.awayTeamName || data.pageAwayTeam}`);
  if (!(d.futureMatches.away || []).length) lines.push('（无）');
  else {
    d.futureMatches.away.forEach((r) => {
      lines.push(`${r.dateLine} ${r.league} ${r.teams} ${r.interval}`);
    });
  }
  lines.push('');

  lines.push('## 伤病信息');
  const inj = d.injuries;
  lines.push(`### ${inj.homeTeamName || data.pageHomeTeam}`);
  if (!(inj.home || []).length) lines.push('（无）');
  else inj.home.forEach((x) => lines.push(`${x.player} | ${x.reason}`));
  lines.push('');
  lines.push(`### ${inj.awayTeamName || data.pageAwayTeam}`);
  if (!(inj.away || []).length) lines.push('（无）');
  else inj.away.forEach((x) => lines.push(`${x.player} | ${x.reason}`));

  return `${lines.join('\n')}\n`;
}

async function main() {
  const argv = parseArgs(process.argv.slice(2));
  const matchSerial = argv.match || squadTarget.matchSerial;
  if (!matchSerial) {
    console.error('请在 config/squadTarget.js 中设置 matchSerial，或使用 --match <序号>');
    process.exit(1);
  }

  const limit =
    Number.isFinite(argv.limit) && argv.limit > 0 ? Math.min(argv.limit, MAX_MATCHES) : MAX_MATCHES;

  const raw = await fetchMatchStatistics(String(matchSerial));
  const data = { ...raw, matchSerial: String(matchSerial) };

  if (argv.json) {
    const limited = applyLimit(data, limit);
    const payload = {
      matchSerial: data.matchSerial,
      pageHomeTeam: data.pageHomeTeam,
      pageAwayTeam: data.pageAwayTeam,
      pageHomeTeamId: data.pageHomeTeamId,
      pageAwayTeamId: data.pageAwayTeamId,
      headToHead: limited.headToHead,
      homeTeamMatches: limited.homeTeamMatches,
      awayTeamMatches: limited.awayTeamMatches,
      futureMatches: limited.futureMatches,
      injuries: limited.injuries,
    };
    const text = `${JSON.stringify(payload, null, 2)}\n`;
    if (argv.outPath) {
      fs.writeFileSync(path.resolve(argv.outPath), text, 'utf-8');
      console.error(`已写入：${path.resolve(argv.outPath)}`);
    } else {
      process.stdout.write(text);
    }
    return;
  }

  const md = formatMarkdown(data, limit);
  if (argv.outPath) {
    const p = path.resolve(argv.outPath);
    fs.writeFileSync(p, md, 'utf-8');
    console.error(`已写入：${p}`);
  } else {
    process.stdout.write(md);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
