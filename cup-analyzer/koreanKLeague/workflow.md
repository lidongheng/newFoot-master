# 韩国K联赛（K League 1）分析工作流程

## 赛事概览

- **赛事**：K League 1（韩K联）
- **联赛序号（球探）**：**15**，子联赛 **313** → `s15_313.js`（同目录可维护 `l15.js`、`bs15.js`、`td15.js` 等，与 `scheduleCrawler` 约定一致）
- **当前架构赛季**：按 `crawler-server/config` 中 `koreanKLeague.season` 与目录 `report/{赛季}/` 等对齐

### 赛程数据

- **主文件**：`koreanKLeague/data/s15_313.js`
- **更新**：优先 **`npm run crawl:schedule:kleague`**（在 **`cup-analyzer/crawler-server`** 下，各系统相同）。也可 `npx cross-env CUP_ANALYZER_CUP=koreanKLeague node crawlers/scheduleCrawler.js`。详见 [crawler-server/README.md](../crawler-server/README.md)
- **分析器路径**：`config.resolveScheduleData('15', false)` 指向 **`koreanKLeague/data/s15_313.js`**

### 从大名单到球队画像（联赛流水线）

与世界杯不同：用 **`playerListCrawler` + `clubMatchAnalyzer` + `leagueSquadProcessor`** 生成 `squad/{队名}.md`；后半段 **`squadFinalInitializer`** → 人工审核 **`squad-final/`** → **`teamProfileGenerator`** → **`teamProfile/{队名}.md`**（单队、逐队改 `squadTarget.js`）。

**前置**：在 `cup-analyzer/crawler-server` 中编辑 `config/squadTarget.js`（`leagueSerial=15`、`teamSerial`、`roundSerial`）；序号见 `koreanKLeague/data/球队与序号对照表.md`。以下 processors 需 `CUP_ANALYZER_CUP=koreanKLeague`（推荐上文 `npx cross-env`）。

**输出路径**：`koreanKLeague/squad/` → `koreanKLeague/squad-final/` → `koreanKLeague/teamProfile/`。

工作目录：`cup-analyzer/crawler-server`。

以下两条任意系统相同：

```bash
npm run crawl:player-list:club
npm run analyze:club-domestic
```

下面三条需设置 `CUP_ANALYZER_CUP=koreanKLeague`。**任意系统推荐**：

```bash
npx cross-env CUP_ANALYZER_CUP=koreanKLeague node processors/leagueSquadProcessor.js
npx cross-env CUP_ANALYZER_CUP=koreanKLeague node processors/squadFinalInitializer.js --team <序号>
# 人工审核 koreanKLeague/squad-final/{队名}.md
npx cross-env CUP_ANALYZER_CUP=koreanKLeague node processors/teamProfileGenerator.js --team <序号>
```

若在 macOS / Linux 终端习惯 Bash，也可将上述三条写成 `CUP_ANALYZER_CUP=koreanKLeague node processors/...`。手写 PowerShell/cmd 见 [crawler-server/README.md](../crawler-server/README.md)「Windows 与手动设置环境变量」。

**伤停/伤疑**：在 `squad-final/{队名}.md` 的 **`## 伤停` / `## 伤疑`** 中维护（初始化由 `squadFinalInitializer` 插入）；`teamProfileGenerator` 会写入画像。**赛中大名单**：`cd cup-analyzer/crawler-server && npx cross-env CUP_ANALYZER_CUP=koreanKLeague node processors/matchSquadGenerator.js --home <序号> --away <序号>`（联赛逻辑：替补 Top9 按出场，含落选）。

## 赛前报告与大名单正文约定

`matchSquadGenerator.js` 单场输出（每队 **预测首发、预测替补、伤疑、伤停、落选**）应写入该场赛前报告 **`koreanKLeague/report/{赛季}/round-{N}/{主队}_vs_{客队}.md`** 的正文，作为大名单与预测部分（目录与命名与 `epl/`、`aLeague/` 对齐时可按当季 `report/` 结构微调）。**赛前报告「四、盘口解析」下须包含**：合理让球（Fair）、初盘/临场（Market）、Δ、三档结论（与下 **「亚盘安全边际」** 一致）；本模块无独立 `prompts/match_analysis_template.md` 时，可直接复用 `epl/prompts/match_analysis_template.md` 结构。

