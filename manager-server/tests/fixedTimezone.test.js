const test = require('node:test');
const assert = require('node:assert/strict');
const { fixedDateToUtcRange, getFixedDate } = require('../utils/fixedTimezone');

test('固定 GMT-4 在 UTC 04:00 切换日期', () => {
  assert.equal(getFixedDate(new Date('2026-09-09T03:59:59.999Z')), '2026-09-08');
  assert.equal(getFixedDate(new Date('2026-09-09T04:00:00.000Z')), '2026-09-09');
});

test('固定 GMT-4 冬季仍在北京时间12点切换', () => {
  assert.equal(getFixedDate(new Date('2026-01-09T03:59:59.999Z')), '2026-01-08');
  assert.equal(getFixedDate(new Date('2026-01-09T04:00:00.000Z')), '2026-01-09');
});

test('日期查询使用起点包含、终点不包含的 UTC 范围', () => {
  const range = fixedDateToUtcRange('2026-09-09');

  assert.equal(range.start.toISOString(), '2026-09-09T04:00:00.000Z');
  assert.equal(range.end.toISOString(), '2026-09-10T04:00:00.000Z');
});
