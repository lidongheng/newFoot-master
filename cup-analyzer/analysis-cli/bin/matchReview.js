#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs } = require('node:util');
const { loadContext, readMatches } = require('../src/sources');
const { parseOptions } = require('../src/cli/options');
const { markdown } = require('../src/renderers');
const { readStartingXI } = require('../src/keyPlayerStarts');

function buildReview(context, matchId) {
  const match = context.matches.get(matchId);
  if (!match || match.status !== -1) throw new Error('指定比赛不是本赛季统计范围内的已完赛比赛。');
  const dataset = readMatches({ ...context, matches: new Map([[matchId, match]]) }, path.resolve(__dirname, '../repairs/history'));
  if (dataset.matches.length !== 1) throw new Error(`本场核心数据未通过校验：${JSON.stringify(dataset.quality)}`);
  const files = dataset.matches[0].files;
  const home = context.teams.find((team) => team.id === match.homeId);
  const away = context.teams.find((team) => team.id === match.awayId);
  for (const team of [home, away]) {
    const xi = readStartingXI(context, match, team.id);
    if (xi.issue) throw new Error(`实际首发不可用，暂不生成完整复盘资料：${xi.issue}`);
  }
  const lineup = files['lineup.json'];
  if (!lineup.homeFormation || !lineup.guestFormation) throw new Error('实际阵型缺失，暂不生成完整复盘资料。');
  const display = (value) => {
    if (value === undefined || value === null || value === '') return '缺失';
    return value;
  };
  const stats = [];
  const issues = [];
  for (const [name, field] of Object.entries(files['techStats.json'].fullMatch)) {
    const values = [field.home, field.away];
    if (values.some((value) => typeof value !== 'number' || !Number.isFinite(value) || value < 0) || (field.kind?.includes('PERCENT') && values.some((value) => value > 100))) {
      issues.push(`${name}缺失或无效，未用于比较`);
      continue;
    }
    stats.push({ '指标': name, '主队': field.home, '客队': field.away });
  }
  const personnel = (players) => players.map((player) => ({ '球衣号': display(player.number), '球员': display(player.name), '球员ID': player.id }));
  const events = files['matchEvents.json'].events.map((event) => ({
    '时间': display(event.time), '阶段': display(event.process), '主客': display(event.kind),
    '事件': display(event.type), '球员': display(event.player?.name), '助攻': display(event.assist?.name),
    '比分': event.score ? `${event.score.home}-${event.score.away}` : '缺失',
    '原始字段': JSON.stringify(event),
  }));
  if (events.some((event) => event['事件'] === '缺失')) issues.push('部分事件没有类型，不能据此推断进球、罚牌或换人');
  if (!files['playerStats.json']) issues.push('缺少球员逐场统计，无法评价个人效率或评分');
  const summary = files['matchInfo.json'].postMatchSummary;
  let summaryText = '数据源未提供赛后摘要。';
  if (typeof summary === 'string' && summary.trim()) summaryText = summary.trim();
  let stage = `第${match.round}轮`;
  if (match.stage) stage = match.stage;
  const parts = [
    `# ${home.name} ${match.score} ${away.name}｜赛后复盘资料`,
    `${context.league} · ${context.season} · ${stage} · 北京时间 ${match.time} · 比赛ID ${matchId} · 半场 ${display(match.halfScore)}`,
    '## 赛后总结（数据源原文）', summaryText,
    '## 全场技术统计', markdown(stats, ['指标', '主队', '客队']),
    `## 实际首发：${home.name}（${lineup.homeFormation}）`, markdown(personnel(lineup.homeStarting), ['球衣号', '球员', '球员ID']),
    `## 实际首发：${away.name}（${lineup.guestFormation}）`, markdown(personnel(lineup.guestStarting), ['球衣号', '球员', '球员ID']),
    '## 原始事件时间线', markdown(events, ['时间', '阶段', '主客', '事件', '球员', '助攻', '比分', '原始字段']),
    '## 实际替补名单',
  ];
  for (const [team, players] of [[home, lineup.homeSubs], [away, lineup.guestSubs]]) {
    parts.push(`### ${team.name}`);
    if (Array.isArray(players)) parts.push(markdown(personnel(players), ['球衣号', '球员', '球员ID']));
    else parts.push('数据源未提供替补名单。');
  }
  parts.push('## 数据边界', '本资料从basicData直接提取事实，不自动推断伤病、战术意图或长期实力。加时、点球与两回合总比分需结合原始事件分别核对；赛程与FullTime事件比分不一致时拒绝生成，不代替90分钟结算证据。');
  if (issues.length) parts.push(...issues.map((issue) => '- ' + issue));
  parts.push('## 来源', ...dataset.matches[0].sources.map((source) => `- ${source.file}；SHA256：${source.hash}`));
  return { text: parts.join('\n\n') + '\n', stage, home, away, issues };
}

function main(args) {
  const { values } = parseArgs({ args, strict: true, allowPositionals: false, options: { league: { type: 'string' }, season: { type: 'string' }, match: { type: 'string' } } });
  if (!values.match || !/^[1-9]\d*$/.test(values.match)) throw new Error('--match 必须为实际比赛ID。');
  const options = parseOptions(['--league', values.league, '--season', values.season]);
  const context = loadContext(options);
  const review = buildReview(context, values.match);
  const directory = path.join(context.directory, 'postMatchSummary', context.shortSeason, review.stage, values.match);
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, '复盘资料.md');
  fs.writeFileSync(file, review.text, 'utf8');
  return { file, matchId: values.match, issues: review.issues };
}

if (require.main === module) {
  try { console.log(JSON.stringify(main(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { buildReview, main };
