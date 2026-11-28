'use strict';

const fs = require('fs');
const path = require('path');
const { metricsFor } = require('./metrics');

const columns = ['球衣号', '球员', '球员ID', '关键指标', '首发情况', '场次', '胜', '平', '负', '进', '失', '净', '积分'];
const metricIds = ['goals', 'assists', 'tackles', 'clearances', 'successfulPasses', 'headersWon', 'interceptions', 'shotsBlocked'];

function selectKeyPlayers(inputs, teamIds, splitRankings) {
  const teams = new Map(teamIds.map((id) => [id, { players: new Map(), issues: [] }]));
  for (const metric of metricIds.map((id) => metricsFor('players', [id])[0])) {
    const rows = inputs[metric.id];
    if (!Array.isArray(rows)) throw new Error(`${metric.id} 球员榜不是数组。`);
    const seen = new Set();
    for (const row of rows) {
      if (!row || typeof row['球员ID'] !== 'string' || !/^[1-9]\d*$/.test(row['球员ID']) || typeof row['球员'] !== 'string' || !row['球员'].trim() || typeof row['球队ID'] !== 'string' || !/^[1-9]\d*(?:,[1-9]\d*)*$/.test(row['球队ID'])) throw new Error(`${metric.id} 球员身份字段缺失或无效。`);
      if (seen.has(row['球员ID'])) throw new Error(`${metric.id} 球员ID重复：${row['球员ID']}。`);
      seen.add(row['球员ID']);
      if (!Object.hasOwn(row, metric.label) || (row[metric.label] !== null && (!Number.isFinite(row[metric.label]) || row[metric.label] < 0))) throw new Error(`${metric.id} ${row['球员']} 缺少有效指标值。`);
      if (row['球队ID'].split(',').some((id) => !teams.has(id))) throw new Error(`${metric.id} 球员球队ID不在赛程中。`);
    }
    for (const [teamId, result] of teams) {
      const candidates = [];
      for (const row of rows.filter((item) => item['球队ID'].split(',').includes(teamId))) {
        let value = row[metric.label];
        if (row['球队ID'].includes(',')) {
          // 联赛榜按球员ID跨队合并；跨队球员必须使用本队期间的同口径聚合值。
          const item = splitRankings.get(teamId)[metric.id].items.find((entry) => entry.id === row['球员ID']);
          value = item?.value;
        }
        if (value === null || value === undefined) {
          result.issues.push(`${metric.label}：${row['球员']}（${row['球员ID']}）缺少本队有效数据，未参与最高值选择`);
          continue;
        }
        candidates.push({ id: row['球员ID'], name: row['球员'], value });
      }
      if (!candidates.length) {
        result.issues.push(`${metric.label}：没有有效球员数据，无法确定本队最高值`);
        continue;
      }
      const maximum = Math.max(...candidates.map((item) => item.value));
      for (const candidate of candidates.filter((item) => item.value === maximum)) {
        if (!result.players.has(candidate.id)) result.players.set(candidate.id, { id: candidate.id, name: candidate.name, metrics: [] });
        result.players.get(candidate.id).metrics.push(`${metric.label}：${candidate.value}`);
      }
    }
  }
  return teams;
}

