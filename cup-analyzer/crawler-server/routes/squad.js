const Router = require('koa-router');
const SquadCrawler = require('../crawlers/squadCrawler');
const SquadProcessor = require('../processors/squadProcessor');
const TeamProfileGenerator = require('../processors/teamProfileGenerator');

const router = new Router();

router.post('/crawl/:teamSerial', async (ctx) => {
  const { teamSerial } = ctx.params;
  const crawler = new SquadCrawler();
  const result = await crawler.crawlTeam(teamSerial);
  ctx.body = { success: true, data: result };
});

router.post('/crawl-all', async (ctx) => {
  const crawler = new SquadCrawler();
  const result = await crawler.crawlAllTeams();
  ctx.body = { success: true, data: result };
});

router.post('/process', async (ctx) => {
  const processor = new SquadProcessor();
  const result = await processor.processAll();
  ctx.body = { success: true, data: result };
});

router.get('/profile/:teamName', async (ctx) => {
  const { teamName } = ctx.params;
  const generator = new TeamProfileGenerator();
  const result = await generator.getProfile(teamName);
  ctx.body = { success: true, data: result };
});

router.post('/profile/generate-all', async (ctx) => {
  const generator = new TeamProfileGenerator();
  const result = await generator.generateAll();
  ctx.body = { success: true, data: result };
});

module.exports = router;
