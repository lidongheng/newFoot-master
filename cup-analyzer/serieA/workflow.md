# 意大利足球甲级联赛（Serie A / 意甲）分析工作流程

## 赛事概览

- **赛事**：意大利足球甲级联赛（Serie A）
- **联赛序号（球探）**：**34**，子联赛 **2948** → `s34_2948.js` / `l34.js` / `bs34.js` / `td34.js`
- **当前架构赛季**：`25-26`（目录 `report/25-26/`、`news/25-26/` 等）；新赛季增加平行目录如 `26-27/`
- **赛制**：20 队、双循环 **38 轮**，胜 3 分、平 1 分、负 0 分

### 赛程数据与 `clubMatchAnalyzer`（与 crawler-server 统一）

- **主文件**：`serieA/data/s34_2948.js`（子联赛 2948；同目录 `l34.js`、`bs34.js`、`td34.js`）。
- **更新**：`cd cup-analyzer/crawler-server && CUP_ANALYZER_CUP=serieA node crawlers/scheduleCrawler.js`（或 `npm run crawl:schedule:seriea`）会写入 `data/`，并把赛程主文件**同步拷贝**到 `crawler-server/match_center/s34.js`。
- **分析器路径**：`config.resolveScheduleData('34', false)` 指向 **`serieA/data/s34_2948.js`**。`squadTarget.leagueSerial` 填 **34**。

### 从大名单到球队画像（联赛流水线）

与世界杯不同：联赛用 **`playerListCrawler` + `clubMatchAnalyzer` + `leagueSquadProcessor`** 生成 `squad/{队名}.md`；后半段 **`squadFinalInitializer`** → 人工审核 **`squad-final/`**（在 **`## 伤停` / `## 伤疑`** 中维护）→ **`teamProfileGenerator`** → **`teamProfile/{队名}.md`**（单队、逐队改 `squadTarget.js`）。

**前置**：`cd cup-analyzer/crawler-server`；`CUP_ANALYZER_CUP=serieA`；`config/squadTarget.js` 中 `leagueSerial=34`、`teamSerial`、`roundSerial`、`teamChineseName`；赛程见 `serieA/data/s34_2948.js`。

**输出路径**：`serieA/squad/` → `serieA/squad-final/` → `serieA/teamProfile/`。球队序号见 `serieA/data/球队与序号对照表.md`。

**转会记录列**：`serieA/squad/{队名}.md` 表末「转会记录」来自球探 `player{序号}.js`。请先执行 `npm run crawl:player-list:club` 再跑 `analyze:club-domestic`；若仅用 `crawl:player-list`，该列多为 `-`。

```bash
npm run crawl:player-list:club
npm run analyze:club-domestic
CUP_ANALYZER_CUP=serieA node processors/leagueSquadProcessor.js
CUP_ANALYZER_CUP=serieA node processors/squadFinalInitializer.js --team <序号>
# 人工审核 serieA/squad-final/{队名}.md
CUP_ANALYZER_CUP=serieA node processors/teamProfileGenerator.js --team <序号>
```

## 三大阶段工作流

### 阶段一：赛前准备（赛季初或数据更新时）

```
1. 确认 data/ 下赛程与盘路为最新
   └─ cd cup-analyzer/crawler-server && CUP_ANALYZER_CUP=serieA node crawlers/scheduleCrawler.js
      （同步 s34_2948、l34、bs34、td34，并拷赛程至 match_center/s34.js）

2. 维护 data/冠军赔率.md、data/球队与序号对照表.md（可与 s34_2948.js 内 arrTeam 核对）

3. 按需扩展 teamProfile/、关注积分榜（争冠、欧冠区、欧联/欧协、保级）
```

### 阶段二：赛中分析（每场）

```
赛前 2–3 天:
  0. 大名单与预测块：以 **`serieA/squad-final/{队名}.md`** 为准时可运行  
     `CUP_ANALYZER_CUP=serieA node processors/matchSquadGenerator.js --home <主队序号> --away <客队序号>`  
  1. 预测首发（格式见 prompts/match_analysis_template.md）
  2. 交锋、近况、未来赛程（含欧冠/欧联/国内杯赛）、球探伤病摘要：`cd cup-analyzer/crawler-server`，在 `config/squadTarget.js` 填写本场 **`matchSerial`**，执行 **`npm run crawl:match-statistics`**（亦可 `-- --match <序号>`），将输出并入赛前报告或 `news/...`。（与 **`npm run generate:cycle-report`** 同源。）详见 [crawler-server/README.md](../crawler-server/README.md)「matchStatisticsCrawler」。
  3. 盘口：初盘/临场；引用 l34.js、bs34.js、td34.js
  3b. 格雷厄姆式亚盘安全边际：Market → Fair → Δ → 三档结论（定义见下 **「亚盘安全边际（格雷厄姆式）」**）
  4. 意甲专项：积分榜、战意（争冠/欧战/保级）、德比
  5. 赛前报告 → `serieA/report/25-26/round-{N}/{主队}_vs_{客队}.md`

赛前 1–2 小时:
  6. 确认首发与临场盘
  7. 填写报告「结果」与星级

赛后:
  8. 可选：赛后数据与复盘 → postMatchSummary/25-26/...
```