function readStartingXI(context, match, teamId) {
  const home = match.homeId === teamId;
  let field = 'guestStarting';
  if (home) field = 'homeStarting';
  const copies = [];
  for (const id of [match.homeId, match.awayId]) {
    const directory = context.directories.get(id);
    if (!directory) continue;
    const file = path.join(directory, 'basicData', context.shortSeason, match.id, 'lineup.json');
    if (!fs.existsSync(file)) continue;
    let data;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return { issue: `${file}：JSON无法解析` };
    }
    if (String(data.matchId) !== match.id) return { issue: `${file}：比赛ID不符` };
    const homeTeam = context.teams.find((team) => team.id === match.homeId);
    const awayTeam = context.teams.find((team) => team.id === match.awayId);
    if (data.homeName !== homeTeam.name || data.awayName !== awayTeam.name) return { issue: `${file}：主客队与赛程不符` };
    const rows = data[field];
    if (!Array.isArray(rows) || rows.length !== 11 || rows.some((row) => !row || !/^[1-9]\d*$/.test(String(row.id)))) return { issue: `${file}：${field}缺少有效的11人首发` };
    const ids = rows.map((row) => String(row.id)).sort();
    if (new Set(ids).size !== 11) return { issue: `${file}：首发球员ID重复` };
    copies.push(ids);
  }
  if (!copies.length) return { issue: `比赛${match.id}：缺少lineup.json` };
  // 主客队各存一份比赛文件，只比较本队首发ID集合，避免重复计场。
  if (copies.some((ids) => ids.join(',') !== copies[0].join(','))) return { issue: `比赛${match.id}：双方副本的本队首发冲突` };
  return { starters: new Set(copies[0]) };
}

function buildComparison(teamId, players, games) {
  const rows = [];
  for (const player of players) {
    const groups = ['首发', '不首发'].map((status) => ({
      '球衣号': player.jerseyNumber ?? '-', '球员': player.name, '球员ID': player.id, '关键指标': player.metrics.join('；'), '首发情况': status,
      '场次': 0, '胜': 0, '平': 0, '负': 0, '进': 0, '失': 0, '净': 0, '积分': 0,
    }));
    for (const game of games) {
      if (game.issue) continue;
      const score = game.match.score.split('-').map(Number);
      let own = score[1];
      let against = score[0];
      if (game.match.homeId === teamId) [own, against] = score;
      let group = groups[1];
      if (game.starters.has(player.id)) group = groups[0];
      group['场次']++;
      group['进'] += own;
      group['失'] += against;
      if (own > against) group['胜']++;
      else if (own === against) group['平']++;
      else group['负']++;
    }
    for (const group of groups) {
      group['净'] = group['进'] - group['失'];
      group['积分'] = group['胜'] * 3 + group['平'];
      rows.push(group);
    }
  }
  return rows;
}

// 按球员ID合并逐场统计和名单号码；缺失或赛季内号码冲突时不猜测。
function collectJerseyNumbers(matches, teamIds) {
  const numbersByTeam = new Map(teamIds.map((id) => [String(id), new Map()]));
  const add = (teamId, playerId, rawNumber) => {
    const players = numbersByTeam.get(String(teamId));
    if (!players || playerId === undefined || playerId === null) return;
    const id = String(playerId);
    const number = String(rawNumber ?? '').trim();
    if (!/^[1-9]\d*$/.test(id) || !/^\d+$/.test(number)) return;
    if (!players.has(id)) players.set(id, new Set());
    players.get(id).add(number);
  };
  for (const match of matches) {
    const stats = match.files['playerStats.json'];
    if (stats) {
      for (const side of ['home', 'away']) {
        const team = stats[side];
        if (!team || !Array.isArray(team.players)) continue;
        for (const player of team.players) add(team.teamId, player.playerId, player.playerNum);
      }
    }
    const lineup = match.files['lineup.json'];
    if (!lineup) continue;
    const lineups = [
      [match.homeId, lineup.homeStarting],
      [match.homeId, lineup.homeSubs],
      [match.awayId, lineup.guestStarting],
      [match.awayId, lineup.guestSubs],
    ];
    for (const [teamId, players] of lineups) {
      if (!Array.isArray(players)) continue;
      for (const player of players) add(teamId, player.id, player.number);
    }
  }
  const result = new Map();
  for (const [teamId, players] of numbersByTeam) {
    const jerseyNumbers = new Map();
    for (const [playerId, numbers] of players) {
      if (numbers.size === 1) jerseyNumbers.set(playerId, numbers.values().next().value);
      else jerseyNumbers.set(playerId, '-');
    }
    result.set(teamId, jerseyNumbers);
  }
  return result;
}

module.exports = { columns, metricIds, selectKeyPlayers, readStartingXI, buildComparison, collectJerseyNumbers };
