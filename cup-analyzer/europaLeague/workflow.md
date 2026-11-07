# 欧罗巴联赛分析工作流程

## 赛事概览

- **赛事**：欧罗巴联赛（UEFA Europa League）
- **赛事序号（球探）**：**113** → `c113.js` / `l113.js` / `bs113.js`（杯赛爬虫不拉取 `td`；若需末段进球分布，请使用可靠来源补录并注明来源）
- **当前架构赛季**：`25-26`（目录 `report/25-26/`、`news/25-26/` 等）；新赛季增加平行目录如 `26-27/`
- **联赛阶段**：36 队瑞士制，每队 8 场（4 主 4 客），共用一张积分榜
- **出线规则**：前 8 名直通 16 强；第 9–24 名参加附加赛；第 25–36 名淘汰
- **淘汰赛**：附加赛、16 强、8 强、半决赛为两回合；决赛单场决胜；无客场进球规则，平局进入加时赛和点球大战

### 赛程数据与 `clubMatchAnalyzer`（与 crawler-server 统一）

- **赛事主文件**：`europaLeague/data/c113.js`（及同目录 `l113.js`、`bs113.js`）。
- **更新**：优先在 **`cup-analyzer/crawler-server`** 下执行 **`npm run crawl:schedule:europa`**（各系统相同）。也可 `npx cross-env CUP_ANALYZER_CUP=europaLeague node crawlers/scheduleCrawler.js`；Bash 简写见 [crawler-server/README.md](../crawler-server/README.md)。会写入 `data/`，并把赛程主文件同步拷贝到 `crawler-server/match_center/c113.js`。
- **球队大名单分析**：`playerListCrawler` 与 `clubMatchAnalyzer` 使用 `squadTarget.leagueSerial` 指定球队所属的**国内联赛**（如英超 36），不要将欧罗巴赛事序号 113 当作国内联赛序号。`config.resolveScheduleData` 会指向已登记联赛模块的 `data/` 赛程文件；未登记的联赛序号仍读 `match_center/s{n}.js`。欧罗巴比赛本身的赛事赛程与盘口数据使用 `europaLeague/data/c113.js`、`l113.js`、`bs113.js`。

### 从大名单到球队画像（俱乐部流水线）

欧罗巴 `CUP_ANALYZER_CUP=europaLeague` 下，`squad/`、`squad-final/` 为平铺的 `{队名}.md`，没有 `group-X/`。大名单及出场数据按俱乐部所属**国内联赛**抓取和分析；欧罗巴赛事序号 113 只用于欧罗巴赛程和比赛分析。

前半段使用 **`playerListCrawler` + `clubMatchAnalyzer` + `leagueSquadProcessor`**；后半段使用 **`squadFinalInitializer`** → 人工审核 **`squad-final/`**（在 **`## 伤停` / `## 伤疑`** 中填写当前伤停、伤疑名单，每行 `球衣号-姓名`）→ **`teamProfileGenerator`** → **`teamProfile/{队名}.md`**（画像会带上伤停/伤疑小节；单队操作，逐队改 `squadTarget.js`）。

球队画像生成后，建议在对应 `teamProfile/{队名}.md` 中补充转会窗、欧罗巴与国内赛事之间的密集赛程、轮换负荷、伤病与状态等赛前分析相关内容，并沿用模块内原有画像结构。

**前置**：在 `cup-analyzer/crawler-server` 中编辑 `config/squadTarget.js`（`leagueSlug=europaLeague`、`teamSerial`、`leagueSerial`=球队所属国内联赛序号、`roundSerial`=国内联赛轮次、`teamChineseName`）；欧罗巴赛程见 `europaLeague/data/c113.js`。

**输出路径**：`europaLeague/squad/` → `europaLeague/squad-final/` → `europaLeague/teamProfile/`。球队序号见 `europaLeague/data/球队与序号对照表.md`。

**球队映射配置**：先补充 `europaLeague/data/config.json` 的 `team`。键为懂球帝球队 ID，每条包含 `dqdName`（懂球帝队名）、`qiutanName`（球探队名）、`qiutanSerial`（球探球队序号）。`positionMap` 与欧冠配置一致；`team` 已建为空对象，供手动维护。

