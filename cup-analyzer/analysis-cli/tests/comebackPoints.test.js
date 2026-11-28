const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { analyzeEvents } = require('../src/aggregators/comebackPoints');
const { buildReport } = require('../src/aggregators');
const { tableRows, writeReport } = require('../src/renderers');
const { parseOptions } = require('../src/cli/options');

function events(scores) {
  return scores.map(([home, away]) => ({ type: 'goal', score: { home, away } }));
}

function data(scores, final) {
  return { matchId: '11', homeName: '甲', awayName: '乙', events: [...events(scores), { process: 'FullTime', score: { home: final[0], away: final[1] } }] };
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(__dirname, '.comeback-'));
  t.after(() => {
    assert.equal(path.dirname(root), __dirname);
    fs.rmSync(root, { recursive: true, force: true });
  });
  const teams = [{ id: '1', name: '甲', aliases: ['甲别名'] }, { id: '2', name: '乙' }];
  const directories = new Map(teams.map((team) => [team.id, path.join(root, team.id)]));
  const context = { league: 'laLiga', season: '2026-2027', shortSeason: '26-27', directory: root, teams, directories, matches: new Map(), scheduleFile: 's31.js', scheduleHash: 'test' };
  const fileFor = (team, id) => path.join(directories.get(team), 'basicData/26-27', id, 'matchEvents.json');
  function write(team, id, content) {
    const file = fileFor(team, id);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(content));
  }
  function add(id, round, scores, final) {
    context.matches.set(id, { id, round, homeId: '1', awayId: '2', status: -1, time: `2026-09-0${round} 20:00`, timestamp: round, score: final.join('-') });
    const content = { ...data(scores, final), matchId: id };
    write('1', id, content);
    write('2', id, content);
  }
  const options = parseOptions(['--league', 'laLiga', '--season', '2026-2027', '--metrics', 'comebackPoints']);
  const build = (extra = {}) => buildReport(context, { matches: [], inputs: [], quality: [] }, { teamMatches: [], playerMatches: [], quality: [] }, { ...options, ...extra });
  return { context, add, build, write, fileFor };
}

test('双方落后、追平、逆转、领先后被逆转按终场一次计分，零比分有效', (t) => {
  const f = fixture(t);
  f.add('11', 1, [[0, 1], [1, 1]], [1, 1]);
  f.add('12', 2, [[1, 0], [1, 1], [1, 2]], [1, 2]);
  f.add('13', 3, [[0, 1], [1, 1], [2, 1], [2, 2], [3, 2]], [3, 2]);
  f.add('14', 4, [], [0, 0]);
  f.add('15', 5, [[1, 0], [1, 1]], [1, 1]);
  const report = f.build();
  const ranking = report.teams.rankings.comebackPoints;
  assert.equal(report.players.rankings.comebackPoints, undefined);
  assert.deepEqual(ranking.items.map((row) => [row.id, row.value]), [['1', 4], ['2', 4]]);
  assert.deepEqual(ranking.items.map((row) => row.rank), [1, 1]);
  assert.equal(ranking.details.length, 4);
  for (const item of ranking.items) {
    assert.equal(item.value, item.recoveredDraws + item.recoveredWins * 3);
    assert.equal(item.behindCount, item.recoveredDraws + item.recoveredWins + item.lostFromBehind);
    assert.equal(item.validSamples, 5);
    assert.equal(item.missingSamples, 0);
  }
  assert.equal(f.build({ team: '1', last: 1 }).teams.rankings.comebackPoints.items[0].value, 0);
  assert.equal(f.build({ team: '2', roundRange: { start: 2, end: 2 } }).teams.rankings.comebackPoints.items[0].value, 3);
  assert.equal(f.build({ team: '1', from: '2026-09-03', to: '2026-09-03' }).teams.rankings.comebackPoints.items[0].value, 3);
  const directory = writeReport(f.context, report);
  const base = path.join(directory, 'teams/comebackPoints/comebackPoints');
  assert.deepEqual(JSON.parse(fs.readFileSync(base + '.json', 'utf8')), tableRows('teams', ranking));
  const md = fs.readFileSync(base + '.md', 'utf8');
  assert(md.includes('## 追回分数比赛明细'));
  assert(md.includes('| 甲 | 13 | 3 |'));
  const html = fs.readFileSync(base + '.html', 'utf8');
  const embedded = JSON.parse(html.match(/<script id="ranking-data" type="application\/json">(.*?)<\/script>/s)[1]);
  assert.deepEqual(embedded.rows, tableRows('teams', ranking));
  assert(!html.includes('追回分数比赛明细'));
});

