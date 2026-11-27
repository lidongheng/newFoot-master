#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { parseArgs } = require('node:util');
const { parseOptions } = require('../src/cli/options');
const { catalog } = require('../src/metrics');
const { loadContext, readMatches } = require('../src/sources');
const { normalize } = require('../src/normalizers');
const { buildReport } = require('../src/aggregators');

const projectRoot = path.resolve(__dirname, '..');
const historyRoot = path.join(projectRoot, 'repairs', 'history');

function main(args) {
  const [command, ...rest] = args;
  if (command === 'repair') {
    const [action, ...repairArgs] = rest;
    if (!['preview', 'apply'].includes(action)) throw new Error('repair 使用 preview 或 apply。');
    const { values } = parseArgs({ args: repairArgs, strict: true, options: { patch: { type: 'string' } } });
    if (!values.patch) throw new Error('--patch 必填。');
    const { previewRepair, publicPreview, applyRepair } = require('../repairs/scripts/repairLineup');
    const plan = previewRepair(path.resolve(values.patch));
    if (action === 'preview') return publicPreview(plan);
    return applyRepair(plan, historyRoot);
  }
  if (!['catalog', 'build'].includes(command)) throw new Error('命令：catalog | build | repair preview | repair apply；详见 README.md。');
  const options = parseOptions(rest);
  const context = loadContext(options);
  if (command === 'catalog') return { schemaVersion: 1, league: options.league, season: options.season, metrics: catalog, excluded: ['评分', '成功率', '效率/每90分钟', '个人xG推算', '盘口/潜力评分'] };
  const dataset = readMatches(context, historyRoot);
  const normalized = normalize(context, dataset);
  const report = buildReport(context, dataset, normalized, options);
  const { writeReport } = require('../src/renderers');
  const directory = writeReport(context, report);
  return { directory, scope: options.scope, availableMatches: report.metadata.availableMatches, expectedMatches: report.metadata.expectedMatches, teamRecords: report.metadata.teamRecords, playerRecords: report.metadata.playerRecords, issues: report.metadata.issueCount, missingDataCount: report.missingData.length, reminder: report.missingData.length ? '请补充 teams/missingData.json 中的数据后重新生成' : '无待补数据' };
}

if (require.main === module) {
  try {
    const result = main(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { main };
