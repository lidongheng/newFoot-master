# 亚冠联2分析工作流程

## 赛事概览

- **赛事**：亚冠联2（AFC Champions League Two）
- **联赛序号（球探）**：**350** → `c350.js` / `l350.js` / `bs350.js`（`scheduleCrawler` 对杯赛不拉取 `td`；若需入球时间分布请自行维护或从球探导出）
- **当前架构赛季**：`25-26`（目录 `report/25-26/`、`news/25-26/` 等）；新赛季增加平行目录如 `26-27/`
- **小组赛**：正赛 **32 队**、**8 组**（西区 A–D、东区 E–H），每组 **4 队双循环**共 **6 轮**；**每组前二**晋级 **16 强**（具体以当届亚足联章程为准）
- **淘汰赛**：东西区 **分区**进行；16 强 / 8 强 / 半决赛 **两回合**；**决赛单场**（加时与点球依规程）

### 赛程数据与 `clubMatchAnalyzer`（与 crawler-server 统一）

- **本模块主文件**：`afcChampionsLeagueTwo/data/c350.js`（及同目录 `l350.js`、`bs350.js`）。
- **更新**：优先在 **`cup-analyzer/crawler-server`** 下执行 **`npm run crawl:schedule:acl2`**（各系统相同）。也可 `npx cross-env CUP_ANALYZER_CUP=afcChampionsLeagueTwo node crawlers/scheduleCrawler.js`；Bash 简写见 [crawler-server/README.md](../crawler-server/README.md)。会写入 `data/` 并**同步拷贝**赛程至 `crawler-server/match_center/c350.js`。
- **分析亚冠联2场次时的「国内联赛」赛程**：`squadTarget.leagueSerial` 填该队**所属联赛**序号（如英超 36）；`resolveScheduleData` 会指向 **`epl/data/s36.js`** 等已登记模块路径，未登记的联赛仍用 `match_center/s{n}.js` 兜底。详见 `crawler-server/match_center/README.md`。

### 从大名单到球队画像（联赛流水线）

亚冠联2 `CUP_ANALYZER_CUP=afcChampionsLeagueTwo` 下虽有 **A–H 小组**，大名单与画像仍按 **俱乐部** 维护：`squad/`、`squad-final/` 为**平铺** `{队名}.md`。生成大名单时仍用国内联赛数据：`playerListCrawler` / `clubMatchAnalyzer` 依赖 **`squadTarget.leagueSerial` = 该俱乐部所属联赛**（如韩 K 联 15、沙特联等），不是 350。

与世界杯不同：前半段为 **`playerListCrawler` + `clubMatchAnalyzer` + `leagueSquadProcessor`**；后半段 **`squadFinalInitializer`** → **`teamProfileGenerator`**。输出：`afcChampionsLeagueTwo/squad/` → `squad-final/` → `teamProfile/`。序号见 `afcChampionsLeagueTwo/data/球队与序号对照表.md`。

工作目录：`cup-analyzer/crawler-server`。**squadTarget**：`teamSerial`=俱乐部序号，`leagueSerial`=所属联赛（如 36）。

以下两条任意系统相同：

```bash
npm run crawl:player-list
npm run analyze:club-domestic
```

下面三条需设置 `CUP_ANALYZER_CUP=afcChampionsLeagueTwo`。**任意系统推荐**：

```bash
npx cross-env CUP_ANALYZER_CUP=afcChampionsLeagueTwo node processors/leagueSquadProcessor.js
npx cross-env CUP_ANALYZER_CUP=afcChampionsLeagueTwo node processors/squadFinalInitializer.js --team <序号>
# 人工审核 afcChampionsLeagueTwo/squad-final/{队名}.md（维护 ## 伤停 / ## 伤疑）
npx cross-env CUP_ANALYZER_CUP=afcChampionsLeagueTwo node processors/teamProfileGenerator.js --team <序号>
```

若在 macOS / Linux 终端习惯 Bash，也可将上述三条写成 `CUP_ANALYZER_CUP=afcChampionsLeagueTwo node processors/...`。手写 PowerShell/cmd 见 [crawler-server/README.md](../crawler-server/README.md)「Windows 与手动设置环境变量」。

**赛中大名单脚本**（与英超相同逻辑：替补按国内联赛出场数取 Top9，含落选）：`cd cup-analyzer/crawler-server && npx cross-env CUP_ANALYZER_CUP=afcChampionsLeagueTwo node processors/matchSquadGenerator.js --home <序号> --away <序号>`

## 三大阶段工作流

### 阶段一：赛前准备（赛季开始前或小组赛初期）

