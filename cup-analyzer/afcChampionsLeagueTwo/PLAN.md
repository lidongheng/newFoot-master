# 亚冠联2（AFC Champions League Two）分析项目方案

> 持续迭代文档。最后更新: 2026-04-15

## 一、项目全景

在 `cup-analyzer/afcChampionsLeagueTwo/` 分析亚足联冠军联赛二级赛事（亚冠联2），赛制为 **小组赛（32 队、8 组双循环）** + **东西区分区淘汰赛**（与欧冠瑞士制 **不同**）。

## 二、实施进度

| 任务 | 状态 | 说明 |
|------|------|------|
| 创建目录与 PLAN/workflow | 已完成 | 本目录与规则、策略骨架 |
| 同步 data（c350/l350/bs350） | 已完成 | `npm run crawl:schedule:acl2` |
| 扩展 crawler-server 多杯赛配置 | 已完成 | `CUP_ANALYZER_CUP=afcChampionsLeagueTwo` |

## 三、目录结构（摘要）

核心子目录：`data/`、`rule/`、`strategy/`、`report/{赛季}/group-stage|knockout|...`、`news/`、`postMatchSummary/`、`teamProfile/`、`description/`。

## 四、数据

- **球探杯赛序号**：**350**（`c350.js` / `l350.js` / `bs350.js`）

## 五、参考

- 工作流程：[workflow.md](./workflow.md)
- 赛前模板：`prompts/match_analysis_template.md`
