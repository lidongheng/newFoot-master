const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const router = require('./routes');
const config = require('./config');

const app = new Koa();

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = { success: false, message: err.message };
    console.error('[Error]', err.message);
  }
});

app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(config.port, () => {
  console.log(`[cup-analyzer crawler-server] running on http://localhost:${config.port}`);
  console.log(`Cup: ${config.cupName} | Season: ${config.season}`);
});

module.exports = app;