```
1. 确认 data/ 下赛程与盘路数据为最新
   └─ `cd cup-analyzer/crawler-server`，再执行 **`npm run crawl:schedule:acl2`**（推荐）
      （更新 `afcChampionsLeagueTwo/data/c350` 与 `l350`/`bs350`，并同步 `match_center/c350.js`；亦可 `npx cross-env CUP_ANALYZER_CUP=afcChampionsLeagueTwo node crawlers/scheduleCrawler.js`；手写 Shell 见 [crawler-server/README.md](../crawler-server/README.md)）

2. 维护 data/冠军赔率.md、data/球队与序号对照表.md

3. （可选）生成或补充 teamProfile/{球队}.md
   └─ 身价、阵容、欧战目标等

4. 阅读 strategy/ 下框架文档，按轮次更新积分形势与疲劳分析
```

**说明（大名单）**：亚冠联2是跨整个赛季的俱乐部赛事，**没有像世界杯那样赛前一次性公布的「最终大名单」可长期缓存**。每场比赛前都必须重新抓取双方最新阵容（伤病、转会、状态变化），具体见 **阶段二步骤 0**。世界杯模式见 `theWorldCup/squad/` + `squadCrawler.js`；俱乐部走 **`cup-analyzer/crawler-server`**（`playerListCrawler.js` + `analyzers/clubMatchAnalyzer.js`，配置 `config/squadTarget.js`；国内联赛赛程路径由 **`config.resolveScheduleData`** 解析，优先各联赛 `data/`，见上文与 `crawler-server/match_center/README.md`）。旧流程仍可用 `backend-server/crawlerPlayer.js` / `crawlerClub3_new.js`，将逐步废弃。

### 阶段二：赛中分析（每场）

**大名单是分析基础**：每场赛前必须先完成步骤 0（或改用已维护的 `squad-final` + `teamProfile`），再写报告、预测首发。

