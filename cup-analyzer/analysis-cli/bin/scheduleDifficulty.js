#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs } = require('node:util');
const { loadContext } = require('../src/sources');
const { indexTeams, parseReportOptions, writeStory } = require('../src/reportInputs');

const columns = ['排名', '球队', '比赛数', '对手平均排名', '未来赛程（对手/积分排名/时间/主客）'];

function parseOptions(args) {
  const { values } = parseArgs({ args, strict: true, allowPositionals: false, options: {
    league: { type: 'string' }, season: { type: 'string' }, next: { type: 'string', default: '5' },
  } });
  if (!values.league || !values.season) throw new Error('--league、--season 必填。');
  if (!/^[1-9]\d*$/.test(values.next) || !Number.isSafeInteger(Number(values.next))) throw new Error('--next 必须为正整数。');
  const { options } = parseReportOptions(['--league', values.league, '--season', values.season]);
  return { ...options, next: Number(values.next) };
}

function buildRows(context, standings, next, now) {
  const teams = new Map(context.teams.map((team) => [team.id, team]));
  const ranks = indexTeams(standings, 'standings');
  if (ranks.size !== teams.size || context.teams.some((team) => !ranks.has(team.name))) throw new Error('总积分榜球队与赛程无法完整关联。');
  const positions = new Set();
  for (const row of ranks.values()) {
    if (!Number.isInteger(row['名次']) || row['名次'] < 1 || row['名次'] > teams.size || positions.has(row['名次'])) throw new Error('总积分榜名次缺失、无效或重复。');
    positions.add(row['名次']);
  }
  // 状态取赛程内数组下标2；必须同时满足未开赛及开赛时间晚于当前时刻。
  const future = [...context.matches.values()].filter((match) => match.status === 0 && match.timestamp > now);
  for (const match of future) {
    if (!teams.has(match.homeId) || !teams.has(match.awayId) || match.homeId === match.awayId) throw new Error(`比赛${match.id}的主客队无效。`);
  }
  future.sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id, 'en', { numeric: true }));
  const items = context.teams.map((team) => {
    // 按实际开赛时间选择本队最近N场，不按轮次编号截取。
    const matches = future.filter((match) => match.homeId === team.id || match.awayId === team.id).slice(0, next);
    const opponents = matches.map((match) => {
      let opponent = teams.get(match.homeId);
      let venue = '客';
      if (match.homeId === team.id) {
        opponent = teams.get(match.awayId);
        venue = '主';
      }
      return { name: opponent.name, rank: ranks.get(opponent.name)['名次'], time: match.time, venue };
    });
    let average = null;
    let fixtures = '无符合条件的未来比赛';
    if (opponents.length) {
      average = opponents.reduce((sum, opponent) => sum + opponent.rank, 0) / opponents.length;
      fixtures = opponents.map((opponent) => `${opponent.name}（第${opponent.rank}名 / ${opponent.time} / ${opponent.venue}）`).join('；');
    }
    return { '排名': null, '球队': team.name, '比赛数': opponents.length, '对手平均排名': average, [columns[4]]: fixtures };
  });
  items.sort((a, b) => {
    if (a['对手平均排名'] === null && b['对手平均排名'] !== null) return 1;
    if (b['对手平均排名'] === null && a['对手平均排名'] !== null) return -1;
    if (a['对手平均排名'] !== null && b['对手平均排名'] !== null && a['对手平均排名'] !== b['对手平均排名']) return a['对手平均排名'] - b['对手平均排名'];
    return ranks.get(a['球队'])['名次'] - ranks.get(b['球队'])['名次'];
  });
  let previous;
  let rank;
  items.forEach((item, index) => {
    if (item['对手平均排名'] === null) return;
    // 按未四舍五入的平均排名升序排名；同值并列，如1、1、3。
    if (item['对手平均排名'] !== previous) rank = index + 1;
    item['排名'] = rank;
    previous = item['对手平均排名'];
  });
  return items;
}

function main(args) {
  const options = parseOptions(args);
  const now = Date.now();
  const context = loadContext(options);
  if (!/^s.*\.js$/i.test(path.basename(context.scheduleFile)) || path.dirname(context.scheduleFile) !== path.join(context.directory, 'data')) throw new Error('赛程必须是本联赛data目录下配置的s开头JS文件。');
  const source = path.join(context.directory, 'leagueRanking', context.shortSeason, 'teams/standings/standings.json');
  const standings = JSON.parse(fs.readFileSync(source, 'utf8'));
  const rows = buildRows(context, standings, options.next, now);
  const asOf = new Date(now).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  const description = `${context.league} · ${context.season}；统计时刻：北京时间${asOf}。每队取状态为0、开赛时间晚于统计时刻的最近${options.next}场联赛比赛。赛程来源：data/${path.basename(context.scheduleFile)}；对手排名来源：leagueRanking/${context.shortSeason}/teams/standings/standings.json。`;
  const note = '难度值＝所选对手总积分榜名次之和÷实际比赛数，值越低越凶险、排名越靠前。同值并列；不足指定场数时按实际场数计算，无未来比赛者不计算难度和排名并置于表尾。平均排名显示两位小数，排序使用未舍入值。';
  return { ...writeStory({ destination: path.join(context.directory, 'teamAgent'), description }, '赛程难度排行榜', rows, columns, ['对手平均排名'], note), next: options.next };
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(main(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { parseOptions, buildRows, main };
