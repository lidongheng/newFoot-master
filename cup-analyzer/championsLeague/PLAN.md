# 欧冠联赛分析项目方案

> 持续迭代文档。最后更新: 2026-04-07

## 一、项目全景

在 `cup-analyzer/championsLeague/` 分析欧洲冠军联赛（UEFA Champions League），与 `theWorldCup/` 同级。适配 **瑞士赛制联赛阶段（36队、8轮）** 与 **两回合淘汰赛**，并复用 `league-analyzer` 中已验证的赛前/赛后分析流程。

## 二、实施进度

| 任务 | 状态 | 说明 |
|------|------|------|
| 创建目录与 PLAN/workflow | 已完成 | 本目录与规则、策略骨架 |
| 同步 data（c103/l103/bs103/td103） | 已完成 | 从 league-analyzer/data 复制 |
| 迁移 25-26 报告/新闻/复盘 | 已完成 | 复制自 league-analyzer，保留原仓库副本 |
| 扩展 crawler-server 多杯赛配置 | 已完成 | `CUP_ANALYZER_CUP=championsLeague` |
| 创建 UCL SKILL | 已完成 | `.cursor/rules/dh-championsleague-analysis/SKILL.md` |
| 大名单抓取流程文档化 | 已完成 | 每场赛前 `wudaconfig` + `crawlerPlayer.js` + `crawlerClub3_new.js`，见 `workflow.md` / `SKILL.md` |
| 球队画像自动化 / 定时任务 | 待办 | 可按需接入 processors |

## 三、目录结构（摘要）

详见本仓库根目录 `cup-analyzer/README.md`。核心子目录：`data/`、`rule/`、`strategy/`、`report/{赛季}/league-phase|playoff|...`、`news/`、`postMatchSummary/`、`teamProfile/`、`description/`。

## 四、数据与迁移

- **联赛序号**：球探体育 **103**（`c103.js` / `l103.js` / `bs103.js` / `td103.js`）
- **迁移原则**：从 `league-analyzer` **复制** 而非移动，便于对照历史路径。

## 五、与 theWorldCup 的差异（摘要）

| 维度 | theWorldCup | championsLeague |
|------|-------------|-----------------|
| 报告路径 | `report/group-stage/...` | `report/{赛季}/league-phase/...` |
| 大名单 | 赛前一次性批量抓取，缓存到 `squad/group-*`（`squadCrawler.js`） | **每场比赛前**用 `backend-server/crawlerPlayer.js` + `crawlerClub3_new.js`（先改 `wudaconfig.js`），输出 `player_center/{序号}.json` 与 `-new.json`；与 league-analyzer 一致 |
| 盘路 | 杯赛场次少，常缺盘路榜 | 联赛阶段可引用 `l103`/`bs103` |
| 策略侧重 | 挑对手、默契球、跨国疲劳 | 积分出线、抽签、两回合、跨赛事疲劳 |

## 六、参考

- 工作流程：[workflow.md](./workflow.md)
- 赛前模板：`prompts/match_analysis_template.md`（本目录下）
- 赛前/赛后 SKILL：`dh-match-predict-analysis` / `dh-post-match-analysis`
