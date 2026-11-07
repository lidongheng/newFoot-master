# 澳大利亚足球超级联赛（澳超）分析工作流程

## 赛事概览

- **赛事**：澳大利亚足球超级联赛（Australia A-League / 澳超）
- **联赛序号（球探）**：**273**，子联赛 **462** → `s273.js` / `l273.js` / `bs273.js` / `td273.js`
- **现有报告目录赛季**：`25-26`（如 `report/25-26/`、`news/25-26/`）；当前 2026-27 赛季使用平行目录 `26-27/`。
- **赛季配置**：懂球帝名单与赛程使用 `crawler-server/config/squadTarget.js` 的 `season`（当前应设为 `2026-2027`）；球探赛程爬虫使用 `crawler-server/config/index.js` 中 `aLeague.season`（仓库当前值仍为 `2025-2026`），运行当前赛季赛程爬取前须将该值更新为 `2026-2027`。
- **常规赛**：12 队、**26 轮**；胜 3 分、平 1 分、负 0 分。联赛前六进入季后赛；常规赛前两名直通季后赛准决赛等规则以球探 `arrLeague` 说明与官方规则为准。

### 赛程数据与 `clubMatchAnalyzer`（与 crawler-server 统一）

- **主文件**：`aLeague/data/s273.js`（子联赛 462；同目录 `l273.js`、`bs273.js`、`td273.js`）。
- **更新**：优先在 **`cup-analyzer/crawler-server`** 下执行 **`npm run crawl:schedule:aleague`**（各系统相同）。也可 `npx cross-env CUP_ANALYZER_CUP=aLeague node crawlers/scheduleCrawler.js`；Bash 简写 `CUP_ANALYZER_CUP=aLeague node …`。手写 PowerShell/cmd 见 [crawler-server/README.md](../crawler-server/README.md)。会写入 `data/`，并把赛程主文件**同步拷贝**到 `crawler-server/match_center/s273.js`（内容与 `s273.js` 一致，供仍按「纯序号」命名的工具使用）。
- **分析器路径**：`config.resolveScheduleData('273', false)` 指向 **`aLeague/data/s273.js`**。`squadTarget.leagueSerial` 填 **273** 即可，无需再手工对齐 `match_center` 与子联赛文件名。

### 从大名单到球队画像（联赛流水线）

与世界杯不同：联赛用 **`playerListCrawler` + `clubMatchAnalyzer` + `leagueSquadProcessor`** 生成 `squad/{队名}.md`；后半段 **`squadFinalInitializer`** → 人工审核 **`squad-final/`**（填写 **`## 伤停` / `## 伤疑`**，每行 `球衣号-姓名`）→ **`teamProfileGenerator`** → **`teamProfile/{队名}.md`**（单队、逐队改 `squadTarget.js`）。

**前置**：在 `cup-analyzer/crawler-server` 中编辑 `config/squadTarget.js`：`leagueSerial='273'`、`leagueSlug='aLeague'`、`season='2026-2027'`、当前球队的 `teamSerial`、`teamChineseName` 和 `roundSerial`，并设 `isNation=false`。懂球帝抓取通过 `aLeague/data/config.json` 按球探球队序号找到懂球帝球队 ID；赛程分析读取 `aLeague/data/s273.js`。processors 需 `CUP_ANALYZER_CUP=aLeague`（推荐使用下文 `npx cross-env`）。

**输出**：`aLeague/squad/` → `aLeague/squad-final/` → `aLeague/teamProfile/`。球队序号见 `aLeague/data/球队与序号对照表.md`；懂球帝与球探映射见 `aLeague/data/config.json`。

工作目录：`cup-analyzer/crawler-server`。

**大名单数据源**：`npm run crawl:player-list:club` 默认抓取懂球帝；也可通过 `-w` 指定来源。选择球探或显式指定懂球帝时使用：

```bash
npm run crawl:player-list:club -- -w qiutan
npm run crawl:player-list:club -- -w dqd
```

省略 `-w dqd` 时默认抓取懂球帝。球探来源通过球探球员资料补充俱乐部与转会记录；懂球帝来源使用 `aLeague/data/config.json` 找到球队名单和赛程，并抓取球员资料、能力值和转会记录。两种来源都写入 `output/player_center/{teamSerial}.json`，抓取完成后再运行 `analyze:club-domestic`。当前懂球帝名单脚本的联赛统计筛选仍固定使用赛事 ID `4`（英超），因此澳超球员的懂球帝联赛出场统计不能作为澳超统计使用；澳超出场数以球探 `-w qiutan` 数据及 `analyze:club-domestic` 结果为准。

如需同时更新懂球帝未来赛程缓存和球探球员名单，先运行懂球帝来源，再运行球探来源；后一次会覆盖 `player_center/{teamSerial}.json`，但不会删除已写入的 `output/{teamSerial}-schedule.json`：

```bash
npm run crawl:player-list:club -- -w dqd
npm run crawl:player-list:club -- -w qiutan
```

