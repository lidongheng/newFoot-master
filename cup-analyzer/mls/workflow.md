# 美国职业大联盟（MLS / 美职联）分析工作流程

## 赛事概览

- **赛事**：美国职业大联盟（Major League Soccer / 美职联）
- **联赛序号（球探）**：**21**，子联赛 **165**（常规赛）→ `s21_165.js` / `l21.js` / `bs21.js` / `td21.js`
- **当前内容赛季**：`2026`（目录 `report/2026/`、`news/2026/` 等）
- **赛制摘要**：东西区、常规赛 **34 轮**（以 `arrSubLeague` 为准）；胜 3 分、平 1 分、负 0 分；季后赛规则见球探 `arrLeague` 长说明与官方规则

### 赛程数据与 `clubMatchAnalyzer`（与 crawler-server 统一）

- **主文件**：`mls/data/s21_165.js`（子联赛 165；同目录 `l21.js`、`bs21.js`、`td21.js`）。
- **更新**：`CUP_ANALYZER_CUP=mls node crawlers/scheduleCrawler.js`（或 `npm run crawl:schedule:mls`）会写入 `data/`，并把赛程主文件**同步拷贝**到 `crawler-server/match_center/s21.js`。
- **分析器路径**：`config.resolveScheduleData('21', false)` 指向 **`mls/data/s21_165.js`**。`squadTarget.leagueSerial` 填 **21**。

### 阶段一：赛前准备（赛季初或数据更新时）

- 维护 **`mls/data/冠军赔率.md`**（MLS Cup / 支持者盾等夺冠相关盘口，供 `teamProfileGenerator` 生成画像「冠军赔率 / 赔率定位」）、**`mls/data/球队与序号对照表.md`**（扩缩军或序号变更时与 `s21_165.js` 内 `arrTeam` 核对）。

### 从大名单到球队画像（联赛流水线）

与世界杯不同：联赛用 **`playerListCrawler` + `clubMatchAnalyzer` + `leagueSquadProcessor`** 生成 `squad/{队名}.md`；后半段 **`squadFinalInitializer`** → 人工审核 **`squad-final/`**（填写 **`## 伤停` / `## 伤疑`**）→ **`teamProfileGenerator`** → **`teamProfile/{队名}.md`**（单队、逐队改 `squadTarget.js`）。

**前置**：`cd cup-analyzer/crawler-server`；`CUP_ANALYZER_CUP=mls`；`squadTarget.leagueSerial=21`；赛程 `mls/data/s21_165.js`。

**输出**：`mls/squad/` → `mls/squad-final/` → `mls/teamProfile/`。序号见 `mls/data/球队与序号对照表.md`。

**广实 / 定位**：联赛积分榜 + **`data/冠军赔率.md`** + **`teamProfile/`**（与 [`epl/workflow.md`](../epl/workflow.md) 中冠军赔率用法一致）。

```bash
npm run crawl:player-list
npm run analyze:club-domestic
CUP_ANALYZER_CUP=mls node processors/leagueSquadProcessor.js
CUP_ANALYZER_CUP=mls node processors/squadFinalInitializer.js --team <序号>
# 人工审核 mls/squad-final/{队名}.md
CUP_ANALYZER_CUP=mls node processors/teamProfileGenerator.js --team <序号>
```

**伤停/伤疑**：在 `squad-final/{队名}.md` 的 **`## 伤停` / `## 伤疑`** 中维护；`teamProfileGenerator` 会写入画像。**赛中大名单**：`cd cup-analyzer/crawler-server && CUP_ANALYZER_CUP=mls node processors/matchSquadGenerator.js --home <序号> --away <序号>`。

## 赛前报告与大名单正文约定

`matchSquadGenerator.js` 单场输出应写入该场赛前报告 **`mls/report/2026/round-{N}/{主队}_vs_{客队}.md`** 的正文。**赛前报告「四、盘口解析」**须包含：合理让球（Fair）、初盘/临场（Market）、Δ、三档结论；无独立模板时可复用 `epl/prompts/match_analysis_template.md` 或本模块 `prompts/match_analysis_template.md`。

## 阶段二：赛中分析（每场）

