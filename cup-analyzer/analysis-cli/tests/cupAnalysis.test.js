'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { initializeLeague } = require('../../crawler-server/processors/teamAgentInitializer');
const { readSchedule, collectTeamMatches } = require('../../crawler-server/utils/teamAgent');
const { validateSchedule } = require('../../crawler-server/crawlers/scheduleCrawler');
const { loadContext, readMatches } = require('../src/sources');
const { parseOptions } = require('../src/cli/options');
const { selectMatches } = require('../src/aggregators');
const { readRows } = require('../bin/sameOpeningHandicap');
const { buildReview } = require('../bin/matchReview');
const { importData } = require('../../crawler-server/processors/teamAgentDataImporter');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(__dirname, '.cup-analysis-'));
  t.after(() => {
    assert.equal(path.dirname(directory), __dirname);
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const scheduleFile = path.join(directory, 'c103.js');
  const row = (id, home, away, score) => [id, 103, -1, '2026-11-01 12:00:00', home, away, score, '1-0', '', '', 0.25];
  const group = row(11, 1, 2, '2-0');
  const first = row(12, 1, 2, '1-1');
  const second = row(13, 2, 1, '0-0');
  const data = `var arrCup=[103,'','','','','','','2026-2027'];
var arrCupKind=[[100,0,'资格赛'],[200,1,'联赛阶段'],[300,0,'16强']];
var arrTeam=[[1,'甲','','A'],[2,'乙','','B'],[3,'资格赛球队','','C']];
jh.G100=[${JSON.stringify(row(10, 3, 1, '0-1'))}];
jh.G200A=[${JSON.stringify(group)}];
jh.S200A=[[1,1,1,1,0,0,2,0,2,3]];
jh.G300=[[1,2,0,0,${JSON.stringify(first)},${JSON.stringify(second)}]];`;
  fs.writeFileSync(scheduleFile, data);
  const league = { type: 'cup', cupSerial: '103', mainStageOnly: true, chineseName: '测试杯赛', paths: { cupAnalyzer: directory, cupScheduleData: scheduleFile } };
  assert.equal(initializeLeague('cupFixture', league).teams, 2);
  const context = loadContext({ league: 'cupFixture', season: '2026-2027' }, { cupFixture: league });
  return { directory, scheduleFile, data, league, context };
}

test('杯赛排除资格赛球队和比赛，递归读取两回合并忽略S积分榜', (t) => {
  const f = fixture(t);
  assert.equal(f.context.teams.length, 2);
  assert.deepEqual([...f.context.matches.keys()], ['11', '12', '13']);
  assert.equal(f.context.matches.get('12').stage, 'G300');
  assert.deepEqual([...selectMatches(f.context, { stage: 'G300' }).get('1')].sort(), ['12', '13']);
  const schedule = readSchedule(f.league);
  assert.deepEqual(collectTeamMatches(schedule, 'cup', '1').map((row) => row[0]), [11, 12, 13]);
  assert.ok(!fs.existsSync(path.join(f.directory, 'teamAgent/C')));
  assert.equal(readRows(f.scheduleFile).size, 4);
  assert.throws(() => loadContext({ league: 'cupFixture', season: '2026-2027', stage: 'G100' }, { cupFixture: f.league }), /不存在/);
});

test('杯赛使用真实G阶段，拒绝联赛轮次、国家队和不存在的阶段', (t) => {
  const f = fixture(t);
  const args = ['--league', 'championsLeague', '--season', '2026-2027'];
  assert.equal(parseOptions([...args, '--stage', 'G29090A']).stage, 'G29090A');
  assert.throws(() => parseOptions([...args, '--rounds', '5']), /杯赛/);
  assert.throws(() => parseOptions(['--league', 'theWorldCup', '--season', '2026']), /俱乐部/);
  assert.throws(() => loadContext({ league: 'cupFixture', season: '2026-2027', stage: 'G999' }, { cupFixture: f.league }), /不存在/);
  assert.throws(() => loadContext({ league: 'cupFixture', season: '2025-2026' }, { cupFixture: f.league }), /赛季/);
});

test('本场复盘读取basicData实际11人和阵型，保留缺项，不用预测阵容替代', (t) => {
  const f = fixture(t);
  const destination = path.join(f.context.directories.get('1'), 'basicData/26-27/11');
  fs.mkdirSync(destination, { recursive: true });
  const base = { matchId: 11, homeName: '甲', awayName: '乙' };
  const files = {
    'matchInfo.json': { ...base, stateCode: -1, postMatchSummary: '' },
    'matchEvents.json': { ...base, events: [{ time: '90+2', process: 'FullTime', score: { home: 2, away: 0 } }] },
    'techStats.json': { ...base, fullMatch: { 射门: { home: 10, away: 2, kind: 'SHOOT' }, 控球: { home: 150, away: 10, kind: 'CONTROL_PERCENT' } } },
    'lineup.json': { ...base, homeFormation: '4-3-3', guestFormation: '4-4-2', homeStarting: Array.from({ length: 11 }, (_, i) => ({ id: i + 1, name: '主' + i, number: String(i + 1) })), guestStarting: Array.from({ length: 11 }, (_, i) => ({ id: i + 21, name: '客' + i, number: String(i + 21) })), homeSubs: [], guestSubs: [] },
  };
  for (const [name, value] of Object.entries(files)) fs.writeFileSync(path.join(destination, name), JSON.stringify(value));
  const report = buildReview(f.context, '11');
  assert.match(report.text, /实际首发：甲（4-3-3）/);
  assert.match(report.text, /90\+2/);
  assert.match(report.text, /数据源未提供赛后摘要/);
  assert.ok(report.issues.some((issue) => issue.includes('控球')));
  assert.equal(readMatches({ ...f.context, matches: new Map([['11', f.context.matches.get('11')]]) }, path.join(f.directory, 'history')).matches.length, 1);
  files['lineup.json'].homeStarting.pop();
  fs.writeFileSync(path.join(destination, 'lineup.json'), JSON.stringify(files['lineup.json']));
  assert.throws(() => buildReview(f.context, '11'), /实际首发不可用/);
});

test('赛程同步拒绝HTML、错误ID和错误赛季，保留合法赛程', (t) => {
  const f = fixture(t);
  const target = { type: 'cup', cupSerial: '103', season: '2026-2027' };
  assert.equal(validateSchedule(f.data, target).arrTeam.length, 3);
  assert.throws(() => validateSchedule('<html>error</html>', target), /HTML/);
  assert.throws(() => validateSchedule(f.data, { ...target, cupSerial: '2187' }), /不符/);
  assert.throws(() => validateSchedule(f.data, { ...target, season: '2025-2026' }), /不符/);
});

test('旧赛事数据离线导入只写缺少的主队目录，重跑不覆盖且拒绝资格赛', (t) => {
  const f = fixture(t);
  const source = path.join(f.directory, 'basicData/26-27/G200A/a-vs-b');
  fs.mkdirSync(source, { recursive: true });
  const base = { matchId: 11, homeName: '甲', awayName: '乙' };
  const data = {
    'matchInfo.json': { ...base, stateCode: -1 },
    'matchEvents.json': { ...base, events: [{ process: 'FullTime', score: { home: 2, away: 0 } }] },
    'techStats.json': { ...base, fullMatch: { 射门: { home: 4, away: 1 } } },
  };
  for (const [name, value] of Object.entries(data)) fs.writeFileSync(path.join(source, name), JSON.stringify(value));
  const registry = { cupFixture: f.league };
  assert.deepEqual(importData('cupFixture', registry).imported, ['11']);
  const target = path.join(f.context.directories.get('1'), 'basicData/26-27/11/matchInfo.json');
  const before = fs.readFileSync(target, 'utf8');
  assert.deepEqual(importData('cupFixture', registry).skipped, ['11']);
  assert.equal(fs.readFileSync(target, 'utf8'), before);
  const infoFile = path.join(source, 'matchInfo.json');
  fs.writeFileSync(infoFile, JSON.stringify({ ...base, matchId: 10, stateCode: -1 }));
  const result = importData('cupFixture', registry);
  assert.equal(result.imported.length, 0);
  assert.match(result.blocked[0].reason, /不在本赛季/);
  assert.equal(JSON.parse(fs.readFileSync(infoFile, 'utf8')).matchId, 10);
});
