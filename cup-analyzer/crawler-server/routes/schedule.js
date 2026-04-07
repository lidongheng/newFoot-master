const Router = require('koa-router');
const ScheduleCrawler = require('../crawlers/scheduleCrawler');

const router = new Router();

router.post('/update', async (ctx) => {
  const crawler = new ScheduleCrawler();
  const result = await crawler.updateSchedule();
  ctx.body = { success: true, data: result };
});

router.get('/groups', async (ctx) => {
  const crawler = new ScheduleCrawler();
  const result = await crawler.getGroupStandings();
  ctx.body = { success: true, data: result };
});

module.exports = router;
