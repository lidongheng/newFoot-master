const fs = require('fs');
const path = require('path');
const { metricsFor } = require('../metrics');
const { teamDirectory, numeric } = require('../../../crawler-server/utils/teamProfileData');

const { buildComebackPoints } = require('./comebackPoints');

const STANDINGS = ['standings', 'homeStandings', 'awayStandings', 'firstHalfStandings', 'secondHalfStandings'];
const PROFILES = ['averageAge', 'averageHeight', 'totalMarketValue'];
const SPECIAL = [...STANDINGS, ...PROFILES, 'averagePossession', 'comebackPoints', 'pointsDropped'];

function rank(items, order) {
  items.sort((a, b) => {
    if (a.value === undefined && b.value !== undefined) return 1;
    if (b.value === undefined && a.value !== undefined) return -1;
    if (a.value !== undefined && b.value !== undefined && a.value !== b.value) {
      if (order === 'asc') return a.value - b.value;
      return b.value - a.value;
    }
    return a.id.localeCompare(b.id, 'en', { numeric: true });
  });
  let previous;
  let position;
  items.forEach((item, index) => {
    if (item.value === undefined) return;
    if (previous !== item.value) position = index + 1;
    item.rank = position;
    previous = item.value;
  });
  return items;
}

function buildTeamIndicators(context, selected, dataset, options) {
  const rankings = {};
  const missing = [];
  const definitions = metricsFor('teams', options.metrics).filter((metric) => SPECIAL.includes(metric.id));
  for (const metric of definitions) rankings[metric.id] = { metric, items: [], missing: [] };
  for (const id of ['comebackPoints', 'pointsDropped']) {
    if (!rankings[id]) continue;
    rankings[id] = buildComebackPoints(context, selected, rankings[id].metric);
    missing.push(...rankings[id].missing);
  }
  function issue(metric, team, extra) {
    const item = { metric, teamId: team.id, team: team.name, ...extra };
    missing.push(item);
    rankings[metric].missing.push(item);
  }
  for (const team of context.teams.filter((item) => selected.has(item.id))) {
    const games = [...selected.get(team.id)].map((id) => context.matches.get(id));
    for (const id of STANDINGS.filter((key) => rankings[key])) {
      const item = { id: team.id, name: team.name, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
      const halfStanding = id === 'firstHalfStandings' || id === 'secondHalfStandings';
      let invalid = false;
      for (const match of games) {
        const home = match.homeId === team.id;
        if (id === 'homeStandings' && !home) continue;
        if (id === 'awayStandings' && home) continue;
        if (typeof match.score !== 'string' || !/^\d+-\d+$/.test(match.score)) {
          issue(id, team, { matchId: match.id, date: match.time, field: 'score', file: context.scheduleFile, reason: '已完赛比分无效，积分榜不完整' });
          invalid = true;
          continue;
        }
        let score = match.score.split('-').map(Number);
        if (halfStanding) {
          let half;
          if (typeof match.halfScore === 'string' && /^\d+-\d+$/.test(match.halfScore)) half = match.halfScore.split('-').map(Number);
          if (!half || ![...score, ...half].every(Number.isSafeInteger) || half.some((value, index) => value > score[index])) {
            issue(id, team, { matchId: match.id, date: match.time, field: 'halfScore、score', file: context.scheduleFile, reason: '半场比分缺失、无效或大于全场比分，未纳入半场积分榜' });
            invalid = true;
            continue;
          }
          // 下半场单独计分，必须先减去上半场进球，不能直接使用终场胜平负。
          if (id === 'secondHalfStandings') score = score.map((value, index) => value - half[index]);
          else score = half;
        }
        let own = score[1];
        let opponent = score[0];
        if (home) [own, opponent] = score;
        item.played++;
        item.goalsFor += own;
        item.goalsAgainst += opponent;
        if (own > opponent) { item.wins++; item.points += 3; }
        else if (own === opponent) { item.draws++; item.points++; }
        else item.losses++;
      }
      item.goalDifference = item.goalsFor - item.goalsAgainst;
      item.incomplete = invalid;
      if (halfStanding && !item.played) {
        for (const field of ['wins', 'draws', 'losses', 'goalsFor', 'goalsAgainst', 'goalDifference', 'points']) item[field] = null;
      }
      rankings[id].items.push(item);
    }
    if (rankings.averagePossession) {
      const item = { id: team.id, name: team.name, validSamples: 0, missingSamples: 0 };
      let total = 0;
      for (const match of games) {
        // 控球率独立读取技术文件，不因其他文件缺失而丢弃已有数值；双方副本须一致。
        const values = [];
        const files = [];
        for (const teamId of [match.homeId, match.awayId]) {
          const directory = context.directories.get(teamId);
          if (!directory) continue;
          const file = path.join(directory, 'basicData', context.shortSeason, match.id, 'techStats.json');
          files.push(file);
          if (!fs.existsSync(file)) continue;
          try {
            const tech = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (String(tech.matchId) !== match.id) continue;
            const fields = Object.values(tech.fullMatch || {}).filter((field) => field.kind === 'CONTROL_PERCENT');
            if (fields.length !== 1) continue;
            let side = 'away';
            if (match.homeId === team.id) side = 'home';
            const value = numeric(fields[0][side]);
            if (value !== null && value <= 100) values.push(value);
          } catch { /* 损坏的输入在待补清单中明确报告。 */ }
        }
        if (values.length && values.every((value) => value === values[0])) {
          total += values[0];
          item.validSamples++;
        } else {
          item.missingSamples++;
          const opponentId = match.homeId === team.id ? match.awayId : match.homeId;
          issue('averagePossession', team, { matchId: match.id, date: match.time, opponent: context.teams.find((entry) => entry.id === opponentId)?.name, field: 'CONTROL_PERCENT', files, reason: '控球率缺失、无效或副本冲突' });
        }
      }
      if (item.validSamples) item.value = total / item.validSamples;
      rankings.averagePossession.items.push(item);
    }
    const profileMetrics = PROFILES.filter((id) => rankings[id]);
    if (!profileMetrics.length) continue;
    const identity = { id: team.id, englishName: team.englishName };
    const directory = teamDirectory(context.directory, identity);
    const file = path.join(context.directory, 'teamProfile', directory, `${directory}.json`);
    let players;
    let sourceFiles;
    let reason;
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (String(data.teamId) !== team.id || data.season !== context.season) throw new Error('画像球队或赛季不符');
      if (!Array.isArray(data.players)) throw new Error('画像缺少 players');
      players = data.players;
      sourceFiles = data.sourceFiles;
    } catch (error) { reason = error.message; }
    let chosen = [];
    if (players) {
      chosen = players.filter((player) => numeric(player.appearances) > 0);
      // 缺首发或球衣号仅影响并列次序，不补造统计数值。
      const descending = (a, b, key) => {
        const left = numeric(a[key]);
        const right = numeric(b[key]);
        if (left === null && right !== null) return 1;
        if (right === null && left !== null) return -1;
        if (left === null) return 0;
        return right - left;
      };
      const jerseyOrder = (a, b) => {
        if (numeric(a.number) === null) return Number(numeric(b.number) !== null);
        if (numeric(b.number) === null) return -1;
        return numeric(a.number) - numeric(b.number);
      };
      chosen.sort((a, b) => descending(a, b, 'appearances') || descending(a, b, 'starts') || jerseyOrder(a, b) || String(a.name).localeCompare(String(b.name)));
      chosen = chosen.slice(0, 25);
    }
    for (const id of profileMetrics) {
      let field = 'marketValue';
      if (id === 'averageAge') field = 'age';
      if (id === 'averageHeight') field = 'height';
      const valid = chosen.filter((player) => numeric(player[field]) !== null);
      const item = { id: team.id, name: team.name, selectedPlayers: chosen.length, validPlayers: valid.length, missingPlayers: chosen.length - valid.length, incomplete: false };
      if (valid.length) {
        item.value = valid.reduce((sum, player) => sum + numeric(player[field]), 0);
        if (id !== 'totalMarketValue') item.value /= valid.length;
      }
      if (reason || !chosen.length) issue(id, team, { file, reason: reason || '没有出场数大于0的球员' });
      for (const player of players || []) {
        if (numeric(player.appearances) === null) issue(id, team, { player: player.name, number: player.number, field: 'appearances', file, sourceFiles, reason: '无法判断是否纳入最多25人；请补源名单或赛季分析器后重新生成画像' });
      }
      for (const player of chosen.filter((entry) => numeric(entry[field]) === null)) issue(id, team, { player: player.name, number: player.number, field, file, sourceFiles, reason: '请补源名单后重新生成画像' });
      item.incomplete = rankings[id].missing.some((entry) => entry.teamId === team.id);
      rankings[id].items.push(item);
    }
  }
  for (const [id, ranking] of Object.entries(rankings)) {
    if (STANDINGS.includes(id)) {
      ranking.items.sort((a, b) => {
        if (a.points === null && b.points !== null) return 1;
        if (b.points === null && a.points !== null) return -1;
        return Number(a.incomplete) - Number(b.incomplete) || b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.id.localeCompare(b.id, 'en', { numeric: true });
      });
      ranking.items.forEach((item, index) => {
        if (item.points !== null) item.rank = index + 1;
      });
    } else rank(ranking.items, ranking.metric.order);
  }
  return { rankings, missing };
}

module.exports = { STANDINGS, PROFILES, SPECIAL, buildTeamIndicators };
