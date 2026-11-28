const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('node:util');

function validScore(score) {
  return score && Number.isSafeInteger(score.home) && score.home >= 0 && Number.isSafeInteger(score.away) && score.away >= 0;
}

function analyzeEvents(data, match) {
  if (!Array.isArray(data.events)) throw new Error('缺少 events 数组');
  let home = 0;
  let away = 0;
  let homeBehind = false;
  let awayBehind = false;
  let finished = false;
  for (const event of data.events) {
    if (!event || typeof event !== 'object') throw new Error('事件格式无效');
    if (event.type === 'goal') {
      if (finished || !validScore(event.score)) throw new Error('进球比分无效或出现在终场之后');
      const homeDelta = event.score.home - home;
      const awayDelta = event.score.away - away;
      // 从 0–0 逐球核对，不能把缺失进球过程当作从未落后。
      if (!((homeDelta === 1 && awayDelta === 0) || (homeDelta === 0 && awayDelta === 1))) throw new Error('进球比分跳变或重复');
      home = event.score.home;
      away = event.score.away;
      if (home < away) homeBehind = true;
      if (away < home) awayBehind = true;
    }
    if (event.process === 'HalfTime' || event.process === 'FullTime') {
      if (!validScore(event.score) || event.score.home !== home || event.score.away !== away) throw new Error('半场或终场比分与进球过程不一致');
      if (finished) throw new Error('终场之后存在重复终场或半场事件');
      if (event.process === 'FullTime') finished = true;
    }
  }
  if (!finished) throw new Error('缺少终场比分');
  if (`${home}-${away}` !== match.score) throw new Error('终场比分与赛程不一致');
  return { home, away, homeBehind, awayBehind };
}

function readEvents(context, match) {
  const files = [];
  const copies = [];
  for (const id of [match.homeId, match.awayId]) {
    if (!context.directories.has(id)) continue;
    files.push(path.join(context.directories.get(id), 'basicData', context.shortSeason, match.id, 'matchEvents.json'));
  }
  try {
    for (const file of files) {
      if (!fs.existsSync(file)) continue;
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (String(data.matchId) !== match.id) throw new Error('事件文件比赛 ID 不符');
      for (const [field, id] of [['homeName', match.homeId], ['awayName', match.awayId]]) {
        const team = context.teams.find((item) => item.id === id);
        if (data[field] !== undefined && data[field] !== team.name && !team.aliases?.includes(data[field])) throw new Error('事件文件主客队身份不符');
      }
      copies.push(data);
    }
    if (!copies.length) throw new Error('缺少事件文件');
    if (copies.some((copy) => !isDeepStrictEqual(copy.events, copies[0].events))) throw new Error('双方事件副本冲突');
    return { ...analyzeEvents(copies[0], match), files };
  } catch (error) {
    return { files, reason: error.message };
  }
}

function buildComebackPoints(context, selected, metric) {
  const ranking = { metric, items: [], details: [], missing: [] };
  const dropped = metric.id === 'pointsDropped';
  const cache = new Map();
  for (const team of context.teams.filter((item) => selected.has(item.id))) {
    const item = { id: team.id, name: team.name, validSamples: 0, missingSamples: 0 };
    if (dropped) Object.assign(item, { leadingCount: 0, droppedDraws: 0, droppedLosses: 0, retainedWins: 0 });
    else Object.assign(item, { behindCount: 0, recoveredDraws: 0, recoveredWins: 0, lostFromBehind: 0 });
    let total = 0;
    for (const matchId of selected.get(team.id)) {
      const match = context.matches.get(matchId);
      if (!cache.has(matchId)) cache.set(matchId, readEvents(context, match));
      const result = cache.get(matchId);
      const home = team.id === match.homeId;
      const opponentId = home ? match.awayId : match.homeId;
      if (result.reason) {
        item.missingSamples++;
        ranking.missing.push({ metric: metric.id, teamId: team.id, team: team.name, matchId, date: match.time, opponent: context.teams.find((entry) => entry.id === opponentId).name, field: 'events/goal/score、FullTime', files: result.files, reason: result.reason });
        continue;
      }
      item.validSamples++;
      let behind = result.awayBehind;
      let own = result.away;
      let opponent = result.home;
      if (home) {
        behind = result.homeBehind;
        own = result.home;
        opponent = result.away;
      }
      // 本队曾领先，等价于对方曾落后；复用同一条已校验的比分过程。
      let eligible = behind;
      if (dropped) eligible = home ? result.awayBehind : result.homeBehind;
      if (!eligible) continue;
      let points = 0;
      let outcome;
      if (dropped) {
        item.leadingCount++;
        if (own === opponent) {
          item.droppedDraws++;
          points = 2;
          outcome = '被追平';
        } else if (own < opponent) {
          item.droppedLosses++;
          points = 3;
          outcome = '被逆转';
        } else item.retainedWins++;
      } else if (own === opponent) {
        item.recoveredDraws++;
        points = 1;
        outcome = '追平';
      } else if (own > opponent) {
        item.recoveredWins++;
        points = 3;
        outcome = '逆转';
      } else item.lostFromBehind++;
      if (!dropped) item.behindCount++;
      total += points;
      if (points) ranking.details.push({ '球队': team.name, '比赛ID': matchId, '轮次': match.round, '日期': match.time, '主队': context.teams.find((entry) => entry.id === match.homeId).name, '客队': context.teams.find((entry) => entry.id === match.awayId).name, '终场比分': match.score, '结果': outcome, [dropped ? '丢掉分数' : '追回分数']: points });
    }
    // 无有效样本保持缺失；有效比赛没有追回或丢分时才是实际的 0。
    if (item.validSamples) item.value = total;
    ranking.items.push(item);
  }
  return ranking;
}

module.exports = { analyzeEvents, buildComebackPoints };
