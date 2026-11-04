# 挪威足球超级联赛（Eliteserien）分析模块

本目录用于挪威顶级联赛 Eliteserien，沿用 `epl/` 的国内联赛分析目录，并参照 `koreanKLeague/` 使用自然年赛季目录。

- 球探联赛序号：`22`
- 赛季：按自然年命名，例如 `2026`；不使用跨年赛季名。
- 赛程主文件：`data/s22.js`（首次抓取后生成）
- 赛季资料：`basicData/2026/`、`description/2026/`、`news/2026/`、`report/2026/`、`postMatchSummary/2026/`
- 球队流水线：`squad/` → `squad-final/` → `teamProfile/`

## 当前状态

已建立目录骨架和工作流程说明。仓库里尚无球探 22 的赛程数据；本次未复制其他联赛的球队、报告或统计数据。

爬虫中央配置目前尚未登记 `eliteSerien`。要运行赛程和球队流水线，需先在 `crawler-server/config/index.js` 登记联赛序号 `22`、`crossYear: false`、自然年赛季以及本目录路径，并在 `crawler-server/package.json` 增加赛程脚本。登记完成后再使用 workflow 中的命令。

球队与球探序号需从实际赛程文件的 `arrTeam` 核对，见 [data/球队与序号对照表.md](./data/球队与序号对照表.md)。
