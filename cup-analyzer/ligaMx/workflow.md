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
  # 运行前在 squadTarget.js 设置 teamSerial 和 matchTime（北京时间，YYYY-MM-DD HH:mm:ss）
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/teamScheduleProcessor.js
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/squadFinalInitializer.js --team <序号>
# 人工审核 ligaMx/squad-final/{队名}.md
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/teamProfileGenerator.js --team <序号>
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/lateGoalRanking.js
# 默认不显示趋势图；需要时在命令末尾追加 --trend。
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/asianHandicapRanking.js --round 6
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/asianHandicapHomeRanking.js --round 6
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/asianHandicapAwayRanking.js --round 6
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/overUnderRanking.js --round 6
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/overUnderHomeRanking.js --round 6
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/overUnderAwayRanking.js --round 6
```

**赛中大名单**：`npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/matchSquadGenerator.js --home <序号> --away <序号>`

## 赛前报告路径约定

赛前报告、素材目录建议与 epl 一致使用 **`25-26`** 季文件夹，例如：

- `ligaMx/report/25-26/round-{N}/{主队}_vs_{客队}.md`
- 无独立模板时可复用 [`epl/prompts/match_analysis_template.md`](../epl/prompts/match_analysis_template.md)

**周期报告 / `generate:cycle-report`**：在 `squadTarget.js` 中设置 `matchSerial`、`roundSerial`、与报告目录一致的 `season`（如 `25-26`），`matchLeagueName` 与球探「联赛」列一致；`CUP_ANALYZER_CUP=ligaMx npm run generate:cycle-report`

更细的盘口与盘路章节约定见 [`epl/workflow.md`](../epl/workflow.md) 与 [`crawler-server/README.md`](../crawler-server/README.md)

<!-- 可选命令：统计球员未首发时球队的胜平负场数和输盘率。 -->
**可选命令：球员未首发统计**（工作目录：`cup-analyzer/crawler-server`）。先生成 `output/player_center/{teamSerial}-new.json`，并在 `config/squadTarget.js` 中设置与该文件一致的 `teamSerial`、`leagueSerial`、`isNation`；统计范围沿用该文件，结果输出到终端。

```bash
# 可选：统计有首发记录的球员未首发时球队的胜、平、负场数及输盘率。
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/playerNonStartingStats.js
```

<!-- 可选命令：统计球队曾落后后追平或逆转抢回的分数排行榜。 -->
**可选命令：落后抢回分数排行榜**（工作目录：`cup-analyzer/crawler-server`）。在 `config/squadTarget.js` 中设置本赛事的 `leagueSlug`、`leagueSerial`，以及与本地 `basicData` 目录一致的 `season`。读取本赛事 `basicData/{season}/round-*/{对阵}/matchEvents.json` 和 `data/` 赛程，统计曾落后后追平（+1 分）、逆转获胜（+3 分）的排名与明细；仅统计已采集且含终场比分的比赛，结果输出到终端。杯赛按相同积分口径统计，不代表晋级结果。

```bash
# 可选：统计各队落后后抢回的分数、追平/逆转次数及比赛明细。
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/comebackPointsRanking.js
```

<!-- 可选命令：下半场积分、自定义轮次积分、历史同盘口/同档次和单场分析页统计。 -->
**可选分析命令**（工作目录：`cup-analyzer/crawler-server`）。前三条仅适用于联赛 `R_*` 轮次，在 `config/squadTarget.js` 设置对应的 `leagueSlug`、`leagueSerial`、`season`（与本地赛程一致，可用全写或短名）；杯赛/国家队杯赛不要运行前三条。历史同盘口分析另需 `roundSerial`、`matchSerial`；分档读取 `crawler-server/config/league-team-strength.json`，缺少同赛季分档时只分析同盘口，不套用旧赛季。最后一条只需 `matchSerial`，支持联赛和杯赛。结果均输出到终端。

```bash
# 可选：下半场积分榜：以全场比分减半场比分，统计下半场胜平负、进失球与积分，并与赛程提供的全场榜比较。
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/secondHalfStandings.js
# 可选：自定义轮次积分榜：示例统计第 1–6 轮；可改为 --rounds 6 或省略参数统计全部已有轮次。
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/customRoundStandings.js --rounds 1-6
# 可选：历史同盘口及同档次分析：比较目标比赛之前的主队主场、客队客场同初盘让球战绩；同档次仅使用同赛事、同赛季分档。
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/historicalHandicapAnalysis.js
# 可选：单场分析页统计：联网读取交锋、主客队近期战绩、未来比赛及页面伤病信息，交锋/近况最多各 10 场。
npx cross-env CUP_ANALYZER_CUP=ligaMx node processors/matchStatisticsProcessor.js
```



