const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { buildRows, main } = require('../bin/xgStory');
const { markdown, html } = require('../src/renderers');

function fixture() {
  return {
    standings: [{ '名次': 2, '球队': '乙' }, { '名次': 1, '球队': '甲' }],
    averageXg: [{ '球队': '乙', '排名': null, '场均 xG': null }, { '球队': '甲', '排名': 1, '场均 xG': 0 }],
    averageShots: [{ '球队': '甲', '排名': 1, '场均射门': 12.5 }, { '球队': '乙', '排名': 2, '场均射门': 9 }],
    goalsMinusXg: [{ '球队': '乙', '排名': 2, '实际进球 − xG': -2.25 }, { '球队': '甲', '排名': 1, '实际进球 − xG': 1.2 }],
  };
}

test('以积分榜排序和球队名关联，保留零、负值、缺失值，不改变输入', () => {
  const inputs = fixture();
  const before = JSON.stringify(inputs);
  assert.deepEqual(buildRows(inputs), [
    { '名次': 1, '球队': '甲', '场均xG排名': 1, '场均射门排名': 1, '实际进球-xG排名': 1, '场均xG': 0, '场均射门': 12.5, '实际进球-xG': 1.2 },
    { '名次': 2, '球队': '乙', '场均xG排名': null, '场均射门排名': 2, '实际进球-xG排名': 2, '场均xG': null, '场均射门': 9, '实际进球-xG': -2.25 },
  ]);
  assert.equal(JSON.stringify(inputs), before);
});

test('拒绝缺少字段、非数值、重复球队、关联不全和无效名次', () => {
  const mutations = [
    (input) => { delete input.averageXg[0]['场均 xG']; },
    (input) => { delete input.averageXg[0]['排名']; },
    (input) => { input.averageShots[0]['排名'] = 0; },
    (input) => { input.averageShots[0]['场均射门'] = '12'; },
    (input) => { input.averageShots.push(input.averageShots[0]); },
    (input) => { input.goalsMinusXg.pop(); },
    (input) => { input.averageXg[0]['球队'] = '丙'; },
    (input) => { input.standings[0]['名次'] = 1; },
    (input) => { input.standings = []; },
  ];
  for (const mutate of mutations) {
    const input = fixture();
    mutate(input);
    assert.throws(() => buildRows(input));
  }
  assert.throws(() => main(['--league', 'laLiga']));
  assert.throws(() => main(['--league', '../laLiga', '--season', '2026-2027']));
});

test('MD两位小数与缺失展示，HTML保留数值并提供展示格式', () => {
  const rows = buildRows(fixture());
  const columns = Object.keys(rows[0]);
  const options = { decimalColumns: columns.slice(5), description: '西甲 · 2026-2027；来源：JSON' };
  assert.match(markdown(rows, columns, options), /甲 \| 1 \| 1 \| 1 \| 0\.00 \| 12\.50 \| 1\.20/);
  assert.match(markdown(rows, columns, options), /乙 \| 缺失 \| 2 \| 2 \| 缺失 \| 9\.00 \| -2\.25/);
  const page = html('xG告诉我们的故事', rows, columns, '../../../shared-assets/', options);
  const data = JSON.parse(page.match(/<script id="ranking-data" type="application\/json">(.*?)<\/script>/s)[1]);
  assert.deepEqual(data.rows, rows);
  assert.match(page, /来源：JSON/);
  assert.match(page, /scope\.row\[column\]\.toFixed\(2\)/);
  assert.match(page, /sortable/);
});

test('实际报告逐队对应四项源JSON，MD与HTML一致，静态资源存在', () => {
  const root = path.resolve(__dirname, '../../laLiga');
  const source = path.join(root, 'leagueRanking/26-27/teams');
  const inputs = {};
  for (const id of ['standings', 'averageXg', 'averageShots', 'goalsMinusXg']) {
    inputs[id] = JSON.parse(fs.readFileSync(path.join(source, id, id + '.json'), 'utf8'));
  }
  const destination = path.join(root, 'teamAgent');
  const page = fs.readFileSync(path.join(destination, 'xG告诉我们的故事.html'), 'utf8');
  const data = JSON.parse(page.match(/<script id="ranking-data" type="application\/json">(.*?)<\/script>/s)[1]);
  assert.deepEqual(data.rows, buildRows(inputs));
  const md = fs.readFileSync(path.join(destination, 'xG告诉我们的故事.md'), 'utf8');
  assert.deepEqual(data.columns, ['名次', '球队', '场均xG排名', '场均射门排名', '实际进球-xG排名', '场均xG', '场均射门', '实际进球-xG']);
  assert.ok(md.endsWith(markdown(data.rows, data.columns, { decimalColumns: data.columns.slice(5) })));
  for (const [, resource] of page.matchAll(/(?:src|href)="([^"]+)"/g)) {
    assert.ok(fs.existsSync(path.resolve(destination, resource)), resource);
  }
});
