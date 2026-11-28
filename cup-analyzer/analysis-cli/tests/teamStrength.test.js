const test = require('node:test');
const assert = require('node:assert/strict');
const { buildRows } = require('../bin/teamStrength');
const { parseReportOptions, loadReportInputs } = require('../src/reportInputs');

function fixture() {
  return {
    standings: [
      { '球队': '乙', '名次': 2, '积分': 9, '胜': 3 },
      { '球队': '甲', '名次': 1, '积分': 10, '胜': 3 },
      { '球队': '丙', '名次': 3, '积分': 3, '胜': 1 },
    ],
    homeStandings: [
      { '球队': '甲', '名次': 1, '胜': 1 },
      { '球队': '丙', '名次': 3, '胜': 0 },
      { '球队': '乙', '名次': 2, '胜': 2 },
    ],
  };
}

test('战力表按总积分榜排序，胜场并列，主场胜场排名独立于主场积分排名', () => {
  const inputs = fixture();
  const before = JSON.stringify(inputs);
  const rows = buildRows(inputs);
  assert.deepEqual(rows, [
    { '球队': '甲', '积分排名': 1, '胜场排名': 1, '主场胜场排名': 2, '积分': 10, '胜场': 3, '主场胜场': 1 },
    { '球队': '乙', '积分排名': 2, '胜场排名': 1, '主场胜场排名': 1, '积分': 9, '胜场': 3, '主场胜场': 2 },
    { '球队': '丙', '积分排名': 3, '胜场排名': 3, '主场胜场排名': 3, '积分': 3, '胜场': 1, '主场胜场': 0 },
  ]);
  assert.equal(JSON.stringify(inputs), before);
});

test('战力输入缺失、重复、关联冲突和无效数值均报错，不补零', () => {
  const mutations = [
    (input) => { delete input.standings[0]['积分']; },
    (input) => { input.standings[0]['名次'] = 1; },
    (input) => { input.homeStandings[0]['胜'] = null; },
    (input) => { input.homeStandings[0]['胜'] = -1; },
    (input) => { input.homeStandings.pop(); },
    (input) => { input.homeStandings.push(input.homeStandings[0]); },
    (input) => { input.homeStandings[0]['球队'] = '丁'; },
  ];
  for (const mutate of mutations) {
    const inputs = fixture();
    mutate(inputs);
    assert.throws(() => buildRows(inputs));
  }
});

test('公共参数将--round传递为现有build轮次范围，日期和范围互斥沿用原校验', () => {
  const base = ['--league', 'laLiga', '--season', '2026-2027'];
  const range = parseReportOptions([...base, '--round', '1-13']);
  assert.deepEqual(range.options.roundRange, { start: 1, end: 13 });
  assert.deepEqual(range.buildArgs, [...base, '--rounds', '1-13']);
  assert.deepEqual(parseReportOptions([...base, '--round', '13']).options.roundRange, { start: 13, end: 13 });
  assert.equal(parseReportOptions(base).options.scope, 'all-matches');
  assert.equal(parseReportOptions([...base, '--from', '2026-09-01', '--to', '2026-11-27']).options.scope, 'dates-2026-09-01_to_2026-11-27');
  for (const extra of [
    ['--round', '13-1'], ['--round', '0'], ['--from', '2026-09-01'],
    ['--from', '2026-02-30', '--to', '2026-11-27'],
    ['--round', '13', '--from', '2026-09-01', '--to', '2026-11-27'],
  ]) assert.throws(() => parseReportOptions([...base, ...extra]));
});

test('传入范围先调用build且仅更新所需指标，build失败不继续读取或生成报告', (t) => {
  const cli = require('../bin/cli');
  const calls = [];
  const failure = new Error('模拟build失败');
  t.mock.method(cli, 'main', (args) => {
    calls.push(args);
    throw failure;
  });
  const base = ['--league', 'laLiga', '--season', '2026-2027'];
  const cases = [
    { args: [...base, '--round', '1-13'], ids: ['standings', 'averageXg', 'averageShots', 'goalsMinusXg'], flags: ['--rounds', '1-13'] },
    { args: [...base, '--from', '2026-09-01', '--to', '2026-11-27'], ids: ['standings', 'homeStandings'], flags: ['--from', '2026-09-01', '--to', '2026-11-27'] },
  ];
  for (const item of cases) {
    assert.throws(() => loadReportInputs(item.args, item.ids), (error) => error === failure);
    assert.deepEqual(calls.at(-1), ['build', ...base, ...item.flags, '--metrics', item.ids.join(',')]);
  }
});
