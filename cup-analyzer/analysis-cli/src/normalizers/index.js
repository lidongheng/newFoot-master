const { metricsFor } = require('../metrics');

function numberValue(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  if (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value)) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return undefined;
  return number;
}

function normalize(context, dataset) {
  const teamMatches = [];
  const playerMatches = [];
  const quality = [...dataset.quality];
  function issue(code, matchId, extra) {
    quality.push({ code, matchId, ...extra });
  }
  for (const match of dataset.matches) {
    const tech = match.files['techStats.json'];
    const players = match.files['playerStats.json'];
    const lineup = match.files['lineup.json'];
    const untypedEvents = match.files['matchEvents.json'].events.filter((event) => !event.type).length;
    if (untypedEvents > 0) issue('untypedMatchEvents', match.id, { count: untypedEvents, note: '部分事件缺类型，不能仅凭 goal 类型还原完整进球时间线。' });
    if (!lineup || !lineup.homeStarting?.length || !lineup.guestStarting?.length || !lineup.homeFormation || !lineup.guestFormation) issue('incompleteLineup', match.id, {});
    for (const [side, teamId, opponentId] of [['home', match.homeId, match.awayId], ['away', match.awayId, match.homeId]]) {
      const team = context.teams.find((item) => item.id === teamId);
      if (!team) throw new Error(`比赛 ${match.id} 的球队 ${teamId} 不在 arrTeam。`);
      const periods = {};
      for (const period of ['fullMatch', 'firstHalf', 'secondHalf']) {
        periods[period] = {};
        const section = tech[period];
        if (!section || typeof section !== 'object') {
          issue('missingPeriod', match.id, { teamId, period });
          continue;
        }
        for (const metric of metricsFor('teams')) {
          if (metric.source !== 'techStats') continue;
          const candidates = Object.values(section).filter((value) => value.kind === metric.field);
          if (candidates.length !== 1) continue;
          let valueSide = side;
          // 被射门读取同一比赛的对方数值，单队筛选也不依赖对手是否参与排名。
          if (metric.side === 'opponent') valueSide = side === 'home' ? 'away' : 'home';
          const raw = candidates[0][valueSide];
          const value = numberValue(raw);
          if (value !== undefined) periods[period][metric.id] = value;
          else issue('invalidMetric', match.id, { teamId, metric: metric.id, period, raw });
        }
      }
      const goals = match.score.split('-').map(Number);
      if (side === 'home') {
        periods.fullMatch.goals = goals[0];
        periods.fullMatch.goalsAgainst = goals[1];
      } else {
        periods.fullMatch.goals = goals[1];
        periods.fullMatch.goalsAgainst = goals[0];
      }
      // 仅对有 xG 的同场数据计算差值；允许负数，不能把缺失 xG 当作 0。
      if (periods.fullMatch.xg !== undefined) {
        periods.fullMatch.goalsMinusXg = Number((periods.fullMatch.goals - periods.fullMatch.xg).toFixed(6));
      }
      teamMatches.push({ matchId: match.id, teamId, name: team.name, opponentId, side, round: match.round, time: match.time, timestamp: match.timestamp, metrics: periods.fullMatch, periods });
      const data = players?.[side];
      if (!data || String(data.teamId) !== teamId || !Array.isArray(data.players)) {
        issue('missingPlayerData', match.id, { teamId });
        continue;
      }
      const seen = new Set();
      const rows = [];
      for (const player of data.players) {
        if (!Number.isInteger(player.playerId) || player.playerId <= 0 || seen.has(player.playerId)) {
          issue('invalidOrDuplicatePlayer', match.id, { teamId, playerId: player.playerId });
          continue;
        }
        seen.add(player.playerId);
        const values = {};
        if (!player.stats || Object.keys(player.stats).length === 0) issue('emptyPlayerStats', match.id, { teamId, playerId: String(player.playerId) });
        for (const metric of metricsFor('players')) {
          if (metric.source === 'stats') {
            const raw = player.stats?.[metric.field];
            if (raw === undefined) continue;
            const value = numberValue(raw);
            if (value !== undefined) values[metric.id] = value;
            else issue('invalidMetric', match.id, { teamId, playerId: String(player.playerId), metric: metric.id, raw });
          } else if (Array.isArray(player.events)) {
            // 明确存在的空事件数组代表 0 次；缺失数组不推定为 0。
            if (metric.id === 'goals') {
              const goals = player.events.filter((event) => event.kind === 'Goal');
              const penalties = player.events.filter((event) => event.kind === 'Penalty');
              if (penalties.some((penalty) => goals.some((goal) => goal.happentTime === penalty.happentTime))) {
                issue('ambiguousGoalEvents', match.id, { teamId, playerId: String(player.playerId), note: 'Goal 和 Penalty 同时刻出现，保留事件分项，进球合计暂不推断。' });
              } else values[metric.id] = goals.length + penalties.length;
            } else values[metric.id] = player.events.filter((event) => event.kind === metric.field).length;
          }
        }
        const row = { matchId: match.id, teamId, playerId: String(player.playerId), name: player.playerName, teamName: team.name, side, round: match.round, time: match.time, timestamp: match.timestamp, metrics: values, events: player.events, rawStats: player.stats };
        playerMatches.push(row);
        rows.push(row);
      }
      for (const metric of ['shots', 'shotsOnTarget']) {
        const observed = rows.filter((row) => row.metrics[metric] !== undefined);
        const teamValue = periods.fullMatch[metric];
        if (observed.length && teamValue !== undefined) {
          const sum = observed.reduce((total, row) => total + row.metrics[metric], 0);
          if (sum !== teamValue) issue('playerTeamMismatch', match.id, { teamId, metric, teamValue, playerSum: sum, validPlayers: observed.length, observedPlayers: rows.length });
        }
      }
    }
  }
  return { teamMatches, playerMatches, quality };
}

module.exports = { numberValue, normalize };
