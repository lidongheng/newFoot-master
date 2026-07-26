const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCheckpoint } = require('../domain/matchStore');
const { buildCompanyChanges } = require('../analyzers/marketAnalyzer');
const { validateSignals } = require('../analyzers/heatAnalyzer');
const { validateMethodRegistry } = require('../processors/methodRegistryValidator');

test('盘口检查点必须使用受控枚举', () => {
  assert.doesNotThrow(() => validateCheckpoint('opening'));
  assert.throws(() => validateCheckpoint('unknown'), /无效盘口检查点/);
});

test('盘口变化只比较真实抓取值', () => {
  const changes = buildCompanyChanges({
    asianHandicap: [{
      company: 'company-a',
      initialHandicap: -0.5,
      currentHandicap: -0.75,
      initialHome: 0.9,
      currentHome: 0.9,
      initialAway: 0.92,
      currentAway: 0.86,
    }],
  });
  assert.equal(changes[0].handicapChanged, true);
  assert.equal(changes[0].homePriceChanged, false);
  assert.equal(changes[0].awayPriceChanged, true);
});

test('热度观测信号缺少来源时拒绝分析', () => {
  assert.throws(
    () => validateSignals({ observed: [{ id: 'signal-1' }], inferred: [] }),
    /必须包含 id、source、capturedAt/
  );
});

test('预留理论未启用时注册表合法', () => {
  assert.deepEqual(validateMethodRegistry(), []);
});
