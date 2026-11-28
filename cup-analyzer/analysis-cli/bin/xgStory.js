#!/usr/bin/env node
'use strict';

const { indexTeams, loadReportInputs, writeStory } = require('../src/reportInputs');

const columns = ['名次', '球队', '场均xG排名', '场均射门排名', '实际进球-xG排名', '场均xG', '场均射门', '实际进球-xG'];
const metrics = [
  ['averageXg', '场均 xG', '场均xG'],
  ['averageShots', '场均射门', '场均射门'],
  ['goalsMinusXg', '实际进球 − xG', '实际进球-xG'],
];

function buildRows(inputs) {
  const standings = indexTeams(inputs.standings, 'standings');
  const ranks = new Set();
  for (const row of standings.values()) {
    if (!Number.isInteger(row['名次']) || row['名次'] < 1 || ranks.has(row['名次'])) throw new Error('standings 名次缺失、无效或重复。');
    ranks.add(row['名次']);
  }
  const indexes = metrics.map(([id, field]) => {
    const index = indexTeams(inputs[id], id);
    if (index.size !== standings.size || [...index.keys()].some((name) => !standings.has(name))) throw new Error(`${id} 球队与积分榜无法完整关联。`);
    for (const [name, row] of index) {
      if (!Object.hasOwn(row, '排名') || (row['排名'] !== null && (!Number.isInteger(row['排名']) || row['排名'] < 1))) throw new Error(`${id} ${name} 缺少有效字段：排名。`);
      if (!Object.hasOwn(row, field) || (row[field] !== null && (typeof row[field] !== 'number' || !Number.isFinite(row[field])))) throw new Error(`${id} ${name} 缺少有效字段：${field}。`);
    }
    return index;
  });
  // 行顺序沿用总积分榜，各指标排名直接引用源榜单，不重新计算。
  return [...standings.values()].sort((a, b) => a['名次'] - b['名次']).map((standing) => {
    const row = { '名次': standing['名次'], '球队': standing['球队'] };
    metrics.forEach(([, , column], index) => {
      row[column + '排名'] = indexes[index].get(standing['球队'])['排名'];
    });
    metrics.forEach(([, field, column], index) => {
      row[column] = indexes[index].get(standing['球队'])[field];
    });
    return row;
  });
}

function main(args) {
  const report = loadReportInputs(args, ['standings', ...metrics.map(([id]) => id)]);
  const rows = buildRows(report.inputs);
  return writeStory(report, 'xG告诉我们的故事', rows, columns, metrics.map(([, , column]) => column), '');
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(main(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { buildRows, main };
