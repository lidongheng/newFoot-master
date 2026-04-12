# 英超联赛分析工作流程

## 赛事概览

- **赛事**：英格兰足球超级联赛（Premier League）
- **联赛序号（球探）**：**36** → `s36.js` / `l36.js` / `bs36.js` / `td36.js`
- **当前架构赛季**：`25-26`（目录 `report/25-26/`、`news/25-26/` 等）；新赛季增加平行目录如 `26-27/`
- **赛制**：20 队、双循环 **38 轮**，胜 3 分、平 1 分、负 0 分

### 赛程数据与 `clubMatchAnalyzer`（与 crawler-server 统一）

- **主文件**：`epl/data/s36.js`（及同目录 `l36.js`、`bs36.js`、`td36.js`）。
- **更新**：优先在 **`cup-analyzer/crawler-server`** 下执行 **`npm run crawl:schedule:epl`**（各系统相同）。也可 `npx cross-env CUP_ANALYZER_CUP=epl node crawlers/scheduleCrawler.js`；Bash 简写见 [crawler-server/README.md](../crawler-server/README.md)。会写入 `data/`，并把赛程主文件**同步拷贝**到 `crawler-server/match_center/s36.js`，避免两处脱节。
- **分析器路径**：`config.resolveScheduleData('36', false)` 指向 **`epl/data/s36.js`**（不再要求手工维护 `match_center` 为唯一来源）。未在 `config/index.js` 的 `cups` 中登记的其它联赛序号仍读 `match_center/s{n}.js` 兜底。

### 从大名单到球队画像（联赛流水线）

与世界杯不同：联赛用 **`playerListCrawler` + `clubMatchAnalyzer` + `leagueSquadProcessor`** 生成 `squad/{队名}.md`；后半段与世界杯一致：**`squadFinalInitializer`** → 人工审核 **`squad-final/`**（在 **`## 伤停` / `## 伤疑`** 中填写当前伤停、伤疑名单，每行 `球衣号-姓名`）→ **`teamProfileGenerator`** → **`teamProfile/{队名}.md`**（画像会带上伤停/伤疑小节；单队操作，逐队改 `squadTarget.js`）。

**Big 6**（阿森纳、曼彻斯特城、利物浦、曼彻斯特联、托特纳姆热刺、切尔西）可优先用本流水线更新 `teamProfile/`；自动化画像落地后，仍建议在对应 `teamProfile/{队名}.md` 中补充**转会窗**、**圣诞/新年密集赛程**、**双线作战负荷**、**伤病与状态**等与赛前分析相关的段落（与模块内原有画像结构一致）。

**前置**：在 `cup-analyzer/crawler-server` 中编辑 `config/squadTarget.js`（`teamSerial`、`leagueSerial=36`、`roundSerial`、`teamChineseName`）；赛程见 `epl/data/s36.js`。以下 processors 需 `CUP_ANALYZER_CUP=epl`（推荐上文 `npx cross-env`）。

**输出路径**：`epl/squad/` → `epl/squad-final/` → `epl/teamProfile/`。球队序号见 `epl/data/球队与序号对照表.md`。

工作目录：`cup-analyzer/crawler-server`。先编辑 `config/squadTarget.js`。

**转会记录列**：`epl/squad/{队名}.md` 表末列「转会记录」来自球探 `player{序号}.js` 的转会数据。请先执行 `npm run crawl:player-list:club`（即 `playerListCrawler.js --with-club`）再跑 `analyze:club-domestic`；若仅用 `crawl:player-list`，该列多为 `-`。

以下两条任意系统相同：

```bash
npm run crawl:player-list:club
npm run analyze:club-domestic
```

下面三条需设置 `CUP_ANALYZER_CUP=epl`。**任意系统推荐**：

```bash
npx cross-env CUP_ANALYZER_CUP=epl node processors/leagueSquadProcessor.js
npx cross-env CUP_ANALYZER_CUP=epl node processors/squadFinalInitializer.js --team <序号>
# 人工审核 epl/squad-final/{队名}.md
npx cross-env CUP_ANALYZER_CUP=epl node processors/teamProfileGenerator.js --team <序号>
```

若在 macOS / Linux 终端习惯 Bash，也可将上述三条写成 `CUP_ANALYZER_CUP=epl node processors/...`。手写 PowerShell/cmd 见 [crawler-server/README.md](../crawler-server/README.md)「Windows 与手动设置环境变量」。

可选：在 `teamProfile/{队名}.md` 中补充转会窗、赛程密度、多线作战、伤病等（Big 6 优先深度维护）。

## 三大阶段工作流