工作目录：`cup-analyzer/crawler-server`。先编辑 `config/squadTarget.js`。

**大名单数据源**：`npm run crawl:player-list:club` 默认抓取懂球帝；也可通过 `-w` 指定来源。选择球探或显式指定懂球帝时使用：

```bash
npm run crawl:player-list:club -- -w qiutan
npm run crawl:player-list:club -- -w dqd
```

也可省略 `-w dqd`，直接运行 `npm run crawl:player-list:club`。球探来源通过球探球员资料补充俱乐部与转会记录；懂球帝来源抓取当前赛季联赛数据、球员资料、能力值和转会记录。两种来源都写入 `output/player_center/{teamSerial}.json`。抓取完成后再运行 `analyze:club-domestic`。

以下两条任意系统相同：

```bash
npm run crawl:player-list:club
npm run analyze:club-domestic
```

下面四条需设置 `CUP_ANALYZER_CUP=europaLeague`。**任意系统推荐**：

```bash
npx cross-env CUP_ANALYZER_CUP=europaLeague node processors/leagueSquadProcessor.js
  # 运行前在 squadTarget.js 设置 teamSerial 和 matchTime（北京时间，YYYY-MM-DD HH:mm:ss）
npx cross-env CUP_ANALYZER_CUP=europaLeague node processors/teamScheduleProcessor.js
npx cross-env CUP_ANALYZER_CUP=europaLeague node processors/squadFinalInitializer.js --team <序号>
# 人工审核 europaLeague/squad-final/{队名}.md
npx cross-env CUP_ANALYZER_CUP=europaLeague node processors/teamProfileGenerator.js --team <序号>
```

`teamProfileGenerator` 会在球队画像的预测首发后生成预测替补：门将 1 人（候选门将按球衣号升序，无号码者排在有号码者后），后卫 3 人、中场 3 人、前锋 2 人。后卫、中场、前锋先选与同组首发标准位置代码相同的球员，再从该组其他候选补足；非门将候选按赛季首发数降序，并列沿用名单顺序，缺少首发数据者排后。只排除 `## 伤停` 球员，`## 伤疑` 球员仍可入选。位置组名额不足时，从其他已识别位置组按赛季首发数补足 9 人；全队可用球员不足 9 人时只输出实际人数，不生成占位球员。缺少阵型或无法选出首发球员时不生成预测替补栏。

这套选择规则只用于球队画像。下方 `matchSquadGenerator.js` 的单场文案仍按其自身的出场数规则生成 Top 9 替补，两者不要混用。

若在 macOS / Linux 终端习惯 Bash，也可将上述三条写成 `CUP_ANALYZER_CUP=europaLeague node processors/...`。手写 PowerShell/cmd 见 [crawler-server/README.md](../crawler-server/README.md)「Windows 与手动设置环境变量」。

可选：在 `teamProfile/{队名}.md` 中补充转会窗、赛程密度、多线作战、伤病等。

## 三大阶段工作流

### 阶段一：赛前准备（赛季初或联赛阶段开始前）

```
1. 确认 data/ 下欧罗巴赛程与盘路数据为最新
   └─ `cd cup-analyzer/crawler-server`，再执行 **`npm run crawl:schedule:europa`**（推荐）
      （更新 `europaLeague/data/` 下 c113、l113、bs113，并把赛程主文件拷至 `match_center/c113.js`；杯赛不生成 td；亦可 `npx cross-env CUP_ANALYZER_CUP=europaLeague node crawlers/scheduleCrawler.js`；手写 Shell 见 [crawler-server/README.md](../crawler-server/README.md)）

2. 维护 data/冠军赔率.md、data/球队与序号对照表.md

3. 阅读 strategy/ 下框架文档，按阶段更新联赛阶段排名、晋级区间、淘汰赛路径与赛程拥堵
```

**大名单（每场）**：与英超俱乐部流程一致，使用 **`cup-analyzer/crawler-server`**；球员出场与首发数据使用各队所属国内联赛：

