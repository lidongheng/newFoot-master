const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  parseRound, parseOptions, settle, buildRanking, displayWidth, renderTrend, renderTable,
} = require('../utils/recentMarketRanking');

function match(id, time, home, away, score, handicap, total, status = -1) {
  return [id, 36, status, time, home, away, score, '', '', '', handicap, 0, total];
}

function data(rounds) {
  return { arrTeam: [[1, '甲队'], [2, '乙队'], [3, '丙队']], jh: rounds };
}

function options(market = 'asianHandicap', venue = 'all', round = 6) {
  return { market, venue, round };
}

test('round 默认为 6，仅接受一个正整数参数', () => {
  assert.equal(parseRound([]), 6);
  assert.equal(parseRound(['--round', '12']), 12);
  for (const args of [['--round'], ['--round', '0'], ['--round', '-1'], ['--round', '1.5'],
    ['--round', 'abc'], ['--round', '1', '--round', '2'], ['--round', '9007199254740992'], ['--unknown', '6']]) {
    assert.throws(() => parseRound(args));
  }
});

test('趋势默认隐藏，--trend 可独立使用或与 --round 前后组合', () => {
  assert.deepEqual(parseOptions([]), { round: 6, showTrend: false });
  assert.deepEqual(parseOptions(['--round', '3']), { round: 3, showTrend: false });
  assert.deepEqual(parseOptions(['--trend']), { round: 6, showTrend: true });
  assert.deepEqual(parseOptions(['--trend', '--round', '3']), { round: 3, showTrend: true });
  assert.deepEqual(parseOptions(['--round', '3', '--trend']), { round: 3, showTrend: true });
  assert.throws(() => parseOptions(['--trend', '--trend']), /重复/);
  assert.throws(() => parseOptions(['--trend', 'false']));
});

test('亚盘正负让球、平手、全赢全输、半赢半输和全走，客队反向', () => {
  const cases = [
    ['2-0', 1, 1], ['0-2', 1, -1], ['1-1', 0, 0], ['1-1', -0.5, 1],
    ['0-1', -0.5, -1], ['1-0', 0.75, 1], ['1-0', 1.25, -1],
    ['0-1', -1.25, 1], ['0-1', -0.75, -1], ['1-0', 1, 0],
  ];
  for (const [score, handicap, expected] of cases) {
    const row = match(1, '2026-11-01 12:00', 1, 2, score, handicap, '2.5');
    assert.equal(settle(row, 'asianHandicap', 1), expected);
    let awayExpected = -expected;
    if (expected === 0) {
      awayExpected = 0;
    }
    assert.equal(settle(row, 'asianHandicap', 2), awayExpected);
  }
});

test('大小球支持整球、半球、拆分盘口和数字字符串四分之一盘口', () => {
  const cases = [
    ['2-1', '2.5', 1], ['1-1', '2.5', -1], ['2-1', '3', 0],
    ['2-1', '2.5/3', 1], ['2-1', '3/3.5', -1],
    ['2-1', '2.75', 1], ['2-1', '3.25', -1], ['0-0', '0', 0],
  ];
  for (const [score, total, expected] of cases) {
    const row = match(1, '2026-11-01 12:00', 1, 2, score, 0, total);
    assert.equal(settle(row, 'overUnder', 1), expected);
    assert.equal(settle(row, 'overUnder', 2), expected);
  }
});

test('用户提供的曼城比赛结算为主输、客赢、小球', () => {
  const row = [3003956, 36, -1, '2026-11-21 20:30', 26, 29, '1-1', '0-1', '3', '15', 1.25, 0.5, '3/3.5'];
  assert.equal(settle(row, 'asianHandicap', 26), -1);
  assert.equal(settle(row, 'asianHandicap', 29), 1);
  assert.equal(settle(row, 'overUnder', 26), -1);
});

