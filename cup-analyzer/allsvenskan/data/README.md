# 瑞典超数据目录

| 文件 | 说明 |
|---|---|
| `config.json` | 位置映射及 2026 赛季全部 16 队的懂球帝与球探映射 |
| `s26.js` | 本地主赛程，运行 `npm run crawl:schedule:allsvenskan` 从远程 `s26_431.js` 抓取后保存 |
| `l26.js` | 亚盘盘路，同一赛程命令更新 |
| `bs26.js` | 大小球盘路，同一赛程命令更新 |
| `td26.js` | 进球时间数据，同一赛程命令更新 |
| `球队与序号对照表.md` | 两站名称和球队 ID 对照 |
| `冠军赔率.md` / `降级赔率.md` | 记录有来源与日期的赔率 |

核对日期：2026-11-07（北京时间）。

- [球探 2026 瑞典超赛程与球队表](https://zq.titan007.com/cn/SubLeague/2026/26.html)：16 队、球探球队序号，页面实际加载 `s26_431.js`。
- [懂球帝瑞典超积分榜](https://www.dongqiudi.com/data?cid=21&tab=standings)：当季 16 队和懂球帝名称。
- 各队的 `https://sport-data.dongqiudi.com/soccer/biz/dqd/team/statistic/{球队ID}?lang=zh-cn`：逐队核对 `score_board.teams` 中 `cur_team: 1` 的长 ID；16 队当前赛季均为 `2026`，懂球帝联赛赛季 ID 为 `26233`。该赛季 ID 由爬虫运行时读取，不写死在配置中。