### 阶段三：策略分析（贯穿赛季）

```
争冠 / 欧冠资格 / 欧战名额 / 保级:
  - 结合积分榜与赛程密度；意甲球队欧冠/欧战夹联赛时需评估轮换

德比与地区对抗:
  - 按当季对阵与历史复盘维护关注列表
```

## 关键决策原则

### 意甲 vs 英超

1. **盘路**：轮次与样本与英超同级，`l34`/`bs34` 可参考；仍需结合近况与伤停。
2. **广实**：联赛积分榜 + `data/冠军赔率.md` + `teamProfile/`；若有意甲档位文档可放在 `.cursor/rules/dh-match-predict-analysis/references/`（与 `*-team-strength.md` 命名一致）。
3. **欧战双线**：强队欧冠周中、周末联赛，注意轮换与体能。
4. **无冬歇与英超一致节奏差异**：以当季官方赛程为准。

### 亚盘安全边际（格雷厄姆式）

与下文 **「亚盘周期盈亏 HTML（霍华德·马克斯周期视角）」** 的关系：**马克斯章节**是历史盘口序列上的周期与模拟回测视角；**本章**是单场把广实换算为合理让球、与市场盘口对比的定价与安全边际视角。二者互补，不要混为一谈。

**符号约定（主队视角）**

- **Market（市场让球）**：初盘与临场亚盘，与 `l34.js` / `bs34.js`、赛前报告「盘口」一致。
- **Fair（合理让球）**：在当前信息下，主队相对客队「应开」的让球，可写单值或闭区间（如 -0.75～-1.0）。
- **记法**：主队**让球**为**负**（如让半球 **-0.5**），主队**受让**为**正**（如 **+0.5**）。
- **偏差**：**Δ = Fair − Market**（两者均为同一场、同一主队视角）。

**定位 → Fair（可审计的最小推导链）**

1. **实际定位**：广实档位（若有意甲 strength 文档则引用）+ 积分榜 + `data/冠军赔率.md` + `teamProfile/` + 战意（争冠/欧战/保级）。
2. **广实差**：主客相对强度。
3. **主场加成**：意甲主场经验区间（与历史复盘自校）。
4. **伤停与首发可信度**：相对 `squad-final` 与当场预测首发修正。
5. **战意与赛程密度**：欧战、一周双赛、杯赛穿插。
6. 输出 **Fair**（单值或区间）。

**阶段二中的操作（每场）**

在「盘口：初盘/临场」之后：**列出 Market（初盘+临场）→ 写 Fair 与一行推导链 → 计算 Δ → 标注三档之一**；赛前报告与 `prompts/match_analysis_template.md`「四、盘口解析」对齐。

**三档结论（rubric）**

- **值得投**：|Δ| 达到自设阈值（常见起点 **0.25～0.5 球**），且无重大未决信息；仍须满足模板纪律。
- **观望**：|Δ| 低于阈值，或信息不全，或高方差情境。
- **反向投**：Fair 与 Market 方向性或幅度严重背离，且能说明「市场假设错在哪」；默认小仓或仅记录。

以上为**纪律框架**，不保证结果。

### 报告与素材路径约定

| 类型 | 路径 |
|------|------|
| 赛前报告 | `cup-analyzer/serieA/report/25-26/round-{N}/...` |
| 素材 | `cup-analyzer/serieA/news/25-26/round-{N}/...` |
| 赛后 | `cup-analyzer/serieA/postMatchSummary/25-26/round-{N}/...` |
| 亚盘周期 HTML | `cup-analyzer/serieA/report/25-26/round-{N}/{主队}_vs_{客队}_cycle.html`（见下 **霍华德·马克斯周期视角**） |

### 亚盘周期盈亏 HTML（霍华德·马克斯周期视角）

1. 编辑 `cup-analyzer/crawler-server/config/squadTarget.js`：设置 `matchSerial`（球探单场序号）、`roundSerial`、**`season: '25-26'`**（与 `report/25-26` 一致）；`matchLeagueName` 填与球探战绩表「联赛」列一致的文案（如 **`意甲`**），供「同赛事」折线图筛选。
2. 在 `cup-analyzer/crawler-server` 执行：`cd cup-analyzer/crawler-server && CUP_ANALYZER_CUP=serieA npm run generate:cycle-report`
3. 输出：`cup-analyzer/serieA/report/25-26/round-{N}/{主队}_vs_{客队}_cycle.html`（ECharts 远程 CDN；每场模拟投注 1000 元、固定港盘水位 0.9，初盘盘口来自球探分析页；每队含「全部 / 仅主或仅客 / 同赛事」三张累计盈亏图）

**赛前报告正文中的大名单块**：`matchSquadGenerator.js` 单场双方输出（预测首发、预测替补、伤疑、伤停、落选）应写入 **`serieA/report/25-26/round-{N}/{主队}_vs_{客队}.md`** 正文。

详细目录规划见 [PLAN.md](./PLAN.md)。
