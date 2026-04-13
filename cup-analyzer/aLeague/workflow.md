# 澳大利亚足球超级联赛（澳超）分析工作流程

## 赛事概览

- **赛事**：澳大利亚足球超级联赛（Australia A-League / 澳超）
- **联赛序号（球探）**：**273**，子联赛 **462** → `s273_462.js` / `l273.js` / `bs273.js` / `td273.js`
- **当前内容赛季**：`25-26`（目录 `report/25-26/`、`news/25-26/` 等）；新赛季可增加平行目录如 `26-27/`
- **常规赛**：12 队、**26 轮**；胜 3 分、平 1 分、负 0 分。联赛前六进入季后赛；常规赛前两名直通季后赛准决赛等规则以球探 `arrLeague` 说明与官方规则为准。

### 赛程数据与 `clubMatchAnalyzer`（与 crawler-server 统一）

- **主文件**：`aLeague/data/s273_462.js`（子联赛 462；同目录 `l273.js`、`bs273.js`、`td273.js`）。
- **更新**：优先在 **`cup-analyzer/crawler-server`** 下执行 **`npm run crawl:schedule:aleague`**（各系统相同）。也可 `npx cross-env CUP_ANALYZER_CUP=aLeague node crawlers/scheduleCrawler.js`；Bash 简写 `CUP_ANALYZER_CUP=aLeague node …`。手写 PowerShell/cmd 见 [crawler-server/README.md](../crawler-server/README.md)。会写入 `data/`，并把赛程主文件**同步拷贝**到 `crawler-server/match_center/s273.js`（内容与 `s273_462.js` 一致，供仍按「纯序号」命名的工具使用）。
- **分析器路径**：`config.resolveScheduleData('273', false)` 指向 **`aLeague/data/s273_462.js`**。`squadTarget.leagueSerial` 填 **273** 即可，无需再手工对齐 `match_center` 与子联赛文件名。

### 从大名单到球队画像（联赛流水线）

与世界杯不同：联赛用 **`playerListCrawler` + `clubMatchAnalyzer` + `leagueSquadProcessor`** 生成 `squad/{队名}.md`；后半段 **`squadFinalInitializer`** → 人工审核 **`squad-final/`**（填写 **`## 伤停` / `## 伤疑`**）→ **`teamProfileGenerator`** → **`teamProfile/{队名}.md`**（单队、逐队改 `squadTarget.js`）。

**前置**：在 `cup-analyzer/crawler-server` 中编辑 `config/squadTarget.js`（`leagueSerial=273` 等）；赛程数据见 `aLeague/data/s273_462.js`。以下 processors 需 `CUP_ANALYZER_CUP=aLeague`（推荐上文 `npx cross-env`）。

**输出**：`aLeague/squad/` → `aLeague/squad-final/` → `aLeague/teamProfile/`。序号见 `aLeague/data/球队与序号对照表.md`。

工作目录：`cup-analyzer/crawler-server`。

以下两条任意系统相同：

```bash
npm run crawl:player-list
npm run analyze:club-domestic
```

下面三条需设置 `CUP_ANALYZER_CUP=aLeague`。**任意系统推荐**（需已在本目录执行过 `npm install`）：

```bash
npx cross-env CUP_ANALYZER_CUP=aLeague node processors/leagueSquadProcessor.js
npx cross-env CUP_ANALYZER_CUP=aLeague node processors/squadFinalInitializer.js --team <序号>
# 人工审核 aLeague/squad-final/{队名}.md
npx cross-env CUP_ANALYZER_CUP=aLeague node processors/teamProfileGenerator.js --team <序号>
```

若在 macOS / Linux 终端习惯 Bash，也可将上述三条写成 `CUP_ANALYZER_CUP=aLeague node processors/...`。手写 PowerShell/cmd 见 [crawler-server/README.md](../crawler-server/README.md)「Windows 与手动设置环境变量」。

## 三大阶段工作流

### 阶段一：赛前准备（赛季初或数据更新时）

