'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { settle, readRows, buildRows } = require('../bin/sameOpeningHandicap');

function game(id, homeId, awayId, score, line) {
  return [id, 36, -1, '2026-08-22 03:00', homeId, awayId, score, '99-99', '', '', line, 99, '99'];
}

test('全场亚盘按主客视角结算，保留正负四分之一盘口的半赢半输', () => {
  for (const [score, line, expected] of [['2-0', 1, 1], ['1-0', 1, 0], ['0-0', 1, -1],
    ['1-0', 0.75, 0.5], ['1-0', 1.25, -0.5], ['0-1', -0.75, -0.5], ['0-1', -1.25, 0.5], ['0-0', 0, 0]]) {
    const row = game(1, 1, 2, score, line);
    assert.equal(settle(row, '1'), expected);
    assert.equal(settle(row, '2'), expected === 0 ? 0 : -expected);
  }
});

test('缺失及非法初赔、比分不转换成0，真实0初赔可结算', () => {
  for (const line of [null, undefined, '', '0', NaN, Infinity, 0.3]) assert.throws(() => settle(game(1, 1, 2, '0-0', line), '1'), /初赔/);
  for (const score of ['', null, '1:0', '-']) assert.throws(() => settle(game(1, 1, 2, score, 0), '1'), /比分/);
  assert.equal(settle(game(1, 1, 2, '0-0', 0), '1'), 0);
});

test('同初赔按主客分别汇总，明细按时间排列；缺口不入统计', () => {
  const rawRows = new Map([
    ['1', game(1, 1, 2, '1-0', 0.75)], ['2', game(2, 1, 3, '0-0', 0.75)],
    ['3', game(3, 2, 1, '1-0', 0.75)], ['4', game(4, 1, 2, '2-0', null)],
    ['5', game(5, 1, 2, '2-0', 1)],
  ]);
  const teams = ['甲', '乙', '丙'].map((name, index) => ({ id: String(index + 1), name }));
  const matches = new Map([...rawRows].map(([id, row]) => [id, { id, round: 1, timestamp: Number(id), time: row[3], homeId: String(row[4]), awayId: String(row[5]), score: row[6] }]));
  const result = buildRows({ teams, matches }, teams[0], new Set(['5', '3', '2', '4', '1']), rawRows);
  assert.equal(result.rows.length, 3);
  const group = result.rows[0];
  assert.equal(group['场次'], 2);
  assert.equal(group['赢半'], 1);
  assert.equal(group['输盘'], 1);
  assert.equal(group['赢盘率（含赢半）%'], 50);
  assert.equal(group['净赢盘'], -0.5);
  assert.ok(group['比赛明细'].indexOf('[1]') < group['比赛明细'].indexOf('[2]'));
  assert.equal(result.rows[2]['本队让球'], -0.75);
  assert.equal(result.rows[2]['输半'], 1);
  assert.equal(result.issues.length, 1);
});

test('R_N重复比赛只计一次，初赔冲突明确报错', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'same-handicap-'));
  const file = path.join(directory, 's36.js');
  const row = game(1, 1, 2, '1-0', 0.75);
  try {
    fs.writeFileSync(file, `jh['R_1'] = ${JSON.stringify([row])}; jh['R_2'] = ${JSON.stringify([row])};`);
    assert.equal(readRows(file).size, 1);
    fs.writeFileSync(file, `jh['R_1'] = ${JSON.stringify([row])}; jh['R_2'] = ${JSON.stringify([game(1, 1, 2, '1-0', 1)])};`);
    assert.throws(() => readRows(file), /冲突/);
  } finally {
    fs.unlinkSync(file);
    fs.rmdirSync(directory);
  }
});