### 阶段一：赛前准备（赛季初或数据更新时）

```
1. 确认 data/ 下赛程与盘路数据为最新
   └─ `cd cup-analyzer/crawler-server`，再执行 **`npm run crawl:schedule:epl`**（推荐）
      （同步更新 `epl/data/` 下 s36、l36、bs36、td36，并把赛程主文件拷至 `match_center/s36.js`，见上文；亦可 `npx cross-env CUP_ANALYZER_CUP=epl node crawlers/scheduleCrawler.js`；手写 Shell 见 [crawler-server/README.md](../crawler-server/README.md)）

2. 维护 data/冠军赔率.md、data/球队与序号对照表.md

3. 阅读 strategy/ 下框架文档，按轮次更新争冠、争四、欧战、保级与赛程拥堵
```

**大名单（每场）**：与欧冠俱乐部流程一致，使用 **`cup-analyzer/crawler-server`**：

```
  a. 确保英超赛程 JS 已更新（优先 `epl/data/s36.js`；`leagueSerial=36` 时由 resolveScheduleData 指向该文件）
  b. 编辑 config/squadTarget.js：teamSerial、leagueSerial=36、roundSerial、isNation=false 等
  c. npm run crawl:player-list → output/player_center/{teamSerial}.json
  d. npm run analyze:club-domestic → {teamSerial}-new.json
  e. 将双方大名单、伤停等整理进 news/{赛季}/round-N/{对阵}/
```

### 阶段二：赛中分析（每场）

```
赛前 2–3 天:
  0. 大名单与预测块（基于球队画像流水线，优先不再每场重复爬取）
     - 双方大名单与「推荐首发」以 **`epl/squad-final/{队名}.md`** 为准（与 `teamProfile` 同源）；赛前在对应 `squad-final` 中更新 **伤停 / 伤疑** 后，可重跑 `teamProfileGenerator` 同步画像。
     - 一键生成单场用文案（预测首发、预测替补 Top9 按出场、伤疑、伤停、落选）：
       `cd cup-analyzer/crawler-server && CUP_ANALYZER_CUP=epl node processors/matchSquadGenerator.js --home <主队序号> --away <客队序号>`
       （或 `npm run generate:match-squad -- --home … --away …`）
  1. 预测首发与报告结构（格式见 prompts/match_analysis_template.md）
  2. 交锋、近况、未来赛程（含欧冠/欧联/国内杯赛）
  3. 盘口：初盘/临场；引用 l36.js、bs36.js、td36.js
  3b. 格雷厄姆式亚盘安全边际：记录 Market（初盘/临场）→ 写 Fair（合理让球）与一行推导链 → 算 Δ → 标注三档结论（值得投 / 观望 / 反向投），定义见下 **「亚盘安全边际（格雷厄姆式）」**
  4. 英超专项：积分榜位置、战意（争冠/争四/保级）、德比属性
  5. 赛前报告 → `epl/report/{赛季}/round-N/{主队}_vs_{客队}.md`（大名单与预测段落见下文 **「赛前报告正文中的大名单块」**）

赛前 1–2 小时:
  6. 确认首发与临场盘
  7. 填写报告「结果」与星级

赛后:
  8. 可选：爬取赛后数据（matchDataCrawler 等）
  9. 赛后复盘 → postMatchSummary/{赛季}/round-N/...
```

### 阶段三：策略分析（贯穿赛季）

```
争冠 / 争四 / 欧战 / 保级:
  - 更新 strategy/title-race.md、ucl-qualification.md、european-qualification.md、relegation-battle.md

赛程拥堵（尤其 Big 6 多线作战）:
  - 更新 strategy/fixture-congestion.md
  - 关注：欧冠与英超间隔 <70 小时；6 天内两场欧冠中间夹一场联赛等

德比:
  - 赛前查阅 strategy/derby-dynamics.md
```

## 关键决策原则

### 英超 vs 欧冠

1. **盘路**：联赛轮次多，`l36`/`bs36` 样本优于杯赛短期数据。
2. **广实**：联赛积分榜 + `data/冠军赔率.md` + `teamProfile/`（见上文「从大名单到球队画像」）；**档位与广实定位**以项目根目录 `.cursor/rules/dh-match-predict-analysis/references/epl-team-strength.md` 为准（与同目录其它 `*-team-strength.md` 一并维护）。
3. **无两回合**：单场决胜，战意与轮换更多来自积分榜与赛程密度。
4. **Big 6**：新闻与热度集中，优先保证画像与赛前复盘深度（画像维护方式见上文「从大名单到球队画像」）。

