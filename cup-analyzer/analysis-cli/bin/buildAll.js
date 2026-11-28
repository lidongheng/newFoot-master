/** 从各联赛本地赛程读取实际赛季，只生成本次新增指标，不联网。 */
const fs = require('fs');
const path = require('path');
const { cups } = require('../../crawler-server/config');
const { scheduleSeason } = require('../../crawler-server/utils/teamProfileData');
const { main } = require('./cli');

const metrics = 'standings,firstHalfStandings,secondHalfStandings,homeStandings,awayStandings,averageAge,averageHeight,totalMarketValue,averagePossession,averageXg,averageShots,shotsAgainst,averageShotsAgainst,zeroShotsOnTarget,comebackPoints,pointsDropped,shotConversionRate,shotOnTargetConversionRate';

function buildAll() {
  const results = [];
  for (const [league, definition] of Object.entries(cups)) {
    if (definition.type !== 'league') continue;
    try {
      const season = scheduleSeason(definition.paths.cupScheduleData);
      const result = main(['build', '--league', league, '--season', season, '--metrics', metrics]);
      results.push({ league, season, status: 'generated', ...result });
    } catch (error) {
      results.push({ league, status: 'blocked', file: definition.paths.cupScheduleData, reason: error.message });
    }
  }
  const root = path.join(__dirname, '../output');
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, 'build-summary.json'), JSON.stringify(results.map(({ reason, reminder, ...result }) => result), null, 2) + '\n', 'utf8');
  const lines = ['# 全联赛新增指标与待补数据', '', '| 联赛 | 赛季 | 状态 | 待补项 | 清单或原因 |', '|---|---|---|---|---|'];
  for (const result of results) {
    let detail = result.reason;
    if (result.directory) {
      const relative = path.relative(root, path.join(result.directory, 'teams', 'README.md')).split(path.sep).join('/');
      detail = `[球队榜与待补清单](${relative})`;
    }
    lines.push(`| ${result.league} | ${result.season ?? '缺失'} | ${result.status} | ${result.missingDataCount ?? '待核验'} | ${detail} |`);
  }
  lines.push('', '请补齐各队 squad-final、player_center 赛季统计及比赛 techStats.json 后，先重新生成画像，再执行 `node bin/buildAll.js`。', '', '画像全量迁移与字段缺失清单：[查看汇总](../../crawler-server/output/profile-migration/README.md)。', '');
  fs.writeFileSync(path.join(root, 'README.md'), lines.join('\n'), 'utf8');
  console.table(results.map(({ league, season, status, missingDataCount, reason }) => ({ league, season, status, missingDataCount, reason })));
  console.log(`请补齐数据后重新生成：${path.join(root, 'README.md')}`);
  return results;
}

if (require.main === module) buildAll();
module.exports = { buildAll };
