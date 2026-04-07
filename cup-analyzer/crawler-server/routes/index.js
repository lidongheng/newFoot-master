const Router = require('koa-router');
const squadRouter = require('./squad');
const matchRouter = require('./match');
const scheduleRouter = require('./schedule');

const router = new Router({ prefix: '/api' });

router.get('/health', async (ctx) => {
  ctx.body = { success: true, message: 'cup-analyzer crawler-server is running', timestamp: new Date().toISOString() };
});

router.use('/squad', squadRouter.routes(), squadRouter.allowedMethods());
router.use('/match', matchRouter.routes(), matchRouter.allowedMethods());
router.use('/schedule', scheduleRouter.routes(), scheduleRouter.allowedMethods());

module.exports = router;
