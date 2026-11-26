/**
 * 球探分析页统计（原 backend-server/crawlerStatistics.js）：交锋、主客队近况、未来赛程、伤病。
 * 默认 config/squadTarget.js 所需字段：matchSerial（球探比赛 ID）；--config 模式另核验球队和轮次。
 * 复用已迁移的 matchStatisticsAnalyzer，交锋/近况各输出最多 10 场、未来赛程各最多 5 场。
 * 需要联网；页面伤病信息仅代表数据源记录，不替代已核验的球队伤停名单。
 * 工作目录：cup-analyzer/crawler-server；命令：node processors/matchStatisticsProcessor.js。
 * 可用 --matchSerial <ID> 或 --match <ID> 显式指定比赛；结果输出到终端。
 * --config ../{赛事}/teamAgent/{球队}/config.js：读取球队 matchSerial、roundSerial，
 * 核验本轮本队比赛且状态未开打；球队配置的身份字段用于核验赛事、赛季、球队。
 */
const squadTarget = require('../config/squadTarget');
const { fetchMatchStatistics } = require('../analyzers/matchStatisticsAnalyzer');
const { resolveProcessorTarget, validateUpcomingMatch } = require('../utils/processorTarget');

function formatStatistics(data) {
  const lines = [];
  function matches(title, rows) {
    lines.push(title);
    for (const row of rows.slice(0, 10)) {
      lines.push(`${row.date} ${row.league} ${row.homeTeam} ${row.score} ${row.awayTeam} ${row.handicapDisplay} ${row.totalDisplay}`.trim());
    }
    lines.push('');
  }
  matches('对赛往绩（盘路按本场主队视角）', data.headToHead);
  matches(`主队近期战绩（${data.pageHomeTeam}，盘路按该队视角）`, data.homeTeamMatches);
  matches(`客队近期战绩（${data.pageAwayTeam}，盘路按该队视角）`, data.awayTeamMatches);
  lines.push('未来比赛');
  for (const [side, name] of [['home', data.pageHomeTeam], ['away', data.pageAwayTeam]]) {
    lines.push(name);
    for (const row of data.futureMatches[side].slice(0, 5)) {
      lines.push(`${row.dateLine} ${row.league} ${row.teams} ${row.interval}`);
    }
  }
  lines.push('', '伤病信息');
  for (const [side, name] of [['home', data.pageHomeTeam], ['away', data.pageAwayTeam]]) {
    lines.push(name);
    for (const row of data.injuries[side]) {
      lines.push(`${row.player} | ${row.reason}`);
    }
  }
  return lines.join('\n');
}

async function main(args, target = squadTarget, fetcher = fetchMatchStatistics) {
  const resolved = resolveProcessorTarget(args, target);
  target = resolved.target;
  args = resolved.args;
  let matchSerial = target.matchSerial;
  if (args.length > 0) {
    if (args.length !== 2 || !['--match', '--matchSerial'].includes(args[0])) {
      throw new Error('参数格式：--matchSerial <比赛ID> 或 --match <比赛ID>');
    }
    matchSerial = args[1];
  }
  if (!/^\d+$/.test(String(matchSerial))) {
    throw new Error('请在 squadTarget.js 设置 matchSerial，或通过命令行明确指定比赛 ID。');
  }
  if (resolved.schedule) {
    validateUpcomingMatch(resolved.schedule, target, matchSerial);
  }
  const data = await fetcher(String(matchSerial));
  console.log(formatStatistics(data));
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { main, formatStatistics };