```
1. 确认 data/ 下赛程为最新
   └─ `cd cup-analyzer/crawler-server`，再执行 **`npm run crawl:schedule:aleague`**（推荐）
      （同步更新 s273_462、l273、bs273、td273，并拷赛程至 `match_center/s273.js`；亦可 `npx cross-env CUP_ANALYZER_CUP=aLeague node crawlers/scheduleCrawler.js`；手写 Shell 见 [crawler-server/README.md](../crawler-server/README.md)）

2. 维护盘路与时间分布：`scheduleCrawler` 已拉取 l/bs/td；若需与 `league-analyzer/data` 对齐可再对照

3. 按需更新 teamProfile/ 下各队画像

4. 关注积分榜：季后赛区（前六）、前二直通优势；洲际/杯赛资格以官方与 s273_462 内说明为准
```

**大名单（每场）**：与英超/欧冠俱乐部流程一致，使用 **`cup-analyzer/crawler-server`**（`leagueSerial=273` 时由 `resolveScheduleData` 读 **`aLeague/data/s273_462.js`**）：

```
  a. 确保澳超赛程已更新（见阶段一步骤 1）
  b. 编辑 config/squadTarget.js：teamSerial、leagueSerial=273、roundSerial、isNation=false 等
  c. npm run crawl:player-list → output/player_center/{teamSerial}.json
  d. npm run analyze:club-domestic → {teamSerial}-new.json（如启用出场分析）
  e. 将双方大名单、伤停等整理进 news/{赛季}/round-N/{对阵}/
```

### 阶段二：赛中分析（每场）

```
赛前 2–3 天:
  0. 大名单与预测块：以已维护的 **`aLeague/squad-final/{队名}.md`** 为准时可运行  
     `CUP_ANALYZER_CUP=aLeague node processors/matchSquadGenerator.js --home <主队序号> --away <客队序号>`  
     生成预测首发、替补 Top9、伤疑、伤停、落选；赛前请在 `squad-final` 更新伤停/伤疑并重跑 `teamProfileGenerator` 若需同步画像。
  1. 预测首发（格式见 prompts/match_analysis_template.md）
  2. 交锋、近况、未来赛程、球探伤病摘要：`cd cup-analyzer/crawler-server`，在 `config/squadTarget.js` 填写本场 **`matchSerial`**，执行 **`npm run crawl:match-statistics`**（亦可 `-- --match <序号>`），将输出并入赛前报告或 `news/...`。（与 **`npm run generate:cycle-report`** 同源。）详见 [crawler-server/README.md](../crawler-server/README.md)「matchStatisticsCrawler」。
  3. 盘口：初盘/临场；引用 l273.js、bs273.js、td273.js
  3b. 格雷厄姆式亚盘安全边际：记录 Market（初盘/临场）→ 写 Fair（合理让球）与一行推导链 → 算 Δ → 标注三档结论（值得投 / 观望 / 反向投），定义见下 **「亚盘安全边际（格雷厄姆式）」**
  4. 澳超专项：常规赛排名、战意（季后赛资格/前二）、主客场与时差（新西兰球队等）
  5. 赛前报告 → `aLeague/report/{赛季}/round-N/{主队}_vs_{客队}.md`（大名单块见 **「报告与素材路径约定」** 中说明）

赛前 1–2 小时:
  6. 确认首发与临场盘
  7. 填写报告「结果」与星级

赛后:
  8. 可选：爬取赛后数据（matchDataCrawler 等）
  9. 赛后复盘 → postMatchSummary/{赛季}/round-N/...
```

### 阶段三：策略分析（贯穿赛季）

```
季后赛与排名:
  - 跟踪前六边界球队、前二争夺；季后赛对阵与两回合/单回合规则以当季官方为准

盘路与样本:
  - 常规赛轮次少于英超， handicap 数据可结合近况与小样本谨慎使用
```

## 关键决策原则

### 澳超 vs 英超

1. **盘路**：轮次与队伍数少于英超，`l273`/`bs273` 样本相对更小，宜结合近况。
2. **广实**：常规赛积分榜 + 季后赛名额战意；**档位与广实定位**以 `.cursor/rules/dh-match-predict-analysis/references/A-League-team-strength.md` 为准。
3. **赛制**：常规赛结束后有季后赛，分析长期战意时需区分「常规赛收官」与「季后赛阶段」。
4. **无欧战双线**：一般不出现英超式的欧冠夹联赛，但需注意跨洋客场、国家队窗口与澳足总杯等穿插。

### 亚盘安全边际（格雷厄姆式）

与下文 **「亚盘周期盈亏 HTML（霍华德·马克斯周期视角）」** 的关系：**马克斯章节**是历史盘口序列上的周期与模拟回测视角；**本章**是单场把广实换算为合理让球、与市场盘口对比的定价与安全边际视角。二者互补，不要混为一谈。

