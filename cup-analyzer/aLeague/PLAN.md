# 澳大利亚足球超级联赛（A-League / 澳超）分析项目方案

> 持续迭代文档。最后更新: 2026-04-10

## 一、项目全景

在 `cup-analyzer/aLeague/` 分析澳超（Australia A-League），与 `epl/`、`championsLeague/`、`koreanKLeague/` 同级。复用 `league-analyzer` 中已迁移的赛前报告、新闻素材与赛后复盘，并与 `crawler-server` 的 **`s273_462.js`** 赛程数据对齐。

## 二、实施进度

| 任务 | 状态 | 说明 |
|------|------|------|
| 创建目录与 PLAN / workflow / README | 已完成 | 本目录根文档 |
| 扩展 crawler-server（`CUP_ANALYZER_CUP=aLeague`） | 已完成 | [config/index.js](../crawler-server/config/index.js) |
| 同步 data（`s273_462` + `l273`/`bs273`/`td273`） | 已完成 | 赛程由爬虫；盘路自 league-analyzer |
| 从 league-analyzer 迁移 25-26 内容 | 已完成 | news / report / postMatchSummary / teamInfo→teamProfile |
| 复制 prompts 模板 | 已完成 | `prompts/match_analysis_template.md` |
| 可选：rule/、strategy/、description/ | 未开始 | 对齐英超模块时可补充 |

## 三、目录结构（摘要）

详见 [README.md](./README.md) 与 [cup-analyzer/README.md](../README.md)。核心子目录：`data/`、`report/{赛季}/`、`news/{赛季}/`、`postMatchSummary/{赛季}/`、`teamProfile/`、`prompts/`。

## 四、数据与序号

- **联赛序号**：球探 **273**，子联赛 **462** → `s273_462.js`；盘路等与 **273** 前缀一致：`l273.js`、`bs273.js`、`td273.js`
- **迁移原则**：从 `league-analyzer` **复制** 而非移动；路径映射：`league-analyzer/{类别}/A-League/25-26/` → `aLeague/{类别}/25-26/`

## 五、与英超 / 欧冠的差异（摘要）

| 维度 | epl | aLeague |
|------|-----|---------|
| 报告路径 | `epl/report/{赛季}/round-N/` | `aLeague/report/{赛季}/round-N/` |
| 赛制 | 38 轮双循环 | 26 轮常规赛 + 季后赛 |
| 策略侧重 | 争冠/争四/保级/德比 | 季后赛资格、前二优势、洲际名额（见 `s273_462` 内联赛说明） |

## 六、crawler-server 配置（摘要）

`aLeague` 已在 `cups` 中配置：`fileId: 's273_462'`，`season: '2025-2026'`，`cupScheduleData` 指向 `aLeague/data/s273_462.js`。

使用方式：`CUP_ANALYZER_CUP=aLeague node crawlers/scheduleCrawler.js` 或 `npm run crawl:schedule:aleague`。

## 七、参考

- 工作流程：[workflow.md](./workflow.md)
- 赛前模板：`prompts/match_analysis_template.md`
- 数据说明：`data/README.md`