以下两条任意系统相同：

```bash
npm run crawl:player-list:club
npm run analyze:club-domestic
```

下面三条需设置 `CUP_ANALYZER_CUP=aLeague`。**任意系统推荐**（需已在本目录执行过 `npm install`）：

```bash
npx cross-env CUP_ANALYZER_CUP=aLeague node processors/leagueSquadProcessor.js
npx cross-env CUP_ANALYZER_CUP=aLeague node processors/squadFinalInitializer.js --team <序号>
# 人工审核 aLeague/squad-final/{队名}.md
npx cross-env CUP_ANALYZER_CUP=aLeague node processors/teamProfileGenerator.js --team <序号>
```

`teamProfileGenerator` 会在球队画像的预测首发后生成预测替补：门将 1 人、后卫 3 人、中场 3 人、前锋 2 人。门将按球衣号升序，无号码者排在有号码者后；其他位置先选与同组首发标准位置代码相同的球员，再按赛季首发数补足，并列沿用名单顺序。只排除 `## 伤停` 球员，`## 伤疑` 球员仍可入选；位置组名额不足时从其他已识别位置组补足，全队可用球员不足 9 人时只输出实际人数，不生成占位球员。缺少阵型或无法选出首发球员时不生成预测替补栏。

这套选择规则只用于球队画像。下方 `matchSquadGenerator.js` 的单场文案仍按自身出场数规则生成 Top 9 替补，两者不要混用。

若在 macOS / Linux 终端习惯 Bash，也可将上述三条写成 `CUP_ANALYZER_CUP=aLeague node processors/...`。手写 PowerShell/cmd 见 [crawler-server/README.md](../crawler-server/README.md)「Windows 与手动设置环境变量」。

可选：在 `teamProfile/{队名}.md` 中补充球员转会、跨州与跨洋旅行、赛程密度、伤病等赛前分析信息。

## 三大阶段工作流

### 阶段一：赛前准备（赛季初或数据更新时）

```
1. 确认 data/ 下赛程为最新
   └─ `cd cup-analyzer/crawler-server`，再执行 **`npm run crawl:schedule:aleague`**（推荐）
      （同步更新 s273、l273、bs273、td273，并拷赛程至 `match_center/s273.js`；亦可 `npx cross-env CUP_ANALYZER_CUP=aLeague node crawlers/scheduleCrawler.js`；手写 Shell 见 [crawler-server/README.md](../crawler-server/README.md)）

2. 维护 `data/冠军赔率.md`、`data/球队与序号对照表.md`；盘路与时间分布由 `scheduleCrawler` 更新 `l273` / `bs273` / `td273`

3. 按需更新 `teamProfile/` 下各队画像

4. 关注积分榜：季后赛区（前六）、前二直通优势；洲际/杯赛资格以官方与 s273 内说明为准
```

**大名单（每场）**：与英超/欧冠俱乐部流程一致，使用 **`cup-analyzer/crawler-server`**（`leagueSerial=273` 时由 `resolveScheduleData` 读 **`aLeague/data/s273.js`**）：

```
  a. 确保澳超赛程已更新（见阶段一步骤 1）
  b. 编辑 config/squadTarget.js：teamSerial、leagueSerial=273、leagueSlug=aLeague、season=2026-2027、roundSerial、teamChineseName、isNation=false 等
  c. npm run crawl:player-list:club -- -w qiutan → output/player_center/{teamSerial}.json
  d. npm run analyze:club-domestic → {teamSerial}-new.json（如启用出场分析）
  e. 将双方大名单、伤停等整理进 news/{赛季}/round-N/{对阵}/
```

### 阶段二：赛中分析（每场）

