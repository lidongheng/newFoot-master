const fs = require('fs');
const path = require('path');
const vm = require('vm');
const config = require('../config');

function buildRanking({ arrTeam, arrData }) {
  if (!Array.isArray(arrTeam) || !Array.isArray(arrData)) {
    throw new Error('进球时间数据必须包含 arrTeam 和 arrData 数组');
  }
  const teamNames = new Map();
  for (const team of arrTeam) {
    if (!Array.isArray(team) || !Number.isInteger(team[0]) || team[0] <= 0 ||
        typeof team[1] !== 'string' || team[1].trim() === '') {
      throw new Error('arrTeam 中的球队序号或中文名称无效');
    }
    teamNames.set(team[0], team[1]);
  }

  const ranking = arrData.map((row, index) => {
    if (!Array.isArray(row) || row.length !== 19 || !teamNames.has(row[0])) {
      throw new Error(`arrData 第 ${index + 1} 行无效或找不到对应球队`);
    }
    // 球队序号后是 18 个五分钟时段，前 9 项为上半场，后 9 项为下半场。
    const periods = row.slice(1);
    if (periods.some((value) => !Number.isInteger(value) || value < 0)) {
      throw new Error(`球队 ${row[0]} 的各时段进球数必须为非负整数`);
    }
    const goals = periods.slice(-3);
    return {
      teamSerial: row[0],
      teamName: teamNames.get(row[0]),
      first15Minutes: periods.slice(0, 3).reduce((sum, value) => sum + value, 0),
      firstHalf: periods.slice(0, 9).reduce((sum, value) => sum + value, 0),
      secondHalf: periods.slice(9).reduce((sum, value) => sum + value, 0),
      total: goals[0] + goals[1] + goals[2],
    };
  });
  // 稳定排序使总数相同的球队保留 arrData 中的顺序。
  ranking.sort((a, b) => b.total - a.total);
  return ranking.map((team, index) => ({
    '顺序号': index + 1,
    '球队序号': team.teamSerial,
    '球队名': team.teamName,
    '前15分钟进球数': team.first15Minutes,
    '上半场进球数': team.firstHalf,
    '下半场进球数': team.secondHalf,
    '75分钟后总进球数': team.total,
  }));
}

/** 在 crawler-server 下设置 CUP_ANALYZER_CUP 后运行本脚本。 */
function printRanking(leagueSlug) {
  const league = config.cups[leagueSlug];
  if (!league || league.type !== 'league') {
    throw new Error('请通过 CUP_ANALYZER_CUP 指定已配置的联赛');
  }
  const dataPath = path.join(league.paths.cupAnalyzer, 'data', `td${league.cupSerial}.js`);
  if (!fs.existsSync(dataPath)) {
    console.log('暂无进球时间数据');
    return;
  }
  const context = {};
  vm.runInNewContext(fs.readFileSync(dataPath, 'utf8'), context, { filename: dataPath, timeout: 1000 });
  const ranking = buildRanking(context);
  console.log(`${league.chineseName} 75分钟后进球数排行榜（从大到小）`);
  console.table(ranking);
  return ranking;
}

if (require.main === module) {
  try {
    printRanking(process.env.CUP_ANALYZER_CUP);
  } catch (error) {
    console.error('[75分钟后进球排行榜]', error.message);
    process.exitCode = 1;
  }
}

module.exports = { buildRanking, printRanking };
