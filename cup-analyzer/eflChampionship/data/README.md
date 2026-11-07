# 英冠数据

赛季：2026–2027；球探联赛序号：37；联赛阶段子联赛序号：87。

- `s37.js`：赛程与积分榜，远程文件为 `s37_87.js`。
- `l37.js`：亚盘盘路。
- `bs37.js`：大小球盘路。
- `td37.js`：入球时间。
- `config.json`：沿用 EPL 位置映射，包含当季全部 24 队的懂球帝 ID、名称与球探名称、序号。

数据来源：球探 `https://zq.titan007.com/jsData/` 下 2026-2027 赛季数据；懂球帝 `https://sport-data.dongqiudi.com/soccer/biz/data/standing?season_id=27581`。

在 `crawler-server` 执行 `npm run crawl:schedule:eflChampionship` 更新赛程与盘路。