## 阶段二：赛中分析（每场）

```
赛前 2–3 天:
  0. 大名单与预测块：以 **`koreanKLeague/squad-final/{队名}.md`** 为准时可运行  
     `cd cup-analyzer/crawler-server && npx cross-env CUP_ANALYZER_CUP=koreanKLeague node processors/matchSquadGenerator.js --home <主队序号> --away <客队序号>`  
     赛前请在 `squad-final` 更新伤停/伤疑并重跑 `teamProfileGenerator` 若需同步画像。
  1. 预测首发（结构与 `epl/prompts/match_analysis_template.md` 对齐）
  2. 交锋、近况、未来赛程、球探伤病摘要：`cd cup-analyzer/crawler-server`，在 `config/squadTarget.js` 填写本场 **`matchSerial`**，执行 **`npm run crawl:match-statistics`**（亦可 `-- --match <序号>`），将输出并入赛前报告或 `news/...`。（与 **`npm run generate:cycle-report`** 同源。）详见 [crawler-server/README.md](../crawler-server/README.md)「matchStatisticsCrawler」。
  3. 盘口（初盘与临场 + 盘路三块固定句式；勿用空泛盘口闲聊替代数据块；`koreanKLeague/data/` 下文件名以当季实际为准）：
     - 初盘全场/半场让球、大小球盘口等仍以 `koreanKLeague/data/s15_313.js` 为准，报告章节层级见 `epl/prompts/match_analysis_template.md`「四、盘口解析」。
     - **亚盘「盘口分析」内须有「盘路数据」**（数据来自 `l15.js`）：连续三行 **总盘**、**主场**、**客场**；每行双方 **净胜盘** 与 **联赛排名**，句式与 `epl/report/25-26/round-14/arsenal_vs_brentford.md` 中「盘路数据」同构。
     - **「### 3、大小」下须有「大小球盘路数据」**（来自 `bs15.js`）：同样三行；每行双方 **大球率%** 与 **排名**。
     - **「75分钟后进球数分析」**（来自 `td15.js`）：含小标题 **本场比赛球队数据**；每队一行，格式为 `队名：共N球（75分钟后总进球），排第k（该项联赛排名）(76-80分钟: …, 81-85分钟: …, 86-90分钟含补时: …)`，其中 **76–90 为比赛分钟区间**，非文档行号。
  3b. 格雷厄姆式亚盘安全边际：记录 Market（初盘/临场）→ 写 Fair（合理让球）与一行推导链 → 算 Δ → 标注三档结论（值得投 / 观望 / 反向投），定义见下 **「亚盘安全边际（格雷厄姆式）」**
  4. 韩K 专项：积分榜、附加赛/保级战意、亚冠资格等
  5. 赛前报告 → `koreanKLeague/report/{赛季}/round-{N}/{主队}_vs_{客队}.md`

赛前 1–2 小时:
  6. 确认首发与临场盘
  7. 填写报告「结果」与星级

赛后:
  8. 可选：赛后数据与复盘 → `postMatchSummary/...`
```

## 关键决策原则

### 韩K 定位要点

1. **盘路**：结合 `l15`/`bs15` 与近况；样本量按当季自校。
2. **广实**：常规赛积分榜 + `teamProfile/` + 战意（争冠、亚冠、保级）；**档位与广实定位**若已整理为文档，放在 `.cursor/rules/dh-match-predict-analysis/references/`（与同目录 `*-team-strength.md` 命名一致，便于与英超等统一查阅）。

### 亚盘安全边际（格雷厄姆式）

与下文 **「亚盘周期盈亏 HTML（霍华德·马克斯周期视角）」** 的关系：**马克斯章节**是历史盘口序列上的周期与模拟回测视角；**本章**是单场把广实换算为合理让球、与市场盘口对比的定价与安全边际视角。二者互补，不要混为一谈。

**符号约定（主队视角）**

