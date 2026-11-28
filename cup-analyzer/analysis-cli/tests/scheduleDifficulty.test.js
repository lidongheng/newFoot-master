const test = require('node:test');
const assert = require('node:assert/strict');
const { parseOptions, buildRows } = require('../bin/scheduleDifficulty');

function fixture() {
  const teams = ['甲', '乙', '丙'].map((name, index) => ({ id: String(index + 1), name }));
  const standings = teams.map((team, index) => ({ '球队': team.name, '名次': index + 1 }));
  const game = (id, home, away, time) => ({ matchId: id, competitionName: '联赛', homeTeamId: 'source-' + home, awayTeamId: 'source-' + away, homeTeamName: teams[Number(home) - 1].name, awayTeamName: teams[Number(away) - 1].name, venue: 'home', startTime: time });
  const profiles = new Map(teams.map((team) => [team.id, { teamId: team.id, season: '2026-2027', futureSchedule: {
    teamId: team.id, sourceTeamId: 'source-' + team.id, recentMatches: [], matches: [],
    currentMatch: game('current-' + team.id, team.id, String(Number(team.id) % 3 + 1), '2026-11-28 12:00:00'),
  } }]));
  const schedule = profiles.get('1').futureSchedule;
  schedule.recentMatches.push(game('past', '1', '3', '2026-11-01 12:00:00'));
  schedule.matches = Array.from({ length: 7 }, (_, index) => game('future-' + index, '1', '2', `2026-12-${String(index + 1).padStart(2, '0')} 12:00:00`)).reverse();
  return { context: { teams, season: '2026-2027', profiles }, standings };
}

test('画像全部赛程包含已完赛、本场及超过5场的未来比赛，并按时间排序', () => {
  const { context, standings } = fixture();
  const before = JSON.stringify([...context.profiles]);
  const row = buildRows(context, standings).find((item) => item['球队'] === '甲');
  assert.equal(row['比赛数'], 9);
  assert.equal(row['对手平均排名'], 19 / 9);
  const detail = Object.values(row).at(-1);
  assert.match(detail, /已完赛.*本场.*未来/);
  assert.ok(detail.indexOf('2026-12-01') < detail.indexOf('2026-12-07'));
  assert.equal(JSON.stringify([...context.profiles]), before);
});

test('跨赛事未知对手保留，整队难度缺失；同联赛来源ID不受中文译名差异影响', () => {
  const { context, standings } = fixture();
  const schedule = context.profiles.get('1').futureSchedule;
  schedule.currentMatch.awayTeamName = '乙的其他译名';
  assert.equal(buildRows(context, standings).find((row) => row['球队'] === '甲')['对手平均排名'], 19 / 9);
  schedule.matches[0].competitionName = '欧冠';
  schedule.matches[0].awayTeamId = 'external-team';
  schedule.matches[0].awayTeamName = '外部对手';
  const row = buildRows(context, standings).find((item) => item['球队'] === '甲');
  assert.equal(row['比赛数'], 9);
  assert.equal(row['对手平均排名'], null);
  assert.equal(row['排名'], null);
  assert.match(Object.values(row).at(-1), /欧冠.*外部对手.*排名缺失/);
});

test('相同比赛去重；冲突、缺失画像、错误身份及积分榜缺项报错', () => {
  const { context, standings } = fixture();
  const schedule = context.profiles.get('1').futureSchedule;
  schedule.matches.push({ ...schedule.currentMatch });
  assert.equal(buildRows(context, standings).find((row) => row['球队'] === '甲')['比赛数'], 9);
  schedule.matches.at(-1).startTime = '2026-11-29 12:00:00';
  assert.throws(() => buildRows(context, standings), /冲突/);
  schedule.matches.pop();
  assert.throws(() => buildRows(context, standings.slice(1)), /完整关联/);
  context.profiles.get('2').season = '2025-2026';
  assert.throws(() => buildRows(context, standings), /赛季不符/);
  context.profiles.delete('2');
  assert.throws(() => buildRows(context, standings), /画像/);
});

test('无场数限制参数，不再接受next或轮次筛选', () => {
  const base = ['--league', 'laLiga', '--season', '2026-2027'];
  assert.equal(parseOptions(base).next, undefined);
  assert.throws(() => parseOptions([...base, '--next', '5']));
  assert.throws(() => parseOptions([...base, '--round', '5']));
  assert.throws(() => parseOptions(['--league', 'laLiga']));
});
