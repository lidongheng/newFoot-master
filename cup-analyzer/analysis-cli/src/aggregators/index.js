const path = require('path');
const { SPECIAL, buildTeamIndicators } = require('./teamIndicators');
const { metricsFor } = require('../metrics');

function selectMatches(context, options) {
  const selected = new Map();
  for (const team of context.teams) {
    if (options.team && options.team !== team.id) continue;
    let matches = [...context.matches.values()].filter((match) => match.status === -1 && (match.homeId === team.id || match.awayId === team.id));
    if (options.stage) matches = matches.filter((match) => match.stage === options.stage);
    if (options.roundRange) matches = matches.filter((match) => match.round >= options.roundRange.start && match.round <= options.roundRange.end);
    if (options.from) matches = matches.filter((match) => match.time.slice(0, 10) >= options.from && match.time.slice(0, 10) <= options.to);
    matches.sort((a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id));
    if (options.last) matches = matches.slice(0, options.last);
    selected.set(team.id, new Set(matches.map((match) => match.id)));
  }
  return selected;
}

function aggregate(entity, rows, definitions, identities, sampleCounts) {
  const groups = new Map(identities.map((identity) => [identity.id, { ...identity, rows: [], teamIds: new Set() }]));
  for (const row of rows) {
    let id = row.teamId;
    if (entity === 'players') id = row.playerId;
    if (!groups.has(id)) groups.set(id, { id, name: row.name, rows: [], teamIds: new Set() });
    const group = groups.get(id);
    group.rows.push(row);
    group.teamIds.add(row.teamId);
  }
  const rankings = {};
  for (const metric of definitions) {
    const items = [];
    for (const group of groups.values()) {
      let field = metric.id;
      if (['average', 'zeroCount', 'conversionRate'].includes(metric.aggregation)) field = metric.field;
      const valid = group.rows.filter((row) => row.metrics[field] !== undefined && (metric.aggregation !== 'conversionRate' || row.metrics.goals !== undefined));
      let expected = group.rows.length;
      if (entity === 'teams') expected = sampleCounts.get(group.id);
      const item = { id: group.id, name: group.name, teamIds: [...group.teamIds].sort(), observedMatches: group.rows.length, expectedSamples: expected, validSamples: valid.length, missingSamples: expected - valid.length };
      if (valid.length > 0) {
        // 消除十进制统计值相加产生的二进制浮点尾数，不改动逐场原值。
        const total = valid.reduce((sum, row) => sum + row.metrics[field], 0);
        if (metric.aggregation === 'conversionRate') {
          // 分子分母共用有效比赛，先累计再相除；真实零分母保留汇总值，但不计算转化率。
          item.goals = valid.reduce((sum, row) => sum + row.metrics.goals, 0);
          item.attempts = total;
          if (total > 0) item.value = item.goals / total * 100;
        } else if (metric.aggregation === 'average') item.value = total / valid.length;
        // 只统计明确为 0 的场次，射正缺失的比赛不计入。
        else if (metric.aggregation === 'zeroCount') item.value = valid.filter((row) => row.metrics[field] === 0).length;
        else item.value = Number(total.toFixed(6));
        if (entity === 'teams' && metric.id === 'goalsMinusXg') {
          // 三列采用相同的有效比赛样本，确保实际进球减 xG 等于差值。
          item.goals = valid.reduce((sum, row) => sum + row.metrics.goals, 0);
          item.xg = Number(valid.reduce((sum, row) => sum + row.metrics.xg, 0).toFixed(6));
        }
      }
      items.push(item);
    }
    items.sort((a, b) => {
      if (a.value === undefined && b.value !== undefined) return 1;
      if (b.value === undefined && a.value !== undefined) return -1;
      if (a.value !== undefined && b.value !== undefined && a.value !== b.value) {
        if (metric.order === 'asc') return a.value - b.value;
        return b.value - a.value;
      }
      return a.id.localeCompare(b.id, 'en', { numeric: true });
    });
    let previous;
    let rank = 0;
    items.forEach((item, index) => {
      if (item.value === undefined) return;
      if (previous !== item.value) rank = index + 1;
      item.rank = rank;
      previous = item.value;
    });
    rankings[metric.id] = { metric, items };
  }
  return { entity, metrics: definitions, rankings };
}

