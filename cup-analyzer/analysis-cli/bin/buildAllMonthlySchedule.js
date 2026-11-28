#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { cups } = require('../../crawler-server/config');
const { scheduleSeason } = require('../../crawler-server/utils/teamProfileData');
const { main } = require('./monthlySchedule');

function buildAll() {
  const results = [];
  for (const [league, definition] of Object.entries(cups)) {
    if (definition.type !== 'league') continue;
    try {
      const season = scheduleSeason(definition.paths.cupScheduleData);
      results.push(main(['--league', league, '--season', season]));
    } catch (error) {
      // 联赛赛程缺失时继续处理其他联赛，保留原始错误供补齐数据。
      results.push({ league, status: 'blocked', reason: error.message });
    }
  }
  const output = path.resolve(__dirname, '../output');
  fs.mkdirSync(output, { recursive: true });
  const file = path.join(output, 'monthly-schedule-summary.json');
  fs.writeFileSync(file, JSON.stringify(results, null, 2) + '\n', 'utf8');
  console.table(results.map(({ league, season, status, teams, generated, blocked, files, reason }) => ({ league, season, status, teams, generated, blocked, files, reason })));
  console.log(`执行汇总：${file}`);
  return results;
}

if (require.main === module) {
  const results = buildAll();
  if (results.some((result) => result.status !== 'generated')) process.exitCode = 1;
}

module.exports = { buildAll };
