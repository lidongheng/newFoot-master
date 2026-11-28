#!/usr/bin/env node
'use strict';

const { indexTeams, loadReportInputs, writeStory } = require('../src/reportInputs');

const columns = ['球队', '积分排名', '胜场排名', '主场胜场排名', '积分', '胜场', '主场胜场'];

function winsRanks(teams) {
  const rows = [...teams.values()].sort((a, b) => b['胜'] - a['胜']);
  const ranks = new Map();
  let previous;
  let rank;
  rows.forEach((row, index) => {
    // 胜场相同并列排名，例如 1、1、3；不使用主场积分名次代替主场胜场排名。
    if (row['胜'] !== previous) rank = index + 1;
    ranks.set(row['球队'], rank);
    previous = row['胜'];
  });
  return ranks;
}

function buildRows(inputs) {
  const standings = indexTeams(inputs.standings, 'standings');
  const homeStandings = indexTeams(inputs.homeStandings, 'homeStandings');
  if (homeStandings.size !== standings.size || [...homeStandings.keys()].some((name) => !standings.has(name))) throw new Error('homeStandings 球队与积分榜无法完整关联。');
  const ranks = new Set();
  for (const [name, row] of standings) {
    if (!Number.isInteger(row['名次']) || row['名次'] < 1 || ranks.has(row['名次'])) throw new Error('standings 名次缺失、无效或重复。');
    ranks.add(row['名次']);
    if (!Number.isInteger(row['积分'])) throw new Error(`standings ${name} 缺少有效字段：积分。`);
  }
  for (const [source, teams] of [['standings', standings], ['homeStandings', homeStandings]]) {
    for (const [name, row] of teams) {
      if (!Number.isInteger(row['胜']) || row['胜'] < 0) throw new Error(`${source} ${name} 缺少有效字段：胜。`);
    }
  }
  const wins = winsRanks(standings);
  const homeWins = winsRanks(homeStandings);
  return [...standings.values()].sort((a, b) => a['名次'] - b['名次']).map((row) => ({
    '球队': row['球队'],
    '积分排名': row['名次'],
    '胜场排名': wins.get(row['球队']),
    '主场胜场排名': homeWins.get(row['球队']),
    '积分': row['积分'],
    '胜场': row['胜'],
    '主场胜场': homeStandings.get(row['球队'])['胜'],
  }));
}

function main(args) {
  const report = loadReportInputs(args, ['standings', 'homeStandings']);
  const rows = buildRows(report.inputs);
  return writeStory(report, '球队战力', rows, columns, [], '积分排名沿用总积分榜；胜场、主场胜场按数量降序排名，同值并列（1、1、3）。');
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