```
赛前 2–3 天:
  0. 大名单与预测块（基于球队画像流水线，优先不再每场重复爬取）
     - 双方大名单与「推荐首发」以 **`aLeague/squad-final/{队名}.md`** 为准；赛前在对应 `squad-final` 中更新 **伤停 / 伤疑** 后，可重跑 `teamProfileGenerator` 同步画像。
     - 一键生成单场用文案（预测首发、按出场数排序的预测替补 Top 9、伤疑、伤停、落选；此规则仅用于单场文案，与球队画像替补规则分开）：
       `npx cross-env CUP_ANALYZER_CUP=aLeague npm run generate:match-squad -- --home <主队序号> --away <客队序号>`
       （也可在 Bash 中运行 `CUP_ANALYZER_CUP=aLeague node processors/matchSquadGenerator.js --home <主队序号> --away <客队序号>`。）
  1. 预测首发（格式见 prompts/match_analysis_template.md）
  2. 交锋、近况与球探伤病摘要：在 `cup-analyzer/crawler-server/config/squadTarget.js` 填写本场 **`matchSerial`**，执行 **`npm run crawl:match-statistics`**（亦可 `npm run crawl:match-statistics -- --match <序号>`），将输出并入赛前报告或 `news/...`。（与 **`npm run generate:cycle-report`** 共用抓取与解析层。）详见 [crawler-server/README.md](../crawler-server/README.md)「matchStatisticsCrawler」。
     - **未来赛程分析（必做，使用 `dh-team-schedule`）**：分别查询双方从本场计划开球时间起未来 14 天内的全部赛事，按技能规定输出开球时间、赛事、对手和距上一场开球的间隔；对本场前及未来赛程的相邻场次按休息间隔标注预警：**低于 67 小时为红色，67–92 小时（含边界）为黄色，超过 92 小时为绿色**。将预警、未来赛程密度及紧邻的杯赛纳入赛前报告「未来赛程/赛程分析」，评估体能与轮换风险。查询使用 `aLeague/data/config.json` 的球队映射和 `crawler-server/output/{qiutanSerial}-schedule.json`；该 schedule 文件由懂球帝来源 `-w dqd` 抓取生成，球探来源 `-w qiutan` 不生成它。若赛程文件缺失，按技能说明指出实际缺项，不推测赛程、比分或间隔。
     - **新闻发布会与伤停新闻搜集（必做）**：上网搜集双方最新的新闻发布会/主帅采访和球队伤停新闻，分别总结发布会中的阵容、伤停、轮换与战意信息，以及各队已确认伤停和存疑球员；记录来源与发布时间，区分已确认信息和未确认消息，并将摘要并入本场赛前报告或 `aLeague/news/...`。
  3. 盘口（初盘与临场 + 盘路三块固定句式；勿用空泛盘口闲聊替代数据块）：
     - 初盘全场/半场让球、大小球盘口等仍以 `aLeague/data/s273.js` 为准，报告章节层级见 `prompts/match_analysis_template.md`「四、盘口解析」。
     - **亚盘「盘口分析」内须有「盘路数据」**（数据来自 `aLeague/data/l273.js`）：连续三行 **总盘**、**主场**、**客场**；每行双方 **净胜盘** 与 **联赛排名**，句式与 `epl/report/25-26/round-14/arsenal_vs_brentford.md` 中「盘路数据」同构。
     - **「### 3、大小」下须有「大小球盘路数据」**（来自 `bs273.js`）：同样三行；每行双方 **大球率%** 与 **排名**。
     - **「75分钟后进球数分析」**（来自 `td273.js`）：含小标题 **本场比赛球队数据**；每队一行，格式为 `队名：共N球（75分钟后总进球），排第k（该项联赛排名）(76-80分钟: …, 81-85分钟: …, 86-90分钟含补时: …)`，其中 **76–90 为比赛分钟区间**，非文档行号。
  3b. 格雷厄姆式亚盘安全边际：记录 Market（初盘/临场）→ 写 Fair（合理让球）与一行推导链 → 算 Δ → 标注三档结论（值得投 / 观望 / 反向投），定义见下 **「亚盘安全边际（格雷厄姆式）」**
  4. 澳超专项：常规赛排名、战意（季后赛资格/前二）、主客场、跨洋旅行与时差（新西兰球队等）
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
  - 跟踪前六边界球队、前二争夺与常规赛收官阶段战意；季后赛对阵和赛制以当季官方规则为准

赛程密度与旅行:
  - 关注澳足总杯、国家队窗口和跨州 / 新西兰客场对联赛轮换与休息时间的影响
  - 将未来赛程间隔预警纳入赛前报告，并按赛季进展更新相关 teamProfile 信息

争冠与盘口样本:
  - 按需维护 `data/冠军赔率.md`，结合积分榜判断常规赛排名和季后赛定位
  - 常规赛轮次少于英超，盘路数据结合近况、主客场和小样本风险谨慎使用

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

在完成阶段二步骤 **3**（`l273`/`bs273`/`td273` 固定句式与初临场记录）之后：**列出 Market（初盘+临场）→ 写 Fair 与一行推导链 → 计算 Δ → 标注三档之一**；赛前报告与 `prompts/match_analysis_template.md`「四、盘口解析」下的亚盘子项对齐。

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

1. 编辑 `cup-analyzer/crawler-server/config/squadTarget.js`：设置 `matchSerial`（球探单场序号）、`roundSerial`、`season`（须与本模块 `report/{赛季}/` 目录对应；2026-27 使用 `2026-2027` 和 `26-27`）；`matchLeagueName` 填与球探战绩表「联赛」列一致的文案（如 **`澳超`**），供「同赛事」折线图筛选。
2. 在 `cup-analyzer/crawler-server` 执行：`npx cross-env CUP_ANALYZER_CUP=aLeague npm run generate:cycle-report`
3. 输出：`cup-analyzer/aLeague/report/{赛季}/round-{N}/{主队}_vs_{客队}_cycle.html`（每场模拟投注 1000 元、固定港盘水位 0.9、ECharts 远程 CDN；每队含「全部 / 仅主或仅客 / 同赛事」三张累计盈亏图）

详细目录规划见 [README.md](./README.md) 与 [PLAN.md](./PLAN.md)。
