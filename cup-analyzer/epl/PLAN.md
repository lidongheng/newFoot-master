# 英超联赛（EPL）分析项目方案

> 持续迭代文档。最后更新: 2026-04-08

## 一、项目全景

在 `cup-analyzer/epl/` 分析英格兰足球超级联赛（Premier League），与 `championsLeague/`、`theWorldCup/` 同级。复用 `league-analyzer` 中已验证的赛前/赛后流程，并强调 **Big 6**（阿森纳、曼城、利物浦、曼联、热刺、切尔西）的画像与复盘。

## 二、实施进度

| 任务 | 状态 | 说明 |
|------|------|------|
| 创建目录与 PLAN/workflow | 已完成 | 本目录与规则、策略骨架 |
| 同步 data（s36/l36/bs36/td36） | 已完成 | l36/bs36/td36 自 league-analyzer；s36 由爬虫 |
| 迁移 25-26 报告/新闻/复盘/简介 | 已完成 | 自 league-analyzer，保留原仓库副本 |
| 扩展 crawler-server 多杯赛配置 | 已完成 | `CUP_ANALYZER_CUP=epl` |
| 创建 EPL SKILL | 已完成 | `.cursor/rules/dh-epl-analysis/SKILL.md` |
| Big 6 teamProfile 持续更新 | 进行中 | 转会窗、圣诞赛程、双线负荷等 |

## 三、目录结构（摘要）

详见 [cup-analyzer/README.md](../README.md)。核心子目录：`data/`、`rule/`、`strategy/`、`report/{赛季}/round-N/`、`news/`、`postMatchSummary/`、`teamProfile/`、`description/`、`prompts/`。

## 四、数据与序号

- **联赛序号**：球探体育 **36** → `s36.js` / `l36.js` / `bs36.js` / `td36.js`
- **迁移原则**：从 `league-analyzer` **复制** 而非移动，便于对照历史路径。

## 五、与欧冠 / 世界杯的差异（摘要）

| 维度 | theWorldCup | championsLeague | epl |
|------|-------------|-----------------|-----|
| 报告路径 | `report/group-stage/...` | `report/{赛季}/league-phase/...` | `report/{赛季}/round-N/...` |
| 赛制 | 小组赛+淘汰 | 瑞士制+两回合淘汰 | **38 轮双循环联赛** |
| 策略侧重 | 挑对手、默契球 | 积分区间、抽签、两回合 | **争冠/争四/欧战/保级**、德比 |
| 盘路 | 场次少 | 可引用 l103 | **l36/bs36 样本大** |

## 六、参考

- 工作流程：[workflow.md](./workflow.md)
- 赛前模板：`prompts/match_analysis_template.md`
- 赛前/赛后 SKILL：`dh-match-predict-analysis` / `dh-post-match-analysis`
- 专项 SKILL：`dh-epl-analysis`