```
赛前 2–3 天:
  0. 双方大名单与推荐首发（二选一或组合）
     A. **维护画像流水线**：`afcChampionsLeagueTwo/squad-final/{队名}.md` 与 `teamProfile` 已更新时，赛前在 `squad-final` 填写 **伤停/伤疑** 后，可用  
        `cd cup-analyzer/crawler-server && npx cross-env CUP_ANALYZER_CUP=afcChampionsLeagueTwo node processors/matchSquadGenerator.js --home <主队序号> --away <客队序号>`  
        生成预测首发、替补、伤疑、伤停、落选（替补按国内联赛出场统计）。
     B. **临场抓取**（逻辑已迁入 cup-analyzer/crawler-server）：
     a. 确保该队**国内联赛**赛程 JS 为最新（如英超：在 crawler-server 下跑 **`npm run crawl:schedule:epl`**，或确认 `epl/data/s36.js` 已更新；分析器通过 `leagueSerial` 读 `resolveScheduleData` 指向的路径，不必单独维护 `match_center` 为唯一来源）
     b. 编辑 `crawler-server/config/squadTarget.js`：
        - teamSerial：该队球探俱乐部序号（见 `data/球队与序号对照表.md` 或 titan007 球队页）
        - teamChineseName：球队中文名
        - **数据渠道二选一**：
          ① **国内联赛渠道**（默认）：
             - leagueSerial：该队所属国内联赛序号（如英超 36、西甲 4）
             - roundSerial：当前国内联赛轮次（与 workflow 说明一致即可）
             - isNation：false
          ② **本赛事（亚冠联2）渠道**：
             - leagueSerial：`'350'`（亚冠联2序号）
             - roundSerial：不填或删除
             - isNation：true
             - matchByName：false（俱乐部杯赛必须加此项）
     c. cd cup-analyzer/crawler-server && npm run crawl:player-list
        → 输出 `crawler-server/output/player_center/{teamSerial}.json`（基础大名单）
     d. npm run analyze:club-domestic
        → 输出 `crawler-server/output/player_center/{teamSerial}-new.json`（出场、首发、进球助攻、阵型等）
     e. 将 squadTarget 改为客队，对客队重复 c–d
     f. 将双方大名单、伤停等整理进 news/{赛季}/{阶段}/{对阵}/（可与统计信息、新闻稿同目录）
  1. 预测首发（格式见 [prompts/match_analysis_template.md](./prompts/match_analysis_template.md)）
  2. 交锋、近况、未来赛程（含国内联赛/杯赛）、球探伤病摘要：`cd cup-analyzer/crawler-server`，在 `config/squadTarget.js` 填写本场 **`matchSerial`**，执行 **`npm run crawl:match-statistics`**（亦可 `-- --match <序号>`），将输出并入赛前报告或 `news/...`。（与 **`npm run generate:cycle-report`** 同源；大名单伤停等仍见步骤 0。）详见 [crawler-server/README.md](../crawler-server/README.md)「matchStatisticsCrawler」。
  3. 盘口（初盘与临场；亚冠联2阶段样本少于国内联赛，勿用空泛盘口闲聊替代数据块）：
     - 赛程与初盘字段仍以 `afcChampionsLeagueTwo/data/c350.js` 为准，报告章节层级见 `prompts/match_analysis_template.md`「四、盘口解析」。
     - **亚盘「盘口分析」内须有「盘路数据」**（`afcChampionsLeagueTwo/data/l350.js`）：连续三行 **总盘**、**主场**、**客场**；每行双方 **净胜盘** 与 **排名**，句式与 `epl/report/25-26/round-14/arsenal_vs_brentford.md` 中「盘路数据」同构；结合小组赛/淘汰赛样本量**审慎**解读。
     - **「### 3、大小」下须有「大小球盘路数据」**（`bs350.js`）：同样三行；每行双方 **大球率%** 与 **排名**。
     - **「75分钟后进球数分析」**：杯赛爬虫**不**维护 `td`。**勿编造**末段数据；若从球探页等补录，仍用英超范例 **本场比赛球队数据** 句式（**共N球、排第k** 与括号内 **76–80 / 81–85 / 86–90 分钟** 为比赛时段，非文档行号）并注明来源；无可靠数据时可省略该小节。
  3b. 格雷厄姆式亚盘安全边际：记录 Market（初盘/临场）→ 写 Fair（合理让球）与一行推导链 → 算 Δ → 标注三档结论（值得投 / 观望 / 反向投），定义见下 **「亚盘安全边际（格雷厄姆式）」**
  4. ACL2 专项：当前积分排名、是否轮换、两回合总比分（淘汰赛）
  5. 赛前报告 → `afcChampionsLeagueTwo/report/{赛季}/group-stage/round-{1~6}/...` 或淘汰赛阶段目录 `{主队}_vs_{客队}.md`  
     其中 **大名单与预测正文**（预测首发、预测替补、伤疑、伤停、落选）以步骤 0-A 中 `matchSquadGenerator.js` 的输出为准，写入该 `.md` 文件（与 [prompts/match_analysis_template.md](./prompts/match_analysis_template.md) 其余部分并列）。

赛前 1–2 小时:
  6. 确认首发与临场盘
  7. 填写报告「结果」与星级

赛后:
  8. 可选：爬取赛后数据（cup-analyzer/crawler-server，比赛 ID 来自 c350 或页面）
  9. 赛后复盘 → postMatchSummary/{赛季}/...（目录结构与 report 对齐）
```

### 阶段三：策略分析（贯穿赛季）

```
小组赛中（约第 3–4 轮起）:
  - 更新 strategy/group-stage-standings.md：各组积分、出线形势
  - 更新 cross-competition-fatigue.md：一周双赛、旅途与轮换风险

小组赛结束后 / 淘汰赛:
  - 更新 knockout-draw-analysis.md：分区对阵、半区强弱
  - 淘汰赛每轮前更新 two-leg-tactics.md：首回合赛果对次回合的影响

与国内联赛并行期:
  - 持续维护 cross-competition-fatigue.md
```

## 关键决策原则

### 亚冠联2 vs 国内联赛

1. **盘路**：小组赛/淘汰赛可用 `l350`/`bs350`，但样本少于国内联赛，需结合球队广实与战意。
2. **广实**：国内联赛广实档位见项目根目录 `.cursor/rules/dh-match-predict-analysis/references/`（如 `epl-team-strength.md` 等，按俱乐部所属联赛选文件）+ **ACL2 冠军赔率档次**（见 `data/冠军赔率.md`）。
3. **两回合淘汰赛**：首回合比分、主客场顺序、是否需净胜球/追分，影响次回合战意与节奏。
4. **三线作战**：亚冠联2、国内联赛、国内杯赛 — 轮换与留力需单独评估。
5. **小组赛出线**：同组积分与对赛成绩决定名次；淘汰赛分区抽签后路径相对固定，分析重点在 **小组出线形势**、**分区对阵** 与 **旅途疲劳**。

### 亚盘安全边际（格雷厄姆式）

