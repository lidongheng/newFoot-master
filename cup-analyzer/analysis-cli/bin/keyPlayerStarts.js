#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseReportOptions, writeStory } = require('../src/reportInputs');
const { loadContext, readMatches } = require('../src/sources');
const { normalize } = require('../src/normalizers');
const { selectMatches, aggregate, buildReport } = require('../src/aggregators');
const { metricsFor } = require('../src/metrics');
const { writeReport } = require('../src/renderers');
const { columns, metricIds, selectKeyPlayers, readStartingXI, buildComparison, collectJerseyNumbers } = require('../src/keyPlayerStarts');

function main(args) {
  const { options, scopeLabel } = parseReportOptions(args);
  const context = loadContext(options);
  for (const team of context.teams) {
    if (!context.directories.has(team.id)) throw new Error(`${team.name} 缺少有效球队配置目录。`);
  }
  const dataset = readMatches(context, path.resolve(__dirname, '../repairs/history'));
  const jerseyNumbers = collectJerseyNumbers(dataset.matches, context.teams.map((team) => team.id));
  const normalized = normalize(context, dataset);
  // 本步同时使用球员榜和逐场数据，每次沿用现有 build 流程生成同范围榜单。
  const report = buildReport(context, dataset, normalized, { ...options, metrics: metricIds });
  const rankingRoot = writeReport(context, report);
  const inputs = {};
  for (const id of metricIds) {
    inputs[id] = JSON.parse(fs.readFileSync(path.join(rankingRoot, 'players', id, id + '.json'), 'utf8'));
  }
  const selected = selectMatches(context, options);
  const splitRankings = new Map();
  for (const team of context.teams) {
    const rows = report.playerMatches.filter((row) => row.teamId === team.id);
    splitRankings.set(team.id, aggregate('players', rows, metricsFor('players', metricIds), [], new Map()).rankings);
  }
  const leaders = selectKeyPlayers(inputs, context.teams.map((team) => team.id), splitRankings);
  const title = '关键球员不首发时球队的表现';
  const outputs = [];
  const plans = [];
  for (const team of context.teams) {
    const result = leaders.get(team.id);
    const players = [...result.players.values()].map((player) => ({
      ...player,
      jerseyNumber: jerseyNumbers.get(team.id).get(player.id) ?? '-',
    }));
    const issues = [];
    // 范围内没有比赛与数据缺失不同，不把未参赛球队记成指标缺口。
    if (selected.get(team.id).size > 0) issues.push(...result.issues);
    const games = [...selected.get(team.id)].map((id) => {
      const match = context.matches.get(id);
      if (typeof match.score !== 'string' || !/^\d+-\d+$/.test(match.score)) return { match, issue: `比赛${id}：已完赛比分无效` };
      return { match, ...readStartingXI(context, match, team.id) };
    });
    for (const game of games.filter((item) => item.issue)) issues.push(`${game.match.time} ${game.issue}；未纳入首发/不首发统计`);
    const rows = buildComparison(team.id, players, games);
    let scope = scopeLabel;
    if (options.scope === 'all-matches') scope = '统计范围：本赛季本地赛程全部已完赛比赛';
    const description = `${team.name} · ${context.league} · ${context.season}；${scope}。关键球员取同范围 players 榜 ${metricIds.join('、')} 的本队最高值，跨队球员按本队期间拆分；并列全取，同一球员合并指标。进球沿用 Goal＋Penalty、不含乌龙的榜单口径；headersWon 为争顶成功次数。球队比分取赛程，首发取比赛 lineup.json 的11人名单；不首发包含替补及未出场。球衣号按球员ID取逐场统计或首发、替补名单中的号码，缺失或冲突显示“-”。共${games.length}场，首发可判定${games.filter((game) => !game.issue).length}场，未知${games.filter((game) => game.issue).length}场。`;
    let note = '胜3分、平1分、负0分；场次为0表示该组没有可统计比赛。两组样本量可能不同，表格只描述比赛结果，不推断因果。';
    if (!games.length) note += '统计范围内无已完赛比赛，未选取关键球员。';
    if (issues.length) note += '数据缺口：' + issues.join('；') + '。';
    plans.push({ team, rows, players, issues, description, note });
  }
  // 先完成全部球队的数据校验和比较，再输出各自球队的文件。
  for (const plan of plans) {
    const output = writeStory({ destination: context.directories.get(plan.team.id), description: plan.description }, title, plan.rows, columns, [], plan.note);
    outputs.push({ team: plan.team.name, files: output.files, keyPlayers: plan.players.length, issues: plan.issues.length });
  }
  return {
    league: context.league, season: context.season, scope: options.scope,
    directory: path.join(context.directory, 'teamAgent'), teams: outputs.length, files: outputs.length * 2,
    keyPlayers: outputs.reduce((sum, output) => sum + output.keyPlayers, 0),
    dataGaps: outputs.filter((output) => output.issues > 0).map((output) => ({ team: output.team, issues: output.issues })),
  };
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(main(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { main };
