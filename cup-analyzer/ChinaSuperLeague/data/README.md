# 中超数据

球探联赛编号 `60`，2026 赛季页面引用子联赛 `2187`。

| 文件 | 说明 |
| --- | --- |
| `config.json` | 位置映射和用户提供的 16 支球队映射 |
| `s60_2187.js` | 赛程与积分榜，运行赛程爬虫生成 |
| `l60.js` | 亚盘盘路，运行赛程爬虫生成 |
| `bs60.js` | 大小球盘路，运行赛程爬虫生成 |
| `td60.js` | 入球时间，运行赛程爬虫生成 |

在 `crawler-server` 下执行 `npm run crawl:schedule:csl`。赛程主文件会同步到 `crawler-server/match_center/s60.js`。

球探页面：[2026 中超](https://zq.titan007.com/cn/League/2026/60.html)。