与下文 **「亚盘周期盈亏 HTML（霍华德·马克斯周期视角）」** 的关系：**马克斯章节**是历史盘口序列上的周期与模拟回测视角；**本章**是单场把广实换算为合理让球、与市场盘口对比的定价与安全边际视角。二者互补，不要混为一谈。

**符号约定（主队视角）**

- **Market（市场让球）**：初盘与临场亚盘，与 `l350.js` / `bs350.js`、赛前报告「盘口」一致。
- **Fair（合理让球）**：在当前信息下，主队相对客队「应开」的让球，可写单值或闭区间（如 -0.75～-1.0）。
- **记法**：主队**让球**为**负**（如让半球 **-0.5**），主队**受让**为**正**（如 **+0.5**）。
- **偏差**：**Δ = Fair − Market**（两者均为同一场、同一主队视角）。例：Fair **-1.0**、临场 Market **-0.5**，则 **Δ = -0.5**（你认为市场让得偏浅）。具体选边仍要结合水位与叙事；本节规定的是**记录方式与决策分档**。

**定位 → Fair（可审计的最小推导链）**

1. **实际定位**：国内联赛广实档位见 `.cursor/rules/dh-match-predict-analysis/references/`（按各队所属联赛查阅对应 `*-team-strength.md`）+ **ACL2 积分排名 / 冠军赔率档**（`data/冠军赔率.md`）+ `teamProfile/`；淘汰赛叠加两回合总比分、主客场顺序、是否需追净胜球。
2. **广实差**：主客相对强度（档位或文字结论）。
3. **主场加成** / **杯赛主场**：国内联赛与亚冠联2主场经验区间分别自校。
4. **伤停与首发可信度**：相对 `squad-final` 与当场预测首发修正。
5. **战意与疲劳**：三线作战、轮换、一周双赛（见 `cross-competition-fatigue.md` 等）。
6. 输出 **Fair**（单值或区间）。

**阶段二中的操作（每场）**

在完成阶段二步骤 **3**（`l350`/`bs350` 固定句式与初临场记录；`td` 按上条例外处理）之后：**列出 Market（初盘+临场）→ 写 Fair 与一行推导链 → 计算 Δ → 标注三档之一**；赛前报告与 `prompts/match_analysis_template.md`「四、盘口解析」下的亚盘子项对齐。

**三档结论（rubric）**

- **值得投**：|Δ| 达到**自设阈值**（常见起点 **0.25～0.5 球**，可按联赛波动率校准），且无重大未决信息（核心伤停疑云、高方差默契球等）；仍须满足模板中「完整项目、少买」等纪律。
- **观望**：|Δ| 低于阈值，或信息不全，或高方差情境（淘汰赛极端战意、轮换未知、亚冠联2小样本盘路）。
- **反向投**：Fair 与 Market **方向性或幅度严重背离**，且能说明「市场假设错在哪」；默认**小仓或仅记录**。「反向」指价值在让球方向的另一侧，不是鼓励盲目加注。

以上为**纪律框架**，不保证结果。

### 报告与素材路径约定

| 类型 | 路径 |
|------|------|
| 赛前报告（小组赛） | `cup-analyzer/afcChampionsLeagueTwo/report/{赛季}/group-stage/round-{1~6}/...` |
| 淘汰赛 | `.../knockout/` 下按轮次或分区（16 强 / 8 强 / 半决赛 / 决赛），以当届目录为准 |
| 素材 | `cup-analyzer/afcChampionsLeagueTwo/news/{赛季}/...` |
| 赛后 | `cup-analyzer/afcChampionsLeagueTwo/postMatchSummary/{赛季}/...` |

### 亚盘周期盈亏 HTML（霍华德·马克斯周期视角）

1. 编辑 `cup-analyzer/crawler-server/config/squadTarget.js`：设置 `matchSerial`、`roundSerial`、`season`；`matchLeagueName` 建议填与球探「联赛」列一致（如 `亚冠联2`），供「同赛事」筛选。
2. 在 `cup-analyzer/crawler-server` 执行：`CUP_ANALYZER_CUP=afcChampionsLeagueTwo npm run generate:cycle-report`
3. 输出：`cup-analyzer/afcChampionsLeagueTwo/report/{赛季}/round-{N}/{主队}_vs_{客队}_cycle.html`（规则同英超 workflow：每场 1000 元、水位 0.9、ECharts CDN）

**赛前报告中的大名单块**：单场 `matchSquadGenerator.js` 打印的双方「预测首发、预测替补、伤疑、伤停、落选」即对应路径下 **`{主队}_vs_{客队}.md`** 内应落盘的大名单与预测部分。

详细目录规划见 [PLAN.md](./PLAN.md)。