test('完整进球过程校验拒绝跳分、重复、缺终场、半场冲突及非法比分', () => {
  const match = { score: '1-1' };
  const invalid = [
    data([], [1, 1]),
    data([[0, 2], [1, 2]], [1, 2]),
    data([[1, 0], [1, 0]], [1, 0]),
    data([[1, 1]], [1, 1]),
    { events: events([[1, 0]]) },
    data([[0.5, 0]], [0.5, 0]),
    data([[-1, 0]], [-1, 0]),
    { events: [{ process: 'HalfTime', score: { home: 1, away: 0 } }, ...data([[1, 0], [1, 1]], [1, 1]).events] },
    { events: [...data([[1, 0]], [1, 0]).events, ...events([[1, 1]])] },
  ];
  for (const content of invalid) assert.throws(() => analyzeEvents(content, match));
  assert.throws(() => analyzeEvents(data([[1, 0]], [1, 0]), match), /赛程/);
  const valid = data([[1, 0], [1, 1]], [1, 1]);
  valid.events.splice(1, 0, { process: 'HalfTime', score: { home: 1, away: 0 } });
  assert.equal(analyzeEvents(valid, match).awayBehind, true);
  assert.equal(analyzeEvents(data([], [0, 0]), { score: '0-0' }).homeBehind, false);
});

test('单副本可用且不依赖技术统计，双副本冲突或损坏不擅自选值', (t) => {
  const f = fixture(t);
  f.add('11', 1, [[0, 1], [1, 1]], [1, 1]);
  fs.unlinkSync(f.fileFor('2', '11'));
  assert.equal(f.build().teams.rankings.comebackPoints.items[0].value, 1);
  const alias = data([[0, 1], [1, 1]], [1, 1]);
  alias.homeName = '甲别名';
  f.write('2', '11', alias);
  assert.equal(f.build().teams.rankings.comebackPoints.items[0].value, 1);
  f.write('2', '11', data([[1, 0], [1, 1]], [1, 1]));
  assert(f.build().teams.rankings.comebackPoints.missing.every((row) => row.reason.includes('副本冲突')));
  fs.writeFileSync(f.fileFor('2', '11'), '{');
  assert.equal(f.build().teams.rankings.comebackPoints.items[0].validSamples, 0);
  f.write('2', '11', { ...data([[0, 1], [1, 1]], [1, 1]), matchId: '12' });
  assert(f.build().missingData.every((row) => row.reason.includes('ID')));
  f.write('2', '11', { ...data([[0, 1], [1, 1]], [1, 1]), homeName: '错误队名' });
  assert(f.build().missingData.every((row) => row.reason.includes('身份')));
});

test('缺失比赛不补零，无有效样本不排名，待补清单仅写MD并汇入索引', (t) => {
  const f = fixture(t);
  f.add('11', 1, [], [1, 1]);
  const report = f.build();
  const ranking = report.teams.rankings.comebackPoints;
  for (const row of ranking.items) {
    assert.equal(row.value, undefined);
    assert.equal(row.rank, undefined);
    assert.equal(row.missingSamples, 1);
  }
  assert.equal(tableRows('teams', ranking)[0]['落后场次'], null);
  const directory = writeReport(f.context, report);
  const base = path.join(directory, 'teams/comebackPoints/comebackPoints');
  assert(fs.readFileSync(base + '.md', 'utf8').includes('半场或终场比分与进球过程不一致'));
  assert(fs.readFileSync(path.join(directory, 'teams/README.md'), 'utf8').includes('半场或终场比分与进球过程不一致'));
  assert(!fs.readFileSync(base + '.json', 'utf8').includes('reason'));
  fs.unlinkSync(f.fileFor('1', '11'));
  fs.unlinkSync(f.fileFor('2', '11'));
  assert(f.build().missingData.every((row) => row.reason.includes('缺少事件文件')));
  f.add('12', 2, [], [0, 0]);
  assert.equal(f.build().teams.rankings.comebackPoints.items[0].value, 0);
  assert.equal(f.build().teams.rankings.comebackPoints.items[0].missingSamples, 1);
});