```
  a. 确保欧罗巴赛程 JS 已更新（`europaLeague/data/c113.js`）
  b. 编辑 config/squadTarget.js：teamSerial、leagueSerial=所属国内联赛序号、roundSerial=国内联赛轮次、isNation=false 等
  c. npm run crawl:player-list:club → output/player_center/{teamSerial}.json
  d. npm run analyze:club-domestic → {teamSerial}-new.json
  e. 将双方大名单、伤停等整理进 news/{赛季}/{阶段}/{对阵}/
```

### 阶段二：赛中分析（每场）

```
赛前 2–3 天:
  0. 大名单与预测块（基于球队画像流水线，优先不再每场重复爬取）
     - 双方大名单与「推荐首发」以 **`europaLeague/squad-final/{队名}.md`** 为准（与 `teamProfile` 同源）；赛前在对应 `squad-final` 中更新 **伤停 / 伤疑** 后，可重跑 `teamProfileGenerator` 同步画像。
     - 一键生成单场用文案（预测首发、预测替补 Top9 按出场、伤疑、伤停、落选；此规则仅用于单场文案，与球队画像替补规则分开）：
       `cd cup-analyzer/crawler-server && npx cross-env CUP_ANALYZER_CUP=europaLeague node processors/matchSquadGenerator.js --home <主队序号> --away <客队序号>`
       （或 `npx cross-env CUP_ANALYZER_CUP=europaLeague npm run generate:match-squad -- --home … --away …`）
  1. 预测首发与报告结构（格式见 prompts/match_analysis_template.md）
  2. 交锋、近况、未来赛程（含国内联赛/杯赛）、球探伤病摘要：`cd cup-analyzer/crawler-server`，在 `config/squadTarget.js` 填写本场欧罗巴 **`matchSerial`**，执行 **`npx cross-env CUP_ANALYZER_CUP=europaLeague npm run crawl:match-statistics`**（亦可 `npx cross-env CUP_ANALYZER_CUP=europaLeague npm run crawl:match-statistics -- --match <序号>` 临时指定场次），将输出并入赛前报告或 `europaLeague/news/...`。（与 **`npm run generate:cycle-report`** 同源页面与解析；**伤停/伤疑**仍以 `squad-final` 与 `matchSquadGenerator` 为准。）详见 [crawler-server/README.md](../crawler-server/README.md)「matchStatisticsCrawler」。
     - **未来赛程分析（必做，使用 `dh-team-schedule`）**：按 [.cursor/rules/dh-team-schedule/SKILL.md](../../.cursor/rules/dh-team-schedule/SKILL.md) 分别查询双方从本场计划开球时间起未来 14 天内的全部赛事，按技能规定输出开球时间、赛事、对手和距上一场开球的间隔；对本场前及未来赛程的相邻场次按休息间隔标注预警：**低于 67 小时为红色，67–92 小时（含边界）为黄色，超过 92 小时为绿色**。将预警、未来赛程密度及紧邻的国内联赛/杯赛纳入报告「未来赛程/赛程分析」，评估体能与轮换风险，并参考 `strategy/cross-competition-fatigue.md`。配置或赛程文件缺失时，按技能说明指出实际缺项，不推测赛程、比分或间隔。
     - **新闻发布会与伤停新闻搜集（必做）**：上网搜集双方最新的新闻发布会/主帅采访和球队伤停新闻，分别总结发布会中的阵容、伤停、轮换与战意信息，以及各队已确认伤停和存疑球员；记录来源与发布时间，区分已确认信息和未确认消息，并将摘要并入本场赛前报告或 `europaLeague/news/...`。
  3. 盘口（初盘与临场 + 盘路三块固定句式；勿用空泛盘口闲聊替代数据块）：
     - 初盘全场/半场让球、大小球盘口等仍以 `europaLeague/data/c113.js` 为准，报告章节层级见 `prompts/match_analysis_template.md`「四、盘口解析」。
     - **亚盘「盘口分析」内须有「盘路数据」**（数据来自 `europaLeague/data/l113.js`）：连续三行，依次为 **总盘**、**主场**、**客场**；每行写清双方 **净胜盘** 与 **赛事排名**，句式示例：`总盘：主队净+x，排第a，客队净+y，排第b`。欧罗巴参赛场次少于国内联赛，须结合赛事阶段与样本量审慎解读。
     - **「### 3、大小」下须有「大小球盘路数据」**（来自 `bs113.js`）：同样三行总盘/主场/客场；每行双方 **大球率%** 与 **排名**。
     - **75分钟后进球数分析**：杯赛爬虫不维护 `td`。不得编造末段数据；若从球探页等可靠来源补录，使用英超范例「本场比赛球队数据」句式（共 N 球、排第 k 与括号内 76–80、81–85、86–90 分钟为比赛时段，非文档行号）并注明来源；无可靠数据时可省略该小节。
  3b. 格雷厄姆式亚盘安全边际：记录 Market（初盘/临场）→ 写 Fair（合理让球）与一行推导链 → 算 Δ → 标注三档结论（值得投 / 观望 / 反向投），定义见下 **「亚盘安全边际（格雷厄姆式）」**
  4. 欧罗巴专项：联赛阶段积分排名与出线区间、附加赛/淘汰赛晋级形势；淘汰赛纳入两回合总比分、主客场顺序、追分需求及加时赛可能性
  5. 赛前报告 → `europaLeague/report/{赛季}/{阶段}/round-N/{主队}_vs_{客队}.md`（大名单与预测段落见下文 **「赛前报告正文中的大名单块」**）

赛前 1–2 小时:
  6. 确认首发与临场盘
  7. 填写报告「结果」与星级

赛后:
  8. 可选：爬取赛后数据（matchDataCrawler 等）
  9. 赛后复盘 → postMatchSummary/{赛季}/{阶段}/round-N/...
```