**符号约定（主队视角）**

- **Market（市场让球）**：初盘与临场亚盘，与 `l273.js` / `bs273.js`、赛前报告「盘口」一致。
- **Fair（合理让球）**：在当前信息下，主队相对客队「应开」的让球，可写单值或闭区间（如 -0.75～-1.0）。
- **记法**：主队**让球**为**负**（如让半球 **-0.5**），主队**受让**为**正**（如 **+0.5**）。
- **偏差**：**Δ = Fair − Market**（两者均为同一场、同一主队视角）。例：Fair **-1.0**、临场 Market **-0.5**，则 **Δ = -0.5**（你认为市场让得偏浅）。具体选边仍要结合水位与叙事；本节规定的是**记录方式与决策分档**。

**定位 → Fair（可审计的最小推导链）**

1. **实际定位**：**广实档位**见 `.cursor/rules/dh-match-predict-analysis/references/A-League-team-strength.md` + 常规赛积分榜 + 季后赛/前二战意 + `teamProfile/`；注意常规赛收官与季后赛阶段战意可能不同。
2. **广实差**：主客相对强度（档位或文字结论）。
3. **主场加成**与跨洋、时差（含新西兰球队客场）的经验修正。
4. **伤停与首发可信度**：相对 `squad-final` 与当场预测首发修正。
5. **战意与杯赛穿插**：澳足总杯等。
6. 输出 **Fair**（单值或区间）。

**阶段二中的操作（每场）**

在「盘口：初盘/临场」之后：**列出 Market（初盘+临场）→ 写 Fair 与一行推导链 → 计算 Δ → 标注三档之一**；赛前报告与 `prompts/match_analysis_template.md`「四、盘口解析」下的亚盘子项对齐。

**三档结论（rubric）**

- **值得投**：|Δ| 达到**自设阈值**（常见起点 **0.25～0.5 球**，可按联赛波动率校准），且无重大未决信息；仍须满足模板中「完整项目、少买」等纪律。
- **观望**：|Δ| 低于阈值，或信息不全，或高方差情境（小样本盘路、季后赛边界球队）。
- **反向投**：Fair 与 Market **方向性或幅度严重背离**，且能说明「市场假设错在哪」；默认**小仓或仅记录**。「反向」指价值在让球方向的另一侧，不是鼓励盲目加注。

以上为**纪律框架**，不保证结果。

### 报告与素材路径约定

| 类型 | 路径 |
|------|------|
| 赛前报告 | `cup-analyzer/aLeague/report/{赛季}/round-{N}/...` |
| 素材 | `cup-analyzer/aLeague/news/{赛季}/round-{N}/...` |
| 赛后 | `cup-analyzer/aLeague/postMatchSummary/{赛季}/round-{N}/...` |
| 亚盘周期 HTML | `cup-analyzer/aLeague/report/{赛季}/round-{N}/{主队}_vs_{客队}_cycle.html`（见下 **霍华德·马克斯周期视角**） |

**赛前报告中的大名单块**：`matchSquadGenerator.js` 单场输出（每队 **预测首发、预测替补、伤疑、伤停、落选**）即 **`aLeague/report/{赛季}/round-{N}/{主队}_vs_{客队}.md`** 中应写入的大名单与预测正文来源。

### 亚盘周期盈亏 HTML（霍华德·马克斯周期视角）

1. 编辑 `cup-analyzer/crawler-server/config/squadTarget.js`：设置 `matchSerial`（球探单场序号）、`roundSerial`、`season`（须与本模块 `report/{赛季}/` 目录一致，当前内容赛季多为 **`25-26`**）；`matchLeagueName` 填与球探战绩表「联赛」列一致的文案（如 **`澳超`**），供「同赛事」折线图筛选。
2. 在 `cup-analyzer/crawler-server` 执行：`cd cup-analyzer/crawler-server && CUP_ANALYZER_CUP=aLeague npm run generate:cycle-report`
3. 输出：`cup-analyzer/aLeague/report/{赛季}/round-{N}/{主队}_vs_{客队}_cycle.html`（规则同英超 workflow：每场 1000 元、水位 0.9、ECharts CDN；每队含「全部 / 仅主或仅客 / 同赛事」三张累计盈亏图）

详细目录规划见 [README.md](./README.md) 与 [PLAN.md](./PLAN.md)。
