const test = require('node:test');
const assert = require('node:assert/strict');
const { getCorrectScoreDetails } = require('../utils/correctScore');
const betService = require('../services/betService');

test('明确比分支持约定范围内的比分', () => {
  const exactScores = [[0, 0], [3, 3], [4, 3], [4, 4], [5, 1], [5, 2], [1, 5], [2, 5]];
  for (const [homeScore, awayScore] of exactScores) {
    assert.equal(getCorrectScoreDetails({ type: 'exact', homeScore, awayScore }).value, `${homeScore}:${awayScore}`);
  }
});

test('排除比分只能通过胜平负其他投注', () => {
  const excludedScores = [[5, 3], [5, 4], [5, 5], [3, 5], [4, 5]];
  for (const [homeScore, awayScore] of excludedScores) {
    assert.throws(() => getCorrectScoreDetails({ type: 'exact', homeScore, awayScore }), /其他选项/);
  }
});

test('其他比分选项保留胜平负类别', () => {
  assert.equal(getCorrectScoreDetails({ type: 'other', outcome: 'home' }).value, '胜其他');
  assert.equal(getCorrectScoreDetails({ type: 'other', outcome: 'draw' }).value, '平其他');
  assert.equal(getCorrectScoreDetails({ type: 'other', outcome: 'away' }).value, '负其他');
  assert.throws(() => getCorrectScoreDetails({ type: 'other', outcome: 'invalid' }), /类型无效/);
});

test('比分值和比分赔率按规则校验并计算利润', () => {
  assert.throws(() => getCorrectScoreDetails({ type: 'exact', homeScore: 6, awayScore: 0 }), /0至5/);
  assert.throws(() => getCorrectScoreDetails({ type: 'exact', homeScore: 1.5, awayScore: 0 }), /0至5/);
  assert.equal(betService.calculatePotentialWin(100, 7.5, 'correctScore'), 650);
});