### 阶段三：策略分析（贯穿赛季）

```
联赛阶段:
  - 更新 strategy/league-phase-standings.md：直通 16 强区、附加赛区与淘汰区
  - 更新 strategy/cross-competition-fatigue.md：欧罗巴与国内赛事间的密集赛程、轮换风险

淘汰赛:
  - 更新 strategy/knockout-draw-analysis.md：种子、抽签规则与可能对阵
  - 每轮前更新 strategy/two-leg-tactics.md：首回合赛果、主客场顺序与次回合策略

欧罗巴与国内赛事并行期:
  - 持续维护 strategy/cross-competition-fatigue.md
```

## 关键决策原则

### 欧罗巴 vs 国内联赛

1. **盘路**：欧罗巴各阶段比赛样本有限，使用 `l113` / `bs113` 时须结合球队实力、赛事阶段与战意；不能将杯赛短期样本当作国内联赛长期表现。
2. **广实**：国内联赛广实档位见项目根目录 `.cursor/rules/dh-match-predict-analysis/references/`（按俱乐部所属联赛查对应 `*-team-strength.md`）；再结合欧罗巴积分排名、`data/冠军赔率.md` 和 `teamProfile/` 判断当前定位。
3. **联赛阶段与淘汰赛**：联赛阶段关注排名区间与晋级条件；淘汰赛还需考虑两回合总比分、主客场顺序、追分需求和加时赛可能性。
4. **跨赛事负荷**：欧罗巴、国内联赛、国内杯赛之间的休息时间、轮换与伤病风险需单独评估。
5. **抽签路径**：按当季欧罗巴规则分析排名、种子与抽签半区，不推测未确定的对阵。

### 亚盘安全边际（格雷厄姆式）

与下文 **「亚盘周期盈亏 HTML（霍华德·马克斯周期视角）」** 的关系：**马克斯章节**是历史盘口序列上的周期与模拟回测视角；**本章**是单场把广实换算为合理让球、与市场盘口对比的定价与安全边际视角。二者互补，不要混为一谈。

**符号约定（主队视角）**

- **Market（市场让球）**：初盘与临场亚盘，与 `l113.js` / `bs113.js`、赛前报告「盘口」一致。
- **Fair（合理让球）**：在当前信息下，主队相对客队「应开」的让球，可写单值或闭区间（如 -0.75～-1.0）。
- **记法**：主队**让球**为**负**（如让半球 **-0.5**），主队**受让**为**正**（如 **+0.5**）。
- **偏差**：**Δ = Fair − Market**（两者均为同一场、同一主队视角）。例：Fair **-1.0**、临场 Market **-0.5**，则 **Δ = -0.5**（你认为市场让得偏浅）。具体选边仍要结合水位与叙事；本节规定的是**记录方式与决策分档**。

