# 欧冠联赛分析工作流程

## 赛事概览

- **赛事**：欧洲冠军联赛（UEFA Champions League）
- **联赛序号（球探）**：**103** → `c103.js` / `l103.js` / `bs103.js`（`scheduleCrawler` 对杯赛不拉取 `td`；若需入球时间分布请自行维护或从球探导出）
- **当前架构赛季**：`25-26`（目录 `report/25-26/`、`news/25-26/` 等）；新赛季增加平行目录如 `26-27/`
- **联赛阶段**：36 队、瑞士赛制、每队 8 轮（4 主 4 客），单一总积分榜
- **出线**：前 8 直通 16 强；第 9–24 名附加赛；第 25–36 名淘汰
- **淘汰赛**：附加赛 / 16 强 / 8 强 / 半决赛为 **两回合**；**决赛单场**；**已取消客场进球规则**，平局进加时与点球

### 赛程数据与 `clubMatchAnalyzer`（与 crawler-server 统一）

- **本模块主文件**：`championsLeague/data/c103.js`（及同目录 `l103.js`、`bs103.js`）。
- **更新**：优先在 **`cup-analyzer/crawler-server`** 下执行 **`npm run crawl:schedule:ucl`**（各系统相同）。也可 `npx cross-env CUP_ANALYZER_CUP=championsLeague node crawlers/scheduleCrawler.js`；Bash 简写见 [crawler-server/README.md](../crawler-server/README.md)。会写入 `data/` 并**同步拷贝**赛程至 `crawler-server/match_center/c103.js`。
- **分析欧冠场次时的「国内联赛」赛程**：`squadTarget.leagueSerial` 填该队**所属联赛**序号（如英超 36）；`resolveScheduleData` 会指向 **`epl/data/s36.js`** 等已登记模块路径，未登记的联赛仍用 `match_center/s{n}.js` 兜底。详见 `crawler-server/match_center/README.md`。

### 从大名单到球队画像（联赛流水线）

欧冠 `CUP_ANALYZER_CUP=championsLeague` 下**无 A–L 小组**，`squad/`、`squad-final/` 为**平铺** `{队名}.md`。生成大名单时仍用国内联赛数据：`playerListCrawler` / `clubMatchAnalyzer` 依赖 **`squadTarget.leagueSerial` = 该俱乐部所属联赛**（如英超 **36**），不是 103。

与世界杯不同：前半段为 **`playerListCrawler` + `clubMatchAnalyzer` + `leagueSquadProcessor`**；后半段 **`squadFinalInitializer`** → **`teamProfileGenerator`**。输出：`championsLeague/squad/` → `squad-final/` → `teamProfile/`。序号见 `championsLeague/data/球队与序号对照表.md`。

工作目录：`cup-analyzer/crawler-server`。**squadTarget**：`teamSerial`=俱乐部序号，`leagueSerial`=所属联赛（如 36）。

以下两条任意系统相同：

```bash
npm run crawl:player-list
npm run analyze:club-domestic
```

下面三条需设置 `CUP_ANALYZER_CUP=championsLeague`。**任意系统推荐**：

```bash
npx cross-env CUP_ANALYZER_CUP=championsLeague node processors/leagueSquadProcessor.js
npx cross-env CUP_ANALYZER_CUP=championsLeague node processors/squadFinalInitializer.js --team <序号>
# 人工审核 championsLeague/squad-final/{队名}.md
npx cross-env CUP_ANALYZER_CUP=championsLeague node processors/teamProfileGenerator.js --team <序号>
```

若在 macOS / Linux 终端习惯 Bash，也可将上述三条写成 `CUP_ANALYZER_CUP=championsLeague node processors/...`。手写 PowerShell/cmd 见 [crawler-server/README.md](../crawler-server/README.md)「Windows 与手动设置环境变量」。

## 三大阶段工作流

### 阶段一：赛前准备（赛季开始前或联赛阶段初期）

```
1. 确认 data/ 下赛程与盘路数据为最新
   └─ `cd cup-analyzer/crawler-server`，再执行 **`npm run crawl:schedule:ucl`**（推荐）
      （更新 `championsLeague/data/c103` 与 `l103`/`bs103`，并同步 `match_center/c103.js`；亦可 `npx cross-env CUP_ANALYZER_CUP=championsLeague node crawlers/scheduleCrawler.js`；手写 Shell 见 [crawler-server/README.md](../crawler-server/README.md)）

2. 维护 data/冠军赔率.md、data/球队与序号对照表.md

3. （可选）生成或补充 teamProfile/{球队}.md
   └─ 身价、阵容、欧战目标等

4. 阅读 strategy/ 下框架文档，按轮次更新积分形势与疲劳分析
```

