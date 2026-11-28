const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { metricIds, selectKeyPlayers, readStartingXI, buildComparison } = require('../src/keyPlayerStarts');
const { metricsFor } = require('../src/metrics');

function inputsFixture() {
  return Object.fromEntries(metricIds.map((id) => {
    const field = metricsFor('players', [id])[0].label;
    return [id, [
      { '球员ID': '1', '球员': '甲', '球队ID': '10', [field]: 5 },
      { '球员ID': '2', '球员': '乙', '球队ID': '10', [field]: 5 },
    ]];
  }));
}

test('各项最高值并列全取，同一球员合并八项指标；真实零也参与并列', () => {
  const inputs = inputsFixture();
  const selected = selectKeyPlayers(inputs, ['10'], new Map()).get('10');
  assert.equal(selected.players.size, 2);
  assert.equal(selected.players.get('1').metrics.length, 8);
  assert.ok(selected.players.get('1').metrics.includes('争顶成功：5'));
  assert.ok(selected.players.get('1').metrics.includes('拦截：5'));
  assert.ok(selected.players.get('1').metrics.includes('封堵：5'));
  assert.match(selected.players.get('1').metrics[0], /进球/);
  for (const rows of Object.values(inputs)) {
    const field = Object.keys(rows[0]).at(-1);
    for (const row of rows) row[field] = 0;
  }
  assert.equal(selectKeyPlayers(inputs, ['10'], new Map()).get('10').players.size, 2);
});

test('跨队合计不冒充本队值，拆分后重新选择各队第一；缺失不补零', () => {
  const inputs = inputsFixture();
  const split = new Map(['10', '20'].map((teamId) => [teamId, Object.fromEntries(metricIds.map((id) => [id, { items: [{ id: '3', value: 2 }] }]))]));
  for (const id of metricIds) {
    const field = metricsFor('players', [id])[0].label;
    inputs[id].push({ '球员ID': '3', '球员': '跨队球员', '球队ID': '10,20', [field]: 100 });
  }
  const selected = selectKeyPlayers(inputs, ['10', '20'], split);
  assert.ok(!selected.get('10').players.has('3'));
  assert.equal(selected.get('20').players.get('3').metrics.length, 8);
  assert.ok(selected.get('20').players.get('3').metrics.every((value) => value.endsWith('：2')));
  inputs.goals[0][metricsFor('players', ['goals'])[0].label] = null;
  assert.equal(selectKeyPlayers(inputs, ['10', '20'], split).get('10').issues.length, 1);
});

test('拦截、争顶成功和封堵各选本队第一人，并列及同人多项合并', () => {
  const inputs = inputsFixture();
  inputs.interceptions = [
    { '球员ID': '3', '球员': '拦截第一', '球队ID': '10', '拦截': 12 },
    { '球员ID': '4', '球员': '并列第一', '球队ID': '10', '拦截': 12 },
  ];
  inputs.shotsBlocked = [
    { '球员ID': '3', '球员': '拦截第一', '球队ID': '10', '封堵': 8 },
    { '球员ID': '4', '球员': '并列第一', '球队ID': '10', '封堵': 7 },
  ];
  inputs.headersWon = [
    { '球员ID': '5', '球员': '争顶第一', '球队ID': '10', '争顶成功': 20 },
  ];
  const selected = selectKeyPlayers(inputs, ['10'], new Map()).get('10');
  assert.deepEqual(selected.players.get('3').metrics, ['拦截：12', '封堵：8']);
  assert.deepEqual(selected.players.get('4').metrics, ['拦截：12']);
  assert.deepEqual(selected.players.get('5').metrics, ['争顶成功：20']);
  inputs.shotsBlocked[0]['封堵'] = null;
  inputs.shotsBlocked[1]['封堵'] = null;
  const missing = selectKeyPlayers(inputs, ['10'], new Map()).get('10');
  assert.ok([...missing.players.values()].every((player) => player.metrics.every((value) => !value.startsWith('封堵：'))));
  assert.ok(missing.issues.some((issue) => issue.includes('封堵：没有有效球员数据')));
});

test('首发/不首发正确处理主客比分和胜平负积分，未知首发不归为不首发', () => {
  const players = [{ id: '1', name: '甲', metrics: ['进球：5'] }];
  const games = [
    { match: { homeId: '10', awayId: '20', score: '2-0' }, starters: new Set(['1']) },
    { match: { homeId: '20', awayId: '10', score: '1-1' }, starters: new Set(['2']) },
    { match: { homeId: '10', awayId: '20', score: '0-1' }, starters: new Set(['2']) },
    { match: { homeId: '10', awayId: '20', score: '9-0' }, issue: '名单缺失' },
  ];
  const rows = buildComparison('10', players, games);
  assert.deepEqual(rows.map((row) => ['首发情况', '场次', '胜', '平', '负', '进', '失', '净', '积分'].map((key) => row[key])), [
    ['首发', 1, 1, 0, 0, 2, 0, 2, 3],
    ['不首发', 2, 0, 1, 1, 1, 2, -1, 1],
  ]);
  assert.equal(buildComparison('10', players, [games[1]])[0]['场次'], 0);
});

test('真实11人首发按球员ID判断，副本只算一场；不完整、冲突和身份错误均为未知', (t) => {
  const root = fs.mkdtempSync(path.join(__dirname, '.key-starts-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), __dirname);
    fs.rmSync(root, { recursive: true, force: true });
  });
  const directories = new Map(['10', '20'].map((id) => [id, path.join(root, id)]));
  const context = { shortSeason: '26-27', directories, teams: [{ id: '10', name: '主队' }, { id: '20', name: '客队' }] };
  const match = { id: '100', homeId: '10', awayId: '20' };
  const data = { matchId: 100, homeName: '主队', awayName: '客队', homeStarting: Array.from({ length: 11 }, (_, index) => ({ id: index + 1 })), guestStarting: Array.from({ length: 11 }, (_, index) => ({ id: index + 21 })) };
  const files = [...directories.values()].map((directory) => path.join(directory, 'basicData/26-27/100/lineup.json'));
  for (const file of files) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data));
  }
  assert.ok(readStartingXI(context, match, '10').starters.has('1'));
  assert.ok(readStartingXI(context, match, '20').starters.has('21'));
  data.homeStarting[0].id = 99;
  fs.writeFileSync(files[1], JSON.stringify(data));
  assert.match(readStartingXI(context, match, '10').issue, /冲突/);
  data.homeStarting.pop();
  fs.writeFileSync(files[1], JSON.stringify(data));
  assert.match(readStartingXI(context, match, '10').issue, /11人/);
  data.matchId = 200;
  fs.writeFileSync(files[1], JSON.stringify(data));
  assert.match(readStartingXI(context, match, '10').issue, /比赛ID/);
});