### 亚盘安全边际（格雷厄姆式）

与下文 **「亚盘周期盈亏 HTML（霍华德·马克斯周期视角）」** 的关系：**马克斯章节**是历史盘口序列上的周期与模拟回测视角；**本章**是单场把广实换算为合理让球、与市场盘口对比的定价与安全边际视角。二者互补，不要混为一谈。

**符号约定（主队视角）**

- **Market（市场让球）**：初盘与临场亚盘，与 `l36.js` / `bs36.js`、赛前报告「盘口」一致。
- **Fair（合理让球）**：在当前信息下，主队相对客队「应开」的让球，可写单值或闭区间（如 -0.75～-1.0）。
- **记法**：主队**让球**为**负**（如让半球 **-0.5**），主队**受让**为**正**（如 **+0.5**）。
- **偏差**：**Δ = Fair − Market**（两者均为同一场、同一主队视角）。例：Fair **-1.0**、临场 Market **-0.5**，则 **Δ = -0.5**（你认为市场让得偏浅）。具体选边仍要结合水位与叙事；本节规定的是**记录方式与决策分档**。

**定位 → Fair（可审计的最小推导链）**

1. **实际定位**：**广实档位**见 `.cursor/rules/dh-match-predict-analysis/references/`（英超：`epl-team-strength.md`）+ 联赛积分榜 + `data/冠军赔率.md` + `teamProfile/` + 战意（争冠/争四/保级/欧战）与德比属性（可与 `strategy/` 文档对照）。
2. **广实差**：主客相对强度（档位或文字结论）。
3. **主场加成**：英超主场折让的经验区间（与历史复盘自校）。
4. **伤停与首发可信度**：相对 `squad-final` 与当场预测首发修正。
5. **战意与赛程密度**：轮换、一周双赛、欧战夹联赛等。
6. 输出 **Fair**（单值或区间）。

**阶段二中的操作（每场）**

在「盘口：初盘/临场」之后：**列出 Market（初盘+临场）→ 写 Fair 与一行推导链 → 计算 Δ → 标注三档之一**；赛前报告与 `prompts/match_analysis_template.md`「四、盘口解析」下的亚盘子项对齐。

**三档结论（rubric）**

- **值得投**：|Δ| 达到**自设阈值**（常见起点 **0.25～0.5 球**，可按联赛波动率校准），且无重大未决信息（核心伤停疑云、高方差默契球等）；仍须满足模板中「完整项目、少买」等纪律。
- **观望**：|Δ| 低于阈值，或信息不全，或高方差情境（德比、轮换未知、极端战意）。
- **反向投**：Fair 与 Market **方向性或幅度严重背离**，且能说明「市场假设错在哪」；默认**小仓或仅记录**。「反向」指价值在让球方向的另一侧，不是鼓励盲目加注。

以上为**纪律框架**，不保证结果。

### 报告与素材路径约定

| 类型 | 路径 |
|------|------|
| 赛前报告 | `cup-analyzer/epl/report/{赛季}/round-{N}/...` |
| 素材 | `cup-analyzer/epl/news/{赛季}/round-{N}/...` |
| 赛后 | `cup-analyzer/epl/postMatchSummary/{赛季}/round-{N}/...` |

### 亚盘周期盈亏 HTML（霍华德·马克斯周期视角）

1. 编辑 `cup-analyzer/crawler-server/config/squadTarget.js`：设置 `matchSerial`（球探单场序号）、`roundSerial`、`season`；`matchLeagueName` 填与球探战绩表「联赛」列一致的文案（如 `英超`），供「同赛事」折线图筛选。
2. 在 `cup-analyzer/crawler-server` 执行：`CUP_ANALYZER_CUP=epl npm run generate:cycle-report`
3. 输出：`cup-analyzer/epl/report/{赛季}/round-{N}/{主队}_vs_{客队}_cycle.html`（ECharts 远程 CDN；每场模拟投注 1000 元、固定港盘水位 0.9，初盘盘口来自球探分析页；每队含「全部 / 仅主或仅客 / 同赛事」三张累计盈亏图）

**赛前报告正文中的大名单块**：`matchSquadGenerator.js` 针对单场双方输出的内容（每队含 **预测首发、预测替补、伤疑、伤停、落选**），即该场赛前报告文件 **`epl/report/{赛季}/round-{N}/{主队}_vs_{客队}.md`** 里「大名单与预测」部分应写入的正文来源；可与 `prompts/match_analysis_template.md` 其余章节（交锋、盘口、战意等）合并为完整报告。

详细目录规划见 [PLAN.md](./PLAN.md)。
