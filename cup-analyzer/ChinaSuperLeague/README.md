# 中超分析模块

基于 `koreanKLeague` 的工作流和目录结构建立，复用共用 `crawler-server`。

- 联赛标识：`ChinaSuperLeague`；球探编号：`60`；子联赛：`2187`。
- 单年赛季：`2026`，`crossYear: false`。
- 球队映射：[data/config.json](./data/config.json)，已按用户提供的数据导入 16 支球队。
- 工作流：[workflow.md](./workflow.md)。
- 在 `crawler-server` 下执行 `npm run crawl:schedule:csl` 更新赛程与盘路数据。

赛程与盘路文件由爬虫生成；球队名单、画像和报告按工作流生成。