test('按实际时间取最近比赛，忽略未结束比赛，走势按最远到最近累计', () => {
  const source = data({
    R_9: [match(1, '2026-11-01 12:00', 1, 2, '1-0', 0, '2.5')],
    R_1: [match(2, '2026-11-03 12:00', 1, 2, '0-1', 0, '2.5')],
    R_2: [match(3, '2026-11-02 12:00', 1, 2, '1-0', 0, '2.5')],
    R_10: [match(4, '2026-11-04 12:00', 1, 2, '', null, '', 0)],
  });
  const result = buildRanking(source, options('asianHandicap', 'all', 2));
  const team = result.ranking.find((item) => item.teamId === 1);
  assert.deepEqual(team.matchIds, [3, 2]);
  assert.deepEqual(team.results, [1, -1]);
  assert.deepEqual(team.points, [0, 1, 0]);
  assert.deepEqual(result.excludedTeams, ['丙队']);
});

test('总、主、客场各自独立取 N 场，同一时间稳定取样', () => {
  const source = data({ R_1: [
    match(1, '2026-11-01 12:00', 1, 2, '1-0', 0, '2.5'),
    match(2, '2026-11-02 12:00', 2, 1, '1-0', 0, '2.5'),
    match(3, '2026-11-03 12:00', 1, 2, '1-0', 0, '2.5'),
    match(4, '2026-11-04 12:00', 2, 1, '1-0', 0, '2.5'),
  ] });
  for (const [venue, ids] of [['all', [3, 4]], ['home', [1, 3]], ['away', [2, 4]]]) {
    const team = buildRanking(source, options('asianHandicap', venue, 2)).ranking.find((item) => item.teamId === 1);
    assert.deepEqual(team.matchIds, ids);
  }
  source.jh.R_1[3][3] = source.jh.R_1[2][3];
  const team = buildRanking(source, options('asianHandicap', 'all', 1)).ranking.find((item) => item.teamId === 1);
  assert.deepEqual(team.matchIds, [3]);
});

test('不足 N 场按实际计算，走盘计入分母，排序并列遵循 arrTeam', () => {
  const source = data({ R_1: [
    match(1, '2026-11-01 12:00', 1, 2, '1-0', 0, '1'),
    match(2, '2026-11-02 12:00', 1, 2, '0-1', 0, '1'),
    match(3, '2026-11-03 12:00', 1, 2, '0-0', 0, '1'),
  ] });
  const { ranking } = buildRanking(source, options());
  assert.deepEqual(ranking.map((team) => team.teamId), [1, 2]);
  assert.equal(ranking[0].count, 3);
  assert.equal(ranking[0].winRate, 1 / 3);
  assert.equal(ranking[0].pushRate, 1 / 3);
  assert.equal(ranking[0].lossRate, 1 / 3);
  assert.match(renderTable(ranking, 'asianHandicap'), /33\.33%/);
  const totals = buildRanking(source, options('overUnder')).ranking;
  assert.equal(totals[0].pushes, 2);
  assert.equal(totals[0].losses, 1);
});

test('按赢盘率或大球率排序，与累计分无关', () => {
  const source = data({ R_1: [
    match(1, '2026-11-01 12:00', 1, 2, '0-1', 0, '0.5'),
    match(2, '2026-11-02 12:00', 1, 3, '0-1', 0, '2.5'),
  ] });
  assert.deepEqual(buildRanking(source, options()).ranking.map((team) => team.teamId), [2, 3, 1]);
  assert.deepEqual(buildRanking(source, options('overUnder')).ranking.map((team) => team.teamId), [2, 1, 3]);
});

test('缺盘口不补值、不用更早比赛替代，仅校验当前榜单所需盘口', () => {
  const source = data({ R_1: [
    match(1, '2026-11-01 12:00', 1, 2, '1-0', 0, '2.5'),
    match(2, '2026-11-02 12:00', 1, 2, '1-0', null, '2.5'),
  ] });
  assert.throws(() => buildRanking(source, options('asianHandicap', 'all', 1)), /比赛 2.*亚盘初盘\[10\]/);
  assert.doesNotThrow(() => buildRanking(source, options('overUnder')));
  source.jh.R_1[1][10] = 0;
  source.jh.R_1[0][10] = null;
  assert.doesNotThrow(() => buildRanking(source, options('asianHandicap', 'all', 1)));
});

