#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { isDeepStrictEqual } = require('node:util');
const { loadContext } = require('../src/sources');
const { selectMatches } = require('../src/aggregators');
const { parseReportOptions, writeStory } = require('../src/reportInputs');

const title = '本赛季同档次对手较量';
const outcomes = new Map([[1, '赢盘'], [0.5, '赢半'], [0, '走盘'], [-0.5, '输半'], [-1, '输盘']]);
const columns = ['主客', '初赔（主队让球）', '本队让球', '场次', ...outcomes.values(), '赢盘率（含赢半）%', '净赢盘', '比赛明细'];

function readRows(file) {
  const data = { jh: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), data, { filename: file, timeout: 5000 });
  const matches = new Map();
  for (const [key, rows] of Object.entries(data.jh)) {
    if (!/^R_\d+$/.test(key)) continue;
    if (!Array.isArray(rows)) throw new Error(`${key} 不是比赛数组。`);
    for (const row of rows) {
      if (!Array.isArray(row)) throw new Error(`${key} 含无效比赛。`);
      const id = String(row[0]);
      if (matches.has(id) && !isDeepStrictEqual(matches.get(id), row)) throw new Error(`比赛${id}重复且数据冲突。`);
      matches.set(id, row);
    }
  }
  return matches;
}

function settle(row, teamId) {
  const line = row[10];
  if (typeof line !== 'number' || !Number.isFinite(line) || !Number.isSafeInteger(line * 4)) throw new Error('全场亚盘初赔[10]缺失或无效');
  if (typeof row[6] !== 'string' || !/^\d+-\d+$/.test(row[6])) throw new Error('全场比分[6]缺失或无效');
  const [home, away] = row[6].split('-').map(Number);
  if (![home, away].every(Number.isSafeInteger)) throw new Error('全场比分[6]超出安全整数范围');
  if (![String(row[4]), String(row[5])].includes(teamId)) throw new Error('球队不属于该场比赛');
  let lines = [line];
  // 四分之一盘口拆为两个相邻半球盘，分别结算后合并，保留半赢和半输。
  if (!Number.isInteger(line * 2)) lines = [Math.floor(line * 2) / 2, Math.ceil(line * 2) / 2];
  let result = lines.reduce((sum, value) => sum + Math.sign(home - away - value), 0) / lines.length;
  if (result === 0) return 0;
  if (teamId === String(row[5])) result = -result;
  return result;
}

function buildRows(context, team, selected, rawRows) {
  const groups = new Map();
  const issues = [];
  const teams = new Map(context.teams.map((item) => [item.id, item]));
  const matches = [...selected].map((id) => context.matches.get(id)).sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id, 'en', { numeric: true }));
  for (const match of matches) {
    const row = rawRows.get(match.id);
    if (!row || !teams.has(match.homeId) || !teams.has(match.awayId) || match.homeId === match.awayId) throw new Error(`比赛${match.id}赛程身份无效。`);
    let result;
    try {
      result = settle(row, team.id);
    } catch (error) {
      issues.push(`比赛${match.id}（${match.time}）：${error.message}，未纳入统计`);
      continue;
    }
    const home = match.homeId === team.id;
    const venue = home ? '主场' : '客场';
    const key = `${venue}:${row[10]}`;
    if (!groups.has(key)) {
      let teamLine = row[10];
      // 平手盘保持0，客场转换视角时不产生负零。
      if (!home && teamLine !== 0) teamLine = -teamLine;
      groups.set(key, { '主客': venue, '初赔（主队让球）': row[10], '本队让球': teamLine, '场次': 0,
        '赢盘': 0, '赢半': 0, '走盘': 0, '输半': 0, '输盘': 0, '净赢盘': 0, details: [] });
    }
    const group = groups.get(key);
    group['场次'] += 1;
    group[outcomes.get(result)] += 1;
    group['净赢盘'] += result;
    const opponent = teams.get(home ? match.awayId : match.homeId);
    group.details.push(`${match.time} 第${match.round}轮 ${opponent.name} ${match.score}（主队在前） ${outcomes.get(result)} [${match.id}]`);
  }
  const rows = [...groups.values()].sort((a, b) => {
    if (a['主客'] !== b['主客']) return a['主客'] === '主场' ? -1 : 1;
    return a['本队让球'] - b['本队让球'];
  }).map(({ details, ...group }) => ({ ...group,
    '赢盘率（含赢半）%': (group['赢盘'] + group['赢半']) / group['场次'] * 100,
    '比赛明细': details.join('；'),
  }));
  return { rows, issues, matches: matches.length };
}

function main(args) {
  const { options, scopeLabel } = parseReportOptions(args);
  const context = loadContext(options);
  if (!/^s.*\.js$/i.test(path.basename(context.scheduleFile)) || path.dirname(context.scheduleFile) !== path.join(context.directory, 'data')) throw new Error('仅支持本联赛data目录下配置的s开头赛程文件。');
  const rawRows = readRows(context.scheduleFile);
  const selected = selectMatches(context, options);
  const plans = context.teams.map((team) => {
    if (!context.directories.has(team.id)) throw new Error(`${team.name}缺少有效球队配置目录。`);
    return { team, ...buildRows(context, team, selected.get(team.id), rawRows) };
  });
  let scope = scopeLabel;
  if (options.scope === 'all-matches') scope = '本赛季本地赛程全部已完赛比赛（状态[2]严格等于-1）';
  for (const plan of plans) {
    const description = `${plan.team.name} · ${context.league} · ${context.season}；${scope}。来源：data/${path.basename(context.scheduleFile)}，jh的R_N二维数组，全场比分[6]、全场亚盘初赔[10]。相同主客、相同初赔归为一组；同档次仅指同初赔，不另套球队分档。初赔保留源值，正数表示主队让球、负数表示主队受让；本队让球以本队视角展示，正数让球、负数受让。`;
    let note = `共${plan.matches}场，纳入${plan.rows.reduce((sum, row) => sum + row['场次'], 0)}场。仅分析全场亚盘；四分之一盘口拆盘结算。赢盘率（含赢半）＝（赢盘场次＋赢半场次）÷有效场次；净赢盘＝赢盘＋赢半×0.5－输半×0.5－输盘，不代表实际投注盈利。比赛明细比分始终主队在前。没有样本的组合不生成统计行。`;
    if (plan.issues.length) note += '数据缺口：' + plan.issues.join('；') + '。';
    writeStory({ destination: context.directories.get(plan.team.id), description }, title, plan.rows, columns, ['赢盘率（含赢半）%'], note);
  }
  return { league: context.league, season: context.season, teams: plans.length, files: plans.length * 2,
    dataGaps: plans.filter((plan) => plan.issues.length).map((plan) => ({ team: plan.team.name, issues: plan.issues })) };
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(main(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { title, columns, readRows, settle, buildRows, main };
