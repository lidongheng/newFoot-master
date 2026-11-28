#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs, isDeepStrictEqual } = require('node:util');
const { loadContext } = require('../src/sources');
const { indexTeams, parseReportOptions, writeStory } = require('../src/reportInputs');
const { parseBeijingTime } = require('./monthlySchedule');

const columns = ['排名', '球队', '比赛数', '对手平均排名', '画像全部赛程（类型/赛事/对手/积分排名/时间/主客）'];

function parseOptions(args) {
  const { values } = parseArgs({ args, strict: true, allowPositionals: false, options: {
    league: { type: 'string' }, season: { type: 'string' },
  } });
  if (!values.league || !values.season) throw new Error('--league、--season 必填。');
  const { options } = parseReportOptions(['--league', values.league, '--season', values.season]);
  return options;
}

function buildRows(context, standings) {
  const teams = new Map(context.teams.map((team) => [team.id, team]));
  const ranks = indexTeams(standings, 'standings');
  if (ranks.size !== teams.size || context.teams.some((team) => !ranks.has(team.name))) throw new Error('总积分榜球队与赛程无法完整关联。');
  const positions = new Set();
  for (const row of ranks.values()) {
    if (!Number.isInteger(row['名次']) || row['名次'] < 1 || row['名次'] > teams.size || positions.has(row['名次'])) throw new Error('总积分榜名次缺失、无效或重复。');
    positions.add(row['名次']);
  }
  const sourceTeams = new Map();
  for (const team of context.teams) {
    const profile = context.profiles.get(team.id);
    if (!profile || profile.teamId !== team.id || profile.season !== context.season) throw new Error(`${team.name}的画像球队ID或赛季不符。`);
    const schedule = profile.futureSchedule;
    if (!schedule || schedule.teamId !== team.id || typeof schedule.sourceTeamId !== 'string' || !schedule.sourceTeamId || !Array.isArray(schedule.recentMatches) || !schedule.currentMatch || !Array.isArray(schedule.matches)) throw new Error(`${team.name}画像缺少最近已完赛、本场或未来赛程结构。`);
    if (sourceTeams.has(schedule.sourceTeamId)) throw new Error('画像赛程来源球队ID重复。');
    sourceTeams.set(schedule.sourceTeamId, team);
  }
  const items = context.teams.map((team) => {
    const schedule = context.profiles.get(team.id).futureSchedule;
    const records = [
      ...schedule.recentMatches.map((match) => ({ match, phase: '已完赛' })),
      { match: schedule.currentMatch, phase: '本场' },
      ...schedule.matches.map((match) => ({ match, phase: '未来' })),
    ];
    const unique = new Map();
    for (const { match, phase } of records) {
      if (!match || typeof match !== 'object') throw new Error(`${team.name}的画像包含无效比赛。`);
      for (const field of ['matchId', 'competitionName', 'homeTeamId', 'awayTeamId', 'homeTeamName', 'awayTeamName', 'venue']) {
        if (typeof match[field] !== 'string' || !match[field].trim()) throw new Error(`${team.name}画像比赛字段${field}缺失或无效。`);
      }
      const home = match.homeTeamId === schedule.sourceTeamId;
      const away = match.awayTeamId === schedule.sourceTeamId;
      if (home === away || (home && match.venue !== 'home') || (away && match.venue !== 'away')) throw new Error(`${team.name}画像比赛${match.matchId}的主客身份无效。`);
      const timestamp = parseBeijingTime(match.startTime);
      if (unique.has(match.matchId)) {
        if (!isDeepStrictEqual(unique.get(match.matchId).match, match)) throw new Error(`${team.name}画像比赛${match.matchId}重复且冲突。`);
        continue;
      }
      const opponentId = home ? match.awayTeamId : match.homeTeamId;
      const opponent = sourceTeams.get(opponentId);
      let opponentRank = null;
      if (opponent) opponentRank = ranks.get(opponent.name)['名次'];
      unique.set(match.matchId, { match, phase, timestamp, rank: opponentRank, name: home ? match.awayTeamName : match.homeTeamName, venue: home ? '主' : '客' });
    }
    // 使用画像保存的全部赛程；不按当前时间、轮次或场数截断。
    const opponents = [...unique.values()].sort((a, b) => a.timestamp - b.timestamp || a.match.matchId.localeCompare(b.match.matchId, 'en', { numeric: true }));
    let average = null;
    let fixtures = '画像无赛程比赛';
    if (opponents.length) {
      // 跨赛事对手若不在本联赛榜中，保留比赛并保持难度缺失，不用部分样本冒充全部赛程。
      if (opponents.every((opponent) => opponent.rank !== null)) average = opponents.reduce((sum, opponent) => sum + opponent.rank, 0) / opponents.length;
      fixtures = opponents.map((opponent) => {
        let position = '本联赛积分排名缺失';
        if (opponent.rank !== null) position = `第${opponent.rank}名`;
        return `${opponent.phase} / ${opponent.match.competitionName} / ${opponent.name}（${position} / ${opponent.match.startTime} / ${opponent.venue}）`;
      }).join('；');
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
  const context = loadContext(options);
  context.profiles = new Map();
  for (const team of context.teams) {
    const destination = context.directories.get(team.id);
    if (!destination) throw new Error(`${team.name}缺少有效球队配置目录。`);
    const directory = path.basename(destination);
    const profileFile = path.join(context.directory, 'teamProfile', directory, directory + '.json');
    context.profiles.set(team.id, JSON.parse(fs.readFileSync(profileFile, 'utf8')));
  }
  const source = path.join(context.directory, 'leagueRanking', context.shortSeason, 'teams/standings/standings.json');
  const standings = JSON.parse(fs.readFileSync(source, 'utf8'));
  const rows = buildRows(context, standings);
  const description = `${context.league} · ${context.season}；赛程来源：teamProfile/{球队目录}/{球队目录}.json 的 futureSchedule.recentMatches、currentMatch 和 matches，包含最近已完赛、本场及全部未来比赛（含跨赛事），不按当前时间或场数截断。对手按画像来源球队ID关联本联赛积分榜；排名来源：leagueRanking/${context.shortSeason}/teams/standings/standings.json。`;
  const note = '难度值＝画像全部赛程对手的本联赛积分榜名次之和÷实际比赛数，值越低越凶险、排名越靠前。同值并列；任一对手排名缺失时保留全部比赛，难度和排名保持缺失并置于表尾，不补零、不仅按可匹配的比赛计算。平均排名显示两位小数，排序使用未舍入值。';
  return writeStory({ destination: path.join(context.directory, 'teamAgent'), description }, '赛程难度排行榜', rows, columns, ['对手平均排名'], note);
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