test('非法比分、时间、球队、盘口明确报错', () => {
  const cases = [[6, '1:0', /比分/], [3, '2026-02-30 12:00', /时间/], [3, '', /时间/],
    [4, 99, /球队|主客队/], [10, '', /亚盘/], [10, '0', /亚盘/], [10, 0.1, /亚盘/],
    [12, '', /大小球/], [12, '2/3', /大小球/], [12, '2.5/2', /大小球/], [12, 'abc', /大小球/]];
  for (const [index, value, message] of cases) {
    const row = match(42, '2026-11-01 12:00', 1, 2, '1-0', 0, '2.5');
    row[index] = value;
    let market = 'asianHandicap';
    if (index === 12) {
      market = 'overUnder';
    }
    assert.throws(() => buildRanking(data({ R_1: [row] }), options(market)), message);
    assert.throws(() => buildRanking(data({ R_1: [row] }), options(market)), /比赛 42/);
  }
});

test('空赛程与零场球队不产生伪造百分比', () => {
  const result = buildRanking(data({ R_1: [] }), options());
  assert.deepEqual(result.ranking, []);
  assert.deepEqual(result.excludedTeams, ['甲队', '乙队', '丙队']);
  assert.throws(() => buildRanking(data({}), options()), /轮次/);
});

test('折线节点包含零点，连续升降、水平线及最终累计分正确', () => {
  const rising = renderTrend([0, 1, 2], 0, 2, 2);
  assert.deepEqual(rising, ['2 │    ●', '  │   ╱ ', '1 │  ●  ', '  │ ╱   ', '0 │●    ', '累计 2 分']);
  const falling = renderTrend([0, -1, -2], -2, 0, 2).join('\n');
  assert.equal((falling.match(/╲/g)).length, 2);
  assert.match(falling, /累计 -2 分/);
  assert.deepEqual(renderTrend([0, 0, 0], 0, 0, 2), ['0 │●─●─●', '累计 0 分']);
  const alternating = renderTrend([0, 1, 0, 0, 1], 0, 1, 4).join('\n');
  assert.equal((alternating.match(/●/g)).length, 5);
  assert.equal((alternating.match(/╱/g)).length, 2);
  assert.equal((alternating.match(/╲/g)).length, 1);
  assert.equal((alternating.match(/─/g)).length, 1);
  assert.equal((renderTrend([0, -1], -1, 1, 4).join('\n').match(/●/g)).length, 2);
});

test('表格按中文宽度对齐，所有球队使用统一纵轴，零点全走仍显示', () => {
  const source = data({ R_1: [match(1, '2026-11-01 12:00', 1, 2, '1-0', 0, '2.5')] });
  source.arrTeam[1][1] = 'A队';
  const { ranking } = buildRanking(source, options());
  const table = renderTable(ranking, 'asianHandicap', true);
  const lines = table.split('\n');
  assert.equal(new Set(lines.map(displayWidth)).size, 1);
  assert.equal((table.match(/ 1 │/g)).length >= 2, true);
  assert.equal((table.match(/-1 │/g)).length, 2);
  assert.equal(displayWidth('中Aé'), 4);
  assert.equal(displayWidth('e\u0301'), 1);
  assert.match(renderTable(ranking, 'overUnder'), /大球率/);
  const compact = renderTable(ranking, 'asianHandicap');
  assert.doesNotMatch(compact, /趋势|累计|●|╱|╲/);
  assert.equal(new Set(compact.split('\n').map(displayWidth)).size, 1);
  assert.equal(compact.split('\n').filter((line) => line.startsWith('│')).length, ranking.length + 1);
});

test('命令行错误退出码非零，不默默回退到默认赛事', () => {
  const script = path.resolve(__dirname, '../processors/asianHandicapRanking.js');
  for (const [slug, args, message] of [
    ['', [], /指定已配置的联赛/], ['unknown', [], /指定已配置的联赛/],
    ['championsLeague', [], /不支持杯赛/], ['eliteSerien', [], /赛程文件不存在/],
    ['epl', ['--round', '0'], /正整数/],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], {
      encoding: 'utf8', env: { ...process.env, CUP_ANALYZER_CUP: slug },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
  }
});
