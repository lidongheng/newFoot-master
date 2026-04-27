# 欧会杯（欧协联）分析项目方案

> 持续迭代文档。最后更新: 2026-04-15

## 一、项目全景

在 `cup-analyzer/uefaConferenceLeague/` 分析欧足联欧洲协会联赛（UEFA Conference League，球探常称欧会杯），与 `championsLeague/` 同级。赛制与欧冠 **联赛阶段（瑞士制 · 36 队 · 8 轮）** 及 **两回合淘汰赛** 对齐。

## 二、实施进度

| 任务 | 状态 | 说明 |
|------|------|------|
| 创建目录与 PLAN/workflow | 已完成 | 本目录与规则、策略骨架 |
| 同步 data（c2187/l2187/bs2187） | 已完成 | `npm run crawl:schedule:conference` |
| 扩展 crawler-server 多杯赛配置 | 已完成 | `CUP_ANALYZER_CUP=uefaConferenceLeague` |

## 三、目录结构（摘要）

核心子目录：`data/`、`rule/`、`strategy/`、`report/{赛季}/league-phase|playoff|...`、`news/`、`postMatchSummary/`、`teamProfile/`、`description/`。

## 四、数据

- **球探杯赛序号**：**2187**（`c2187.js` / `l2187.js` / `bs2187.js`）

## 五、参考

- 工作流程：[workflow.md](./workflow.md)
- 赛前模板：`prompts/match_analysis_template.md`
