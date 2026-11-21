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
    if (!Array.isArray(row) || row.length < 4 || !teamNames.has(row[0])) {
      throw new Error(`arrData 第 ${index + 1} 行无效或找不到对应球队`);
    }
    // 文件的末三项依次是 76–80、81–85、86–90 分钟进球数。
    const goals = row.slice(-3);
    if (goals.some((value) => !Number.isInteger(value) || value < 0)) {
      throw new Error(`球队 ${row[0]} 的末三个时段进球数必须为非负整数`);
    }
    return {
      teamSerial: row[0],
      teamName: teamNames.get(row[0]),
      goals76To80: goals[0],
      goals81To85: goals[1],
      goals86To90: goals[2],
      total: goals[0] + goals[1] + goals[2],
    };
  });
  // 稳定排序使总数相同的球队保留 arrData 中的顺序。
  ranking.sort((a, b) => b.total - a.total);
  return ranking.map((team, index) => ({
    '顺序号': index + 1,
    '球队序号': team.teamSerial,
    '球队名': team.teamName,
    '76-80分钟': team.goals76To80,
    '81-85分钟': team.goals81To85,
    '86-90分钟': team.goals86To90,
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
