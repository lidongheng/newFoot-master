#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { cups } = require('../../crawler-server/config');
const { scheduleSeason } = require('../../crawler-server/utils/teamProfileData');
const { main } = require('./sameOpeningHandicap');

function buildAll() {
  const results = [];
  // 单个联赛的数据问题不阻断其他联赛，各自保留明确失败原因。
  for (const [league, definition] of Object.entries(cups)) {
    if (definition.type !== 'league') continue;
    try {
      const season = scheduleSeason(definition.paths.cupScheduleData);
      results.push({ status: 'generated', ...main(['--league', league, '--season', season]) });
    } catch (error) {
      results.push({ league, status: 'blocked', reason: error.message });
    }
  }
  const file = path.resolve(__dirname, '../output/same-opening-handicap-summary.json');
  fs.writeFileSync(file, JSON.stringify(results, null, 2) + '\n', 'utf8');
  console.table(results.map(({ league, status, season, teams, files, dataGaps, reason }) => ({ league, status, season, teams, files, gapTeams: dataGaps?.length, reason })));
  return results;
}

if (require.main === module) buildAll();
module.exports = { buildAll };