```
赛前 2–3 天:
  0. 大名单与预测块：以 **`mls/squad-final/{队名}.md`** 为准时可运行  
     `cd cup-analyzer/crawler-server && CUP_ANALYZER_CUP=mls node processors/matchSquadGenerator.js --home <主队序号> --away <客队序号>`  
  1. 预测首发（结构与 `prompts/match_analysis_template.md` 对齐）
  2. 交锋、近况、未来赛程、球探伤病摘要：`cd cup-analyzer/crawler-server`，在 `config/squadTarget.js` 填写本场 **`matchSerial`**，执行 **`npm run crawl:match-statistics`**（亦可 `-- --match <序号>`），将输出并入赛前报告或 `news/...`。（与 **`npm run generate:cycle-report`** 同源。）详见 [crawler-server/README.md](../crawler-server/README.md)「matchStatisticsCrawler」。
  3. 盘口（初盘与临场 + 盘路三块固定句式；勿用空泛盘口闲聊替代数据块）：
     - 初盘全场/半场让球、大小球盘口等仍以 `mls/data/s21_165.js` 为准，报告章节层级见 `prompts/match_analysis_template.md` 或 `epl/prompts/match_analysis_template.md`「四、盘口解析」。
     - **亚盘「盘口分析」内须有「盘路数据」**（数据来自 `mls/data/l21.js`）：连续三行 **总盘**、**主场**、**客场**；每行双方 **净胜盘** 与 **联赛排名**，句式与 `epl/report/25-26/round-14/arsenal_vs_brentford.md` 中「盘路数据」同构。
     - **「### 3、大小」下须有「大小球盘路数据」**（来自 `bs21.js`）：同样三行；每行双方 **大球率%** 与 **排名**。
     - **「75分钟后进球数分析」**（来自 `td21.js`）：含小标题 **本场比赛球队数据**；每队一行，格式为 `队名：共N球（75分钟后总进球），排第k（该项联赛排名）(76-80分钟: …, 81-85分钟: …, 86-90分钟含补时: …)`，其中 **76–90 为比赛分钟区间**，非文档行号。
  3b. 格雷厄姆式亚盘安全边际：Market → Fair → Δ → 三档结论（与英超 workflow 定义一致时可交叉引用）
  4. 美职联专项：东西区排名、季后赛资格与外卡、跨区客场等
  5. 赛前报告 → `mls/report/2026/round-{N}/{主队}_vs_{客队}.md`

赛前 1–2 小时:
  6. 确认首发与临场盘
  7. 填写报告「结果」与星级

赛后:
  8. 可选：赛后数据与复盘 → `postMatchSummary/2026/...`
```

### 亚盘安全边际（格雷厄姆式）

与下文 **「亚盘周期盈亏 HTML（霍华德·马克斯周期视角）」** 的关系：**马克斯章节**是历史盘口序列上的周期与模拟回测视角；**本章**是单场把广实换算为合理让球、与市场盘口对比的定价与安全边际视角。二者互补，不要混为一谈。

阶段二步骤 **3b**（Market → Fair → Δ → 三档结论）与 `prompts/match_analysis_template.md`「四、盘口解析」及 [`epl/workflow.md`](../epl/workflow.md) 中亚盘安全边际符号约定一致时可交叉引用。

## 报告与素材路径约定

| 类型 | 路径 |
|------|------|
| 赛前报告 | `cup-analyzer/mls/report/2026/round-{N}/...` |
| 素材 | `cup-analyzer/mls/news/2026/round-{N}/...` |
| 赛后 | `cup-analyzer/mls/postMatchSummary/2026/round-{N}/...` |
| 亚盘周期 HTML | `cup-analyzer/mls/report/2026/round-{N}/{主队}_vs_{客队}_cycle.html`（见下 **霍华德·马克斯周期视角**） |

### 亚盘周期盈亏 HTML（霍华德·马克斯周期视角）

1. 编辑 `cup-analyzer/crawler-server/config/squadTarget.js`：设置 `matchSerial`（球探单场序号）、`roundSerial`、`season`（须与报告目录一致，美职联建议 **`2026`**）；`matchLeagueName` 填与球探战绩表「联赛」列一致的文案（如 **`美职业`**），供「同赛事」折线图筛选。
2. 在 `cup-analyzer/crawler-server` 执行：`cd cup-analyzer/crawler-server && CUP_ANALYZER_CUP=mls npm run generate:cycle-report`
3. 输出：`cup-analyzer/mls/report/2026/round-{N}/{主队}_vs_{客队}_cycle.html`（ECharts 远程 CDN；每场模拟投注 1000 元、固定港盘水位 0.9，初盘盘口来自球探分析页；每队含「全部 / 仅主或仅客 / 同赛事」三张累计盈亏图）

详细目录规划见 [README.md](./README.md) 与 [PLAN.md](./PLAN.md)。
