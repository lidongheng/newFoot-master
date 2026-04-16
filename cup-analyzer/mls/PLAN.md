# 美国职业大联盟（MLS / 美职联）分析项目方案

> 持续迭代文档。最后更新: 2026-04-12

## 一、项目全景

在 `cup-analyzer/mls/` 分析美职联（Major League Soccer），与 `epl/`、`aLeague/`、`koreanKLeague/` 同级，并与 `crawler-server` 的 **`s21_165.js`** 赛程数据对齐。

## 二、实施进度

| 任务 | 状态 | 说明 |
|------|------|------|
| 创建目录与 PLAN / workflow / README | 已完成 | 本目录根文档 |
| 扩展 crawler-server（`CUP_ANALYZER_CUP=mls`） | 已完成 | [config/index.js](../crawler-server/config/index.js) |
| 同步 data（`s21_165` + `l21`/`bs21`/`td21`） | 已完成 | 赛程由 `npm run crawl:schedule:mls` 拉取 |
| 复制 prompts 模板 | 已完成 | `prompts/match_analysis_template.md` |
| 可选：rule/、strategy/、description/ | 未开始 | 对齐英超模块时可补充 |

## 三、目录结构（摘要）

详见 [README.md](./README.md) 与 [cup-analyzer/README.md](../README.md)。核心子目录：`data/`、`report/2026/`、`news/2026/`、`postMatchSummary/2026/`、`teamProfile/`、`prompts/`。

## 四、数据与序号

- **联赛序号**：球探 **21**，子联赛 **165** → `s21_165.js`；盘路等与 **21** 前缀一致：`l21.js`、`bs21.js`、`td21.js`
- **赛季目录（titan007）**：`2026`（与 `matchResult/2026/` 一致）

## 五、crawler-server 配置（摘要）

`mls` 已在 `cups` 中配置：`fileId: 's21_165'`，`season: '2026'`，`cupScheduleData` 指向 `mls/data/s21_165.js`。

使用方式：`CUP_ANALYZER_CUP=mls node crawlers/scheduleCrawler.js` 或 `npm run crawl:schedule:mls`。

## 六、参考

- 工作流程：[workflow.md](./workflow.md)
- 赛前模板：`prompts/match_analysis_template.md`
- 数据说明：`data/README.md`
