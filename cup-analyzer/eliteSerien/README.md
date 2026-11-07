# 挪威足球超级联赛（Eliteserien）分析模块

本目录用于挪威顶级联赛 Eliteserien，沿用 `epl/` 的国内联赛分析目录，并参照 `koreanKLeague/` 使用自然年赛季目录。

- 球探联赛序号：`22`
- 赛季：按自然年命名，例如 `2026`；不使用跨年赛季名。
- 赛程主文件：`data/s22.js`（首次抓取后生成）
- 赛季资料：`basicData/2026/`、`description/2026/`、`news/2026/`、`report/2026/`、`postMatchSummary/2026/`
- 球队流水线：`squad/` → `squad-final/` → `teamProfile/`

## 当前状态

已建立目录骨架和工作流程说明。仓库里尚无球探 22 的赛程数据；本次未复制其他联赛的球队、报告或统计数据。

爬虫已登记 `eliteSerien`：联赛序号 `22`、`crossYear: false`、赛季 `'2026'`。在 `crawler-server/` 执行 `npm run crawl:schedule:eliteserien` 生成赛程数据，再按 workflow 运行分析脚本。

`data/config.json` 当前包含已核实的维京懂球帝映射（`50001371` → 球探 `495`）；采集其他挪超球队前需补齐相应映射。懂球帝名单支持自然年赛季；分析欧冠时可保留欧冠分析赛季并读取球队当前国内赛季名单。

球队与球探序号需从实际赛程文件的 `arrTeam` 核对，见 [data/球队与序号对照表.md](./data/球队与序号对照表.md)。