**定位 → Fair（可审计的最小推导链）**

1. **实际定位**：国内联赛广实档位见 `.cursor/rules/dh-match-predict-analysis/references/`（按双方所属联赛查对应 `*-team-strength.md`）+ 欧罗巴积分排名 / 冠军赔率档（`data/冠军赔率.md`）+ `teamProfile/`；淘汰赛叠加两回合总比分、主客场顺序与追分需求。
2. **广实差**：主客相对强度（档位或文字结论）。
3. **主场加成**：分别参考俱乐部国内联赛与欧罗巴主场表现，并按赛事阶段自校。
4. **伤停与首发可信度**：相对 `squad-final` 与当场预测首发修正。
5. **战意与赛程密度**：联赛阶段晋级需求、淘汰赛总比分、轮换、一周双赛及跨赛事休息时间。
6. 输出 **Fair**（单值或区间）。

**阶段二中的操作（每场）**

在完成阶段二步骤 **3**（`l113` / `bs113` 固定句式与初临场记录；`td` 按上条例外处理）之后：**列出 Market（初盘+临场）→ 写 Fair 与一行推导链 → 计算 Δ → 标注三档之一**；赛前报告与 `prompts/match_analysis_template.md`「四、盘口解析」下的亚盘子项对齐。

**三档结论（rubric）**

- **值得投**：|Δ| 达到**自设阈值**（常见起点 **0.25～0.5 球**，可按联赛波动率校准），且无重大未决信息（核心伤停疑云、高方差比赛等）；仍须满足模板中「完整项目、少买」等纪律。
- **观望**：|Δ| 低于阈值，或信息不全，或高方差情境（淘汰赛极端战意、轮换未知、欧罗巴小样本盘路）。
- **反向投**：Fair 与 Market **方向性或幅度严重背离**，且能说明「市场假设错在哪」；默认**小仓或仅记录**。「反向」指价值在让球方向的另一侧，不是鼓励盲目加注。

以上为**纪律框架**，不保证结果。

### 报告与素材路径约定

| 类型 | 路径 |
|------|------|
| 赛前报告 | `cup-analyzer/europaLeague/report/{赛季}/{阶段}/round-{N}/...` |
| 联赛阶段 | `.../league-phase/` |
| 淘汰赛 | `.../playoff/`、`round-of-16/`、`quarter-finals/`、`semi-finals/`、`final/` |
| 素材 | `cup-analyzer/europaLeague/news/{赛季}/{阶段}/...` |
| 赛后 | `cup-analyzer/europaLeague/postMatchSummary/{赛季}/{阶段}/...` |

### 亚盘周期盈亏 HTML（霍华德·马克斯周期视角）

1. 编辑 `cup-analyzer/crawler-server/config/squadTarget.js`：设置 `matchSerial`（球探单场序号）、`roundSerial`、`season`；`matchLeagueName` 填与球探战绩表「联赛」列一致的赛事名称（如 `欧罗巴杯`），供「同赛事」折线图筛选。
2. 在 `cup-analyzer/crawler-server` 执行：`npx cross-env CUP_ANALYZER_CUP=europaLeague npm run generate:cycle-report`
3. 输出：`cup-analyzer/europaLeague/report/{赛季}/round-{N}/{主队}_vs_{客队}_cycle.html`（ECharts 远程 CDN；每场模拟投注 1000 元、固定港盘水位 0.9，初盘盘口来自球探分析页；每队含「全部 / 仅主或仅客 / 同赛事」三张累计盈亏图）

**赛前报告正文中的大名单块**：`matchSquadGenerator.js` 针对单场双方输出的内容（每队含 **预测首发、预测替补、伤疑、伤停、落选**），即该场赛前报告文件 **`europaLeague/report/{赛季}/{阶段}/round-{N}/{主队}_vs_{客队}.md`** 里「大名单与预测」部分应写入的正文来源；可与 `prompts/match_analysis_template.md` 其余章节（交锋、盘口、战意等）合并为完整报告。

详细目录规划见 [PLAN.md](./PLAN.md)。