**说明（大名单）**：欧冠是跨整个赛季的俱乐部赛事，**没有像世界杯那样赛前一次性公布的「最终大名单」可长期缓存**。每场比赛前都必须重新抓取双方最新阵容（伤病、转会、状态变化），具体见 **阶段二步骤 0**。世界杯模式见 `theWorldCup/squad/` + `squadCrawler.js`；俱乐部走 **`cup-analyzer/crawler-server`**（`playerListCrawler.js` + `analyzers/clubMatchAnalyzer.js`，配置 `config/squadTarget.js`；国内联赛赛程路径由 **`config.resolveScheduleData`** 解析，优先各联赛 `data/`，见上文与 `crawler-server/match_center/README.md`）。旧流程仍可用 `backend-server/crawlerPlayer.js` / `crawlerClub3_new.js`，将逐步废弃。

### 阶段二：赛中分析（每场）

**大名单是分析基础**：每场赛前必须先完成步骤 0，再写报告、预测首发。

```
赛前 2–3 天:
  0. 抓取双方大名单（必做；逻辑已迁入 cup-analyzer/crawler-server）
     a. 确保该队**国内联赛**赛程 JS 为最新（如英超：在 crawler-server 下跑 **`npm run crawl:schedule:epl`**，或确认 `epl/data/s36.js` 已更新；分析器通过 `leagueSerial` 读 `resolveScheduleData` 指向的路径，不必单独维护 `match_center` 为唯一来源）
     b. 编辑 `crawler-server/config/squadTarget.js`：
        - teamSerial：该队球探俱乐部序号（见 `data/球队与序号对照表.md` 或 titan007 球队页）
        - leagueSerial：该队**所属国内联赛**序号（如英超 36、西甲 4）
        - roundSerial：当前国内联赛轮次（与 workflow 说明一致即可）
        - isNation：false（俱乐部）
        - teamChineseName：球队中文名
     c. cd cup-analyzer/crawler-server && npm run crawl:player-list
        → 输出 `crawler-server/output/player_center/{teamSerial}.json`（基础大名单）
     d. npm run analyze:club-domestic
        → 输出 `crawler-server/output/player_center/{teamSerial}-new.json`（出场、首发、进球助攻、阵型等）
     e. 将 squadTarget 改为客队，对客队重复 c–d
     f. 将双方大名单、伤停等整理进 news/{赛季}/{阶段}/{对阵}/（可与统计信息、新闻稿同目录）
  1. 预测首发（格式见 [prompts/match_analysis_template.md](./prompts/match_analysis_template.md)）
  2. 交锋、近况、未来赛程（含国内联赛/杯赛）
  3. 盘口：初盘/临场；可引用 `data/` 下 l103.js、bs103.js（欧冠阶段样本量少于国内联赛，需结合判断；杯赛爬虫不更新 td）
  4. UCL 专项：当前积分排名、是否轮换、两回合总比分（淘汰赛）
  5. 赛前报告 → report/{赛季}/league-phase|playoff|.../{轮次或阶段}/{主队}_vs_{客队}.md

赛前 1–2 小时:
  6. 确认首发与临场盘
  7. 填写报告「结果」与星级

赛后:
  8. 可选：爬取赛后数据（cup-analyzer/crawler-server，比赛 ID 来自 c103 或页面）
  9. 赛后复盘 → postMatchSummary/{赛季}/...（目录结构与 report 对齐）
```

### 阶段三：策略分析（贯穿赛季）

```
联赛阶段中（约第 4 轮起）:
  - 更新 strategy/league-phase-standings.md：出线区、附加赛区、淘汰区
  - 更新 cross-competition-fatigue.md：一周双赛、轮换风险

联赛阶段结束后:
  - 更新 knockout-draw-analysis.md：种子、同国回避、可能对阵
  - 淘汰赛每轮前更新 two-leg-tactics.md：首回合赛果对次回合的影响

与国内联赛并行期:
  - 持续维护 cross-competition-fatigue.md
```

## 关键决策原则

### 欧冠 vs 国内联赛

1. **盘路**：联赛阶段可用 `l103`/`bs103`，但轮次少于联赛，需结合球队广实与战意。
2. **广实**：可参考国内联赛 `references/*-team-strength.md` + **UCL 冠军赔率档次**（见 `data/冠军赔率.md`）。
3. **两回合淘汰赛**：首回合比分、主客场顺序、是否需净胜球/追分，影响次回合战意与节奏。
4. **三线作战**：欧冠、国内联赛、国内杯赛 — 轮换与留力需单独评估。
5. **无「小组赛挑对手」式操作**：积分与抽签规则决定路径，分析重点在 **排名区间** 与 **抽签半区**，而非默契球。

### 报告与素材路径约定

| 类型 | 路径 |
|------|------|
| 赛前报告 | `cup-analyzer/championsLeague/report/{赛季}/league-phase/round-{N}/...` |
| 淘汰赛 | `.../playoff/`、`round-of-16/`、`quarter-finals/`、`semi-finals/`、`final/` |
| 素材 | `cup-analyzer/championsLeague/news/{赛季}/...` |
| 赛后 | `cup-analyzer/championsLeague/postMatchSummary/{赛季}/...` |

详细目录规划见 [PLAN.md](./PLAN.md)。
