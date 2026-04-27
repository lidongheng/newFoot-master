# 欧罗巴联赛分析项目方案

> 持续迭代文档。最后更新: 2026-04-15

## 一、项目全景

在 `cup-analyzer/europaLeague/` 分析欧罗巴联赛（UEFA Europa League），与 `championsLeague/` 同级。赛制与欧冠 **联赛阶段（瑞士制 · 36 队 · 8 轮）** 及 **两回合淘汰赛** 对齐，流程与数据形态复用欧冠模块。

## 二、实施进度

| 任务 | 状态 | 说明 |
|------|------|------|
| 创建目录与 PLAN/workflow | 已完成 | 本目录与规则、策略骨架 |
| 同步 data（c113/l113/bs113） | 已完成 | `npm run crawl:schedule:europa` |
| 扩展 crawler-server 多杯赛配置 | 已完成 | `CUP_ANALYZER_CUP=europaLeague` |

## 三、目录结构（摘要）

核心子目录：`data/`、`rule/`、`strategy/`、`report/{赛季}/league-phase|playoff|...`、`news/`、`postMatchSummary/`、`teamProfile/`、`description/`。

## 四、数据

- **球探杯赛序号**：**113**（`c113.js` / `l113.js` / `bs113.js`）

## 五、参考

- 工作流程：[workflow.md](./workflow.md)
- 赛前模板：`prompts/match_analysis_template.md`
