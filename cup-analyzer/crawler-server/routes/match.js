const Router = require('koa-router');
const MatchDataCrawler = require('../crawlers/matchDataCrawler');
const OddsCrawler = require('../crawlers/oddsCrawler');

const router = new Router();

router.post('/post-data/:matchId', async (ctx) => {
  const { matchId } = ctx.params;
  const crawler = new MatchDataCrawler();
  const result = await crawler.crawlMatch(matchId);
  ctx.body = { success: true, data: result };
});

router.post('/post-data-batch', async (ctx) => {
  const { stage, round } = ctx.request.body;
  const crawler = new MatchDataCrawler();
  const result = await crawler.crawlBatch(stage, round);
  ctx.body = { success: true, data: result };
});

router.post('/odds/:matchId', async (ctx) => {
  const { matchId } = ctx.params;
  const crawler = new OddsCrawler();
  const result = await crawler.crawlMatchOdds(matchId);
  ctx.body = { success: true, data: result };
});

module.exports = router;
