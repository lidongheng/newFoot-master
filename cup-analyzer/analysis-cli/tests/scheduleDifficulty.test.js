const test = require('node:test');
const assert = require('node:assert/strict');
const { parseOptions, buildRows } = require('../bin/scheduleDifficulty');

function fixture() {
  const teams = ['甲', '乙', '丙', '丁', '戊'].map((name, index) => ({ id: String(index + 1), name }));
  const standings = teams.map((team, index) => ({ '球队': team.name, '名次': index + 1 }));
  const game = (id, awayId, timestamp, status, round) => ({ id, homeId: '1', awayId, timestamp, status, round, time: `时间${timestamp}` });
  const matches = new Map([
    game('1', '4', 130, 0, 1),
    game('2', '3', 110, 0, 9),
    game('3', '2', 120, 0, 2),
    game('4', '4', 101, 1, 3),
    game('5', '4', 102, -1, 4),
    game('6', '4', 99, 0, 5),
    game('7', '4', 100, 0, 6),
    game('8', '4', 103, '0', 7),
  ].map((match) => [match.id, match]));
  return { context: { teams, matches }, standings };
}

test('按未来时间取N场，严格筛选状态0；按对手实际场数平均，越低排名越靠前', () => {
  const { context, standings } = fixture();
  const before = JSON.stringify([...context.matches]);
  const rows = buildRows(context, standings, 2, 100);
  assert.deepEqual(rows.map((row) => [row['球队'], row['排名'], row['比赛数'], row['对手平均排名']]), [
    ['乙', 1, 1, 1], ['丙', 1, 1, 1], ['丁', 1, 1, 1], ['甲', 4, 2, 2.5], ['戊', null, 0, null],
  ]);
  const detail = rows.find((row) => row['球队'] === '甲')['未来赛程（对手/积分排名/时间/主客）'];
  assert.ok(detail.indexOf('丙') < detail.indexOf('乙'));
  assert.ok(!detail.includes('丁'));
  assert.match(detail, /第3名.*时间110.*主/);
  assert.match(rows[0]['未来赛程（对手/积分排名/时间/主客）'], /甲.*客/);
  assert.equal(JSON.stringify([...context.matches]), before);
});

test('自定义N改变取样，无未来场次不计算排名；不舍入计算结果', () => {
  const { context, standings } = fixture();
  assert.equal(buildRows(context, standings, 1, 100).find((row) => row['球队'] === '甲')['对手平均排名'], 3);
  const all = buildRows(context, standings, 5, 100).find((row) => row['球队'] === '甲');
  assert.equal(all['比赛数'], 3);
  assert.equal(all['对手平均排名'], 3);
  context.matches.get('3').awayId = '3';
  assert.equal(buildRows(context, standings, 5, 100).find((row) => row['球队'] === '甲')['对手平均排名'], 10 / 3);
  assert.ok(buildRows(context, standings, 5, 1000).every((row) => row['排名'] === null && row['对手平均排名'] === null));
});

test('总积分榜缺失、球队重复、无效名次或未来对手无效时明确报错', () => {
  const { context, standings } = fixture();
  assert.throws(() => buildRows(context, standings.slice(1), 5, 100));
  assert.throws(() => buildRows(context, [...standings, standings[0]], 5, 100));
  const invalid = standings.map((row) => ({ ...row }));
  invalid[0]['名次'] = 2;
  assert.throws(() => buildRows(context, invalid, 5, 100));
  context.matches.get('1').awayId = '999';
  assert.throws(() => buildRows(context, standings, 5, 100));
});

test('参数默认未来5场，支持自定义N，拒绝无效参数', () => {
  const base = ['--league', 'laLiga', '--season', '2026-2027'];
  assert.equal(parseOptions(base).next, 5);
  assert.equal(parseOptions([...base, '--next', '8']).next, 8);
  for (const value of ['0', '-1', '1.5', 'abc', '9007199254740992']) assert.throws(() => parseOptions([...base, '--next', value]));
  assert.throws(() => parseOptions(['--league', 'laLiga']));
  assert.throws(() => parseOptions([...base, '--round', '5']));
});
