const test = require('node:test');
const assert = require('node:assert/strict');
const { getFundamentalPaths, getTeamObject } = require('../domain/teamPaths');
const { slugifyEnglishName } = require('../processors/teamObjectInitializer');

test('阿森纳和 FC 首尔拥有独立球队对象路径', () => {
  const arsenal = getFundamentalPaths(19);
  const fcSeoul = getFundamentalPaths(741);

  assert.match(arsenal.confirmedSquad, /teams\/arsenal\/seasons\/2026-2027/);
  assert.match(fcSeoul.confirmedSquad, /teams\/fc-seoul\/seasons\/2026/);
  assert.notEqual(arsenal.teamProfile, fcSeoul.teamProfile);
});

test('未注册球队不是深度对象', () => {
  assert.equal(getTeamObject(999999), null);
});

test('最小球队对象使用稳定英文 slug', () => {
  assert.equal(slugifyEnglishName('Pohang Steelers'), 'pohang-steelers');
});
