# 墨西哥足球联赛（墨西联 / Liga MX）分析工作流程

## 赛事概览

- **赛事**：墨西哥顶级联赛（球探「墨西联」）
- **联赛序号（球探）**：**140**，子联赛 **44** → `s140_44.js` / `l140.js` / `bs140.js` / `td140.js`
- **赛程页（球探）**：`SubLeague/2025-2026/140`；爬虫 Referer 使用 SubLeague 页（见 `crawler-server/config` 中 `ligaMx.useSubLeagueReferer`）
- **当前架构赛季**：`25-26`（目录 `report/25-26/`、`news/25-26/` 等，与英超一致）；`matchResult` 赛季目录为 **`2025-2026`**
- **赛制摘要**：以球探页面「赛制」与 `s140_44.js` 内 `arrLeague`、`arrSubLeague` 为准（春秋季 / 阶段划分以当年数据为准）

### 赛程数据与 `clubMatchAnalyzer`（与 crawler-server 统一）

- **主文件**：`ligaMx/data/s140_44.js`（同目录 `l140.js`、`bs140.js`、`td140.js`）
- **更新**：`cd cup-analyzer/crawler-server`，执行 **`npm run crawl:schedule:ligamx`**（或 `npx cross-env CUP_ANALYZER_CUP=ligaMx node crawlers/scheduleCrawler.js`）。会写入 `data/`，并把赛程主文件**同步拷贝**到 `crawler-server/match_center/s140.js`
- **分析器路径**：`config.resolveScheduleData('140', false)` 指向 **`ligaMx/data/s140_44.js`**。`squadTarget.leagueSerial` 填 **140**

### 阶段一：赛前准备（赛季初或数据更新时）

- 维护 **`ligaMx/data/球队与序号对照表.md`**（与 `s140_44.js` 内 `arrTeam` 核对）
- 可选：维护 `ligaMx/data/冠军赔率.md`（供 `teamProfileGenerator` 等；用法同 [`epl/workflow.md`](../epl/workflow.md)）

### 从大名单到球队画像（联赛流水线）

与世界杯不同：联赛用 **`playerListCrawler` + `clubMatchAnalyzer` + `leagueSquadProcessor`** 生成 `squad/{队名}.md`；**`squadFinalInitializer`** → 人工审核 **`squad-final/`**（`## 伤停` / `## 伤疑`）→ **`teamProfileGenerator`** → **`teamProfile/{队名}.md`**

**前置**：`cd cup-analyzer/crawler-server`；**`CUP_ANALYZER_CUP=ligaMx`**；`squadTarget.leagueSerial=140`、`squadTarget.leagueSlug=ligamx`（若流程依赖）；`matchLeagueName` 填与球探战绩表「联赛」列**一致**的文案。赛程见 `ligaMx/data/s140_44.js`

**输出**：`ligaMx/squad/` → `ligaMx/squad-final/` → `ligaMx/teamProfile/`。球队序号见 `ligaMx/data/球队与序号对照表.md`

```bash
npm run crawl:player-list:club
npm run analyze:club-domestic
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/leagueSquadProcessor.js
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/squadFinalInitializer.js --team <序号>
# 人工审核 ligaMx/squad-final/{队名}.md
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/teamProfileGenerator.js --team <序号>
```

**赛中大名单**：`npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/matchSquadGenerator.js --home <序号> --away <序号>`

## 赛前报告路径约定

赛前报告、素材目录建议与 epl 一致使用 **`25-26`** 季文件夹，例如：

- `ligaMx/report/25-26/round-{N}/{主队}_vs_{客队}.md`
- 无独立模板时可复用 [`epl/prompts/match_analysis_template.md`](../epl/prompts/match_analysis_template.md)

**周期报告 / `generate:cycle-report`**：在 `squadTarget.js` 中设置 `matchSerial`、`roundSerial`、与报告目录一致的 `season`（如 `25-26`），`matchLeagueName` 与球探「联赛」列一致；`CUP_ANALYZER_CUP=ligaMx npm run generate:cycle-report`

更细的盘口与盘路章节约定见 [`epl/workflow.md`](../epl/workflow.md) 与 [`crawler-server/README.md`](../crawler-server/README.md)