function buildReport(context, dataset, normalized, options) {
  const selected = selectMatches(context, options);
  const chosen = (row) => selected.get(row.teamId)?.has(row.matchId) === true;
  const teamMatches = normalized.teamMatches.filter(chosen);
  const playerMatches = normalized.playerMatches.filter(chosen);
  const ids = new Set([...selected.values()].flatMap((set) => [...set]));
  const matches = dataset.matches.filter((match) => ids.has(match.id)).map(({ files, ...match }) => match);
  const quality = normalized.quality.filter((item) => ids.has(item.matchId) && (!item.teamId || selected.has(item.teamId)));
  const missingMatches = [...ids].filter((id) => !matches.some((match) => match.id === id));
  const metadata = {
    schemaVersion: 1, generatedAt: new Date().toISOString(), timezone: 'Asia/Shanghai', options,
    expectedMatches: ids.size, availableMatches: matches.length, missingMatches, expectedTeamRecords: [...selected.values()].reduce((sum, set) => sum + set.size, 0),
    teamRecords: teamMatches.length, playerRecords: playerMatches.length, issueCount: quality.length,
    samplePolicy: '近 N 场按球队实际比赛取样，球员使用所选球队比赛；未观察到的球员出场不推定为零。',
    comparison: '单指标按其累计、平均或转化率口径排序，不代表综合表现。不同球队有效样本可能不同。',
    schedule: { file: context.scheduleFile, hash: context.scheduleHash },
    inputs: dataset.inputs.filter((input) => ids.has(input.matchId)),
  };
  const sampleCounts = new Map([...selected].map(([id, set]) => [id, set.size]));
  const teams = aggregate('teams', teamMatches, metricsFor('teams', options.metrics).filter((metric) => !SPECIAL.includes(metric.id)), context.teams.filter((team) => selected.has(team.id)), sampleCounts);
  const indicators = buildTeamIndicators(context, selected, dataset, options);
  const sampledMetrics = [['zeroShotsOnTarget', 'shotsOnTarget', 'TARGET'], ['averageXg', 'xg', 'EXPECTED_GOALS'], ['averageShots', 'shots', 'SHOOT'], ['shotConversionRate', 'shots', 'SHOOT'], ['shotOnTargetConversionRate', 'shotsOnTarget', 'TARGET'], ['shotsAgainst', 'shotsAgainst', 'SHOOT'], ['averageShotsAgainst', 'shotsAgainst', 'SHOOT']];
  for (const [id, field, sourceField] of sampledMetrics) {
    if (!teams.rankings[id]) continue;
    const missing = [];
    // 每项统计独立使用有效比赛样本，缺场只提醒，不补 0。
    for (const [teamId, matchIds] of selected) {
      const team = context.teams.find((item) => item.id === teamId);
      for (const matchId of matchIds) {
        const row = teamMatches.find((item) => item.teamId === teamId && item.matchId === matchId);
        if (row && row.metrics[field] !== undefined) continue;
        const match = context.matches.get(matchId);
        const opponentId = match.homeId === teamId ? match.awayId : match.homeId;
        const files = [teamId, opponentId].filter((id) => context.directories.has(id)).map((id) => path.join(context.directories.get(id), 'basicData', context.shortSeason, matchId, 'techStats.json'));
        missing.push({ metric: id, teamId, team: team.name, matchId, date: match.time, opponent: context.teams.find((item) => item.id === opponentId)?.name, field: sourceField, files, reason: `${teams.rankings[id].metric.label}所需全场数据缺失或比赛数据未通过校验，未纳入统计` });
      }
    }
    teams.rankings[id].missing = missing;
    indicators.missing.push(...missing);
  }
  Object.assign(teams.rankings, indicators.rankings);
  teams.metrics.push(...Object.values(indicators.rankings).map((ranking) => ranking.metric));
  const players = aggregate('players', playerMatches, metricsFor('players', options.metrics), [], sampleCounts);
  for (const group of [teams, players]) group.metadata = metadata;
  const unavailable = [];
  if (options.metrics) {
    for (const id of options.metrics) {
      for (const entity of ['teams', 'players']) {
        if (!metricsFor(entity, [id]).length) unavailable.push({ entity, metric: id, reason: '该实体没有对应的已核验指标来源。' });
      }
    }
  }
  return { metadata, teams, players, matches, teamMatches, playerMatches, quality, unavailable, missingData: indicators.missing };
}

module.exports = { selectMatches, aggregate, buildReport };