test('领先丢分按终场平局丢2、输球丢3计一次，升序并列且不改变追回分数', (t) => {
  const f = fixture(t);
  f.add('11', 1, [[1, 0], [1, 1]], [1, 1]);
  f.add('12', 2, [[0, 1], [1, 1], [2, 1]], [2, 1]);
  f.add('13', 3, [[1, 0], [1, 1], [1, 2], [2, 2]], [2, 2]);
  f.add('14', 4, [[1, 0], [1, 1], [2, 1]], [2, 1]);
  f.add('15', 5, [], [0, 0]);
  const options = { metrics: ['pointsDropped', 'comebackPoints'] };
  const report = f.build(options);
  const ranking = report.teams.rankings.pointsDropped;
  assert.deepEqual(ranking.items.map((row) => [row.id, row.value, row.rank]), [['1', 4, 1], ['2', 5, 2]]);
  assert.equal(report.players.rankings.pointsDropped, undefined);
  assert.deepEqual(report.teams.rankings.comebackPoints.items.map((row) => [row.id, row.value]), [['1', 4], ['2', 2]]);
  for (const row of ranking.items) {
    assert.equal(row.value, row.droppedDraws * 2 + row.droppedLosses * 3);
    assert.equal(row.leadingCount, row.droppedDraws + row.droppedLosses + row.retainedWins);
    assert.equal(row.validSamples, 5);
  }
  assert.equal(ranking.details.length, 4);
  assert.equal(f.build({ ...options, team: '2', roundRange: { start: 2, end: 2 } }).teams.rankings.pointsDropped.items[0].value, 3);
  assert.equal(f.build({ ...options, team: '1', last: 1 }).teams.rankings.pointsDropped.items[0].value, 0);
  const draw = f.build({ ...options, from: '2026-09-03', to: '2026-09-03' }).teams.rankings.pointsDropped;
  assert.deepEqual(draw.items.map((row) => [row.value, row.rank]), [[2, 1], [2, 1]]);
  const directory = writeReport(f.context, report);
  const base = path.join(directory, 'teams/pointsDropped/pointsDropped');
  const rows = tableRows('teams', ranking);
  assert.deepEqual(JSON.parse(fs.readFileSync(base + '.json', 'utf8')), rows);
  const html = fs.readFileSync(base + '.html', 'utf8');
  assert.deepEqual(JSON.parse(html.match(/<script id="ranking-data" type="application\/json">(.*?)<\/script>/s)[1]).rows, rows);
  assert(!html.includes('领先丢分比赛明细'));
  const md = fs.readFileSync(base + '.md', 'utf8');
  assert(md.includes('## 领先丢分比赛明细'));
  assert(md.includes('| 乙 | 12 | 2 |'));
});

test('领先丢分缺失不补零、无样本不排名，复用独立事件副本校验和待补输出', (t) => {
  const f = fixture(t);
  f.add('11', 1, [], [1, 1]);
  const options = { metrics: ['pointsDropped'] };
  let report = f.build(options);
  for (const row of report.teams.rankings.pointsDropped.items) {
    assert.equal(row.value, undefined);
    assert.equal(row.rank, undefined);
    assert.equal(row.missingSamples, 1);
  }
  assert.equal(tableRows('teams', report.teams.rankings.pointsDropped)[0]['领先场次'], null);
  const directory = writeReport(f.context, report);
  assert(fs.readFileSync(path.join(directory, 'teams/pointsDropped/pointsDropped.md'), 'utf8').includes('半场或终场比分与进球过程不一致'));
  assert(fs.readFileSync(path.join(directory, 'teams/README.md'), 'utf8').includes('pointsDropped'));
  f.write('1', '11', data([[1, 0], [1, 1]], [1, 1]));
  fs.unlinkSync(f.fileFor('2', '11'));
  report = f.build(options);
  assert.deepEqual(report.teams.rankings.pointsDropped.items.map((row) => [row.id, row.value]), [['2', 0], ['1', 2]]);
  f.write('2', '11', data([[0, 1], [1, 1]], [1, 1]));
  assert(f.build(options).missingData.every((row) => row.reason.includes('副本冲突')));
});
