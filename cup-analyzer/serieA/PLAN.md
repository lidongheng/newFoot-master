# 意大利足球甲级联赛（Serie A / 意甲）分析项目方案

> 持续迭代文档。最后更新: 2026-04-12

## 一、项目全景

在 `cup-analyzer/serieA/` 分析意甲，与 [`epl/`](../epl/)、[`championsLeague/`](../championsLeague/) 同级，并与 `crawler-server` 的 **`s34_2948.js`** 赛程数据对齐。

## 二、实施进度

| 任务 | 状态 | 说明 |
|------|------|------|
| 创建目录与 PLAN / workflow / README | 已完成 | 本目录根文档 |
| 扩展 crawler-server（`CUP_ANALYZER_CUP=serieA`） | 已完成 | [config/index.js](../crawler-server/config/index.js) |
| 同步 data（`s34_2948` + `l34`/`bs34`/`td34`） | 已完成 | `npm run crawl:schedule:seriea` |
| 复制 prompts 模板 | 已完成 | `prompts/match_analysis_template.md` |
| 球队与序号对照表 | 已完成 | 据 `s34_2948.js` 内 `arrTeam` 填 20 队 |
| 可选：rule/、strategy/、description/ | 未开始 | 对齐英超模块时可补充 |

## 三、数据与序号

- **联赛序号**：球探 **34**，子联赛 **2948** → `s34_2948.js`；盘路等与 **34** 前缀一致：`l34.js`、`bs34.js`、`td34.js`
- **titan007 赛季目录**：`2025-2026`（与 URL `matchResult/2025-2026/` 一致）
- **内容赛季目录**：`25-26`（`report/25-26/` 等）

## 四、参考

- 工作流程：[workflow.md](./workflow.md)
- 赛前模板：`prompts/match_analysis_template.md`
- 数据说明：`data/README.md`
