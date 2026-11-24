# 亚冠精英联赛分析项目

以 `championsLeague/` 的工作流、赛前模板和策略框架为基础，复用 `crawler-server` 的同一套脚本。

- 赛事：亚足联冠军精英联赛（AFC Champions League Elite）。
- 球探序号：`192`，赛程 `c192.js`，亚盘 `l192.js`，大小球 `bs192.js`。
- 默认远程赛季：`2026-2027`；本地报告、新闻和复盘使用 `26-27`。
- 赛事环境变量：`CUP_ANALYZER_CUP=afcChampionsLeague`。
- 球队映射：`data/config.json`，包含位置映射及赛程全部 36 队（含资格赛）的懂球帝、球探映射。
- 名单、审核名单和画像目录：`squad/` → `squad-final/` → `teamProfile/`。
- 保留欧冠的目录用途和模板，不复制欧冠球队画像、新闻、赛程、历史报告或赔率数值。

运行顺序、参数和输出路径见 [workflow.md](./workflow.md)。