- **Market（市场让球）**：初盘与临场亚盘，与 `l15.js` / `bs15.js`、赛前报告「盘口」一致。
- **Fair（合理让球）**：在当前信息下，主队相对客队「应开」的让球，可写单值或闭区间（如 -0.75～-1.0）。
- **记法**：主队**让球**为**负**（如让半球 **-0.5**），主队**受让**为**正**（如 **+0.5**）。
- **偏差**：**Δ = Fair − Market**（两者均为同一场、同一主队视角）。例：Fair **-1.0**、临场 Market **-0.5**，则 **Δ = -0.5**（你认为市场让得偏浅）。具体选边仍要结合水位与叙事；本节规定的是**记录方式与决策分档**。

**定位 → Fair（可审计的最小推导链）**

1. **实际定位**：**广实档位**以 `.cursor/rules/dh-match-predict-analysis/references/` 内韩 K 相关 `*-team-strength.md` 为准（若尚未建文件，先沿用积分榜 + 画像文字档）+ 常规赛积分榜 + 争冠/亚冠/保级战意 + `teamProfile/`。
2. **广实差**：主客相对强度（档位或文字结论）。
3. **主场加成**：K 联赛主场经验区间（与历史复盘自校）。
4. **伤停与首发可信度**：相对 `squad-final` 与当场预测首发修正。
5. **赛程与杯赛**：足总杯等穿插。
6. 输出 **Fair**（单值或区间）。

**阶段二中的操作（每场）**

在完成阶段二步骤 **3**（`l15`/`bs15`/`td15` 固定句式与初临场记录）之后：**列出 Market（初盘+临场）→ 写 Fair 与一行推导链 → 计算 Δ → 标注三档之一**。

**三档结论（rubric）**

- **值得投**：|Δ| 达到**自设阈值**（常见起点 **0.25～0.5 球**，可按联赛波动率校准），且无重大未决信息；仍须满足「完整项目、少买」等纪律。
- **观望**：|Δ| 低于阈值，或信息不全，或高方差情境。
- **反向投**：Fair 与 Market **方向性或幅度严重背离**，且能说明「市场假设错在哪」；默认**小仓或仅记录**。「反向」指价值在让球方向的另一侧，不是鼓励盲目加注。

以上为**纪律框架**，不保证结果。

### 报告与素材路径约定

| 类型 | 路径 |
|------|------|
| 赛前报告 | `cup-analyzer/koreanKLeague/report/{赛季}/round-{N}/...` |
| 素材 | `cup-analyzer/koreanKLeague/news/{赛季}/round-{N}/...` |
| 赛后 | `cup-analyzer/koreanKLeague/postMatchSummary/{赛季}/round-{N}/...` |
| 亚盘周期 HTML | `cup-analyzer/koreanKLeague/report/{赛季}/round-{N}/{主队}_vs_{客队}_cycle.html`（见下 **霍华德·马克斯周期视角**） |

`{赛季}` 与 `crawler-server/config` 中 `koreanKLeague` 及本目录 `report/{赛季}/` 对齐。

### 亚盘周期盈亏 HTML（霍华德·马克斯周期视角）

1. 编辑 `cup-analyzer/crawler-server/config/squadTarget.js`：设置 `matchSerial`、`roundSerial`、`season`（须与 `koreanKLeague/report/{赛季}/` 一致）；`matchLeagueName` 填与球探战绩表「联赛」列一致的文案，供「同赛事」折线图筛选。
2. 在 `cup-analyzer/crawler-server` 执行：`cd cup-analyzer/crawler-server && npx cross-env CUP_ANALYZER_CUP=koreanKLeague npm run generate:cycle-report`
3. 输出：`cup-analyzer/koreanKLeague/report/{赛季}/round-{N}/{主队}_vs_{客队}_cycle.html`（规则同英超 workflow：每场 1000 元、水位 0.9、ECharts CDN；每队含「全部 / 仅主或仅客 / 同赛事」三张累计盈亏图）

## 赛中与策略

赛前报告、新闻素材、赛后复盘等目录约定与 `epl/`、`aLeague/` 同级模块一致时，可在此模块下维护 `report/`、`news/`、`postMatchSummary/` 等；详见 [README.md](./README.md)。
