# 瑞典足球超级联赛（Allsvenskan）分析模块

完整工作流复制自 `eliteSerien/workflow.md`，复用同一套赛程、名单、球队画像、赛前分析与周期报告脚本。

- 模块名：`allsvenskan`；球探联赛序号：`26`；联赛阶段：`431`。
- 单年赛季：`2026`，`crossYear: false`。
- 主赛程保存为 `data/s26.js`，远程抓取文件为 `s26_431.js`；盘路与进球时间：`l26.js`、`bs26.js`、`td26.js`。
- `data/config.json` 已包含 2026 赛季全部 16 队的懂球帝长 ID、两站球队名称及球探球队序号，并沿用挪超的位置映射。
- `basicData/2026/`、`description/2026/`、`news/2026/`、`report/2026/`、`postMatchSummary/2026/` 存放本赛季资料。

## 执行入口

在 `cup-analyzer/crawler-server` 下先执行：

```bash
npm run crawl:schedule:allsvenskan
```

抓取球队名单前，在 `config/squadTarget.js` 设置 `leagueSlug: 'allsvenskan'`、`leagueSerial: '26'`、`season: '2026'`、`isNation: false`，并按球队对照表填写 `teamSerial`、球队名与轮次。完整命令见 [workflow.md](./workflow.md)。

本目录的球队映射已核对；赛程与统计 JS 由首次运行赛程脚本生成，赔率、球员名单和报告随实际采集写入。数据来源及核对日期见 [data/README.md](./data/README.md)。
