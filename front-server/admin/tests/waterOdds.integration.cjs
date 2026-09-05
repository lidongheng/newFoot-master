const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { randomUUID } = require('node:crypto');

// 每次使用独立数据库，禁止连接或清理业务库。
const database = `football_water_test_${randomUUID().replaceAll('-', '')}`;
process.env.MONGO_URI = `mongodb://127.0.0.1:27017/${database}`;
const backend = path.resolve(__dirname, '../../../manager-server');
// 后端日志写入临时目录，不污染工作区。
process.chdir(mkdtempSync(path.join(tmpdir(), 'water-odds-')));
const app = require(path.join(backend, 'app'));
const { mongoose } = require(path.join(backend, 'config/db'));
const { Account, BetOrder } = require(path.join(backend, 'models'));
const server = http.createServer(app.callback());
const quotes = {
  handicap: { home: { value: '-0.5', odds: 0.90 }, away: { value: '+0.5', odds: 0.90 } },
  overUnder: { over: { value: '大 2.5', odds: 0.90 }, under: { value: '小 2.5', odds: 0.90 } },
  moneyline: { home: { label: '主', odds: 1.90 }, draw: { label: '和', odds: 3.20 }, away: { label: '客', odds: 3.50 } },
};
let baseUrl;
async function request(url, method, data) {
  const response = await fetch(`${baseUrl}/api/v1${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await response.json();
  assert.equal(body.code, 200, JSON.stringify(body));
  return body.data;
}
async function run() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  assert.equal(mongoose.connection.name, database);
  await Account.create({ quota: 50000, lastResetDate: Account.getCurrentQuotaDate() });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  let tested = 0;
  for (const mode of ['early', 'live']) {
    let match = await request('/admin/match/create', 'POST', {
      matchId: `water-${mode}`, league: '水位隔离测试', homeTeam: '主队', awayTeam: '客队',
      startTime: new Date(Date.now() + 3600000).toISOString(), status: 'upcoming', odds: quotes,
    });
    if (mode === 'live') {
      await request(`/admin/match/status/${match._id}`, 'PUT', { status: 'live' });
      match = await request(`/admin/match/live/${match._id}`, 'PUT', {
        homeScore: 0, awayScore: 0, minute: 10, period: '上半场', bettingOpen: true, odds: quotes,
      });
    }
    const pending = [];
    for (const [marketType, selectionKey] of [['handicap', 'home'], ['handicap', 'away'], ['overUnder', 'over'], ['overUnder', 'under'], ['moneyline', 'home']]) {
      const quote = quotes[marketType][selectionKey];
      for (const [result, expected] of [['win', 190], ['half_win', 145], ['push', 100], ['half_lose', 50], ['lose', 0]]) {
        for (const settlement of ['single', 'batch']) {
          const before = (await Account.findOne()).quota;
          const order = await request('/bet/place', 'POST', {
            matchId: match.matchId, betMode: mode, marketType, selectionKey,
            quotedValue: marketType === 'moneyline' ? quote.label : quote.value,
            quotedOdds: quote.odds, marketVersion: match.marketVersion, amount: 100,
          });
          assert.equal(order.odds, quote.odds);
          assert.equal(order.potentialWin, 90);
          assert.equal((await Account.findOne()).quota, before - 100);
          pending.push({ order, result, expected, settlement });
        }
      }
    }
    // 变更当前盘口，确认结算使用订单快照。
    const changed = structuredClone(quotes);
    for (const market of Object.values(changed)) {
      for (const quote of Object.values(market)) quote.odds = 1.20;
    }
    await request(`/admin/match/update/${match._id}`, 'PUT', { odds: changed });
    for (const { order, result, expected, settlement } of pending) {
      const before = (await Account.findOne()).quota;
      const score = { result, finalHomeScore: 2, finalAwayScore: 1 };
      if (settlement === 'single') {
        await request(`/bet/settle/${order.orderId}`, 'POST', score);
      } else {
        await request('/admin/bet-order/batch-settle', 'POST', { ...score, ids: [order._id] });
      }
      const saved = await BetOrder.findById(order._id);
      assert.equal(saved.odds, order.odds);
      assert.equal(saved.potentialWin, 90);
      assert.equal(saved.actualWin, expected);
      assert.equal(saved.status, 'settled');
      assert.equal(saved.result, result);
      assert.equal((await Account.findOne()).quota, before);
      tested += 1;
    }
  }
  console.log(`PASS: ${tested} HTTP 下注到结算场景；水位快照、独赢回归及额度验证通过。`);
}
run().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  if (server.listening) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    assert.equal(mongoose.connection.name, database);
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
  require(path.join(backend, 'node_modules/log4js')).shutdown();
});
