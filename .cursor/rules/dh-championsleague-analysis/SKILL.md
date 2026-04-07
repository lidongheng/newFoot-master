---
name: dh-championsleague-analysis
description: |
  针对欧洲冠军联赛（欧冠）的全流程分析助手。覆盖联赛阶段（瑞士赛制）、两回合淘汰赛、跨赛事疲劳与盘路数据。
  始终从专家视角出发，帮用户多想一步。遇到不确定的问题主动与用户确认。
  支持：球队画像、赛前分析、赛后复盘、积分出线、抽签对阵、两回合策略、跨赛事疲劳。
  当用户提到"欧冠"、"欧洲冠军联赛"、"championsLeague"、"联赛阶段"、"淘汰赛两回合"、"欧冠抽签"时使用此技能。
---

# 欧冠联赛分析工作流程

**SKILL**: dh-championsleague-analysis  
**版本**: v1.1（大名单每场抓取与工具表）

---

## 项目概览

分析目录：`cup-analyzer/championsLeague/`（与 `theWorldCup/` 同级）。

1. **赛前**：球队画像、分档（冠军赔率）、数据文件维护  
2. **赛中**：逐场赛前报告 + 赛后复盘（对齐 `league-analyzer` 模板）  
3. **策略**：联赛阶段积分区间、淘汰赛抽签、两回合战术、跨赛事疲劳  

## 关键差异：欧冠 vs 世界杯 vs 国内联赛

| 维度 | 国内联赛 | 欧冠 (cup-analyzer) |
|------|----------|---------------------|
| 大名单 | league-analyzer：每场前 `crawlerPlayer` + `crawlerClub3_new` | **同左**：每场赛前必抓，无世界杯式「赛前一次性 squad 缓存」 |
| 盘路 | 轮次多 | 联赛阶段可用 `l103`/`bs103`，样本少于联赛 |
| 广实 | 联赛档次文件 | **欧冠冠军赔率** + 俱乐部联赛广实 |
| 赛制 | 双循环联赛 | **瑞士制联赛阶段** + **两回合淘汰** |
| 战意 | 保级/争冠 | 积分区间、三线作战、首回合/次回合 |
| 策略侧重 | 积分榜 | **排名 1–8 / 9–24 / 25–36**、抽签、无「小组默契球」 |

---

## 文件路径说明

### 数据（联赛序号 103）

```
cup-analyzer/championsLeague/data/
├── c103.js                 # 赛程、积分榜等
├── l103.js                 # 亚盘盘路榜
├── bs103.js                # 大小球盘路榜
├── td103.js                # 入球时间（若未放置见 data/README.md）
├── 冠军赔率.md
└── 球队与序号对照表.md
```

### 规则

```
cup-analyzer/championsLeague/rule/
├── league-phase-rule.md    # 联赛阶段（36 队、8 轮）
└── knockout-rule.md        # 淘汰赛、两回合、无客场进球
```

### 报告 / 素材 / 复盘

```
cup-analyzer/championsLeague/report/{赛季}/league-phase/round-{N}/...
cup-analyzer/championsLeague/news/{赛季}/...
cup-analyzer/championsLeague/postMatchSummary/{赛季}/...
```

赛前报告七大部参照：`league-analyzer/prompts/match_analysis_template.md`，并增加 **UCL 特别分析**（积分形势、两回合总比分、跨赛事间隔）。

### 策略

```
cup-analyzer/championsLeague/strategy/
├── league-phase-standings.md
├── knockout-draw-analysis.md
├── two-leg-tactics.md
└── cross-competition-fatigue.md
```

---

## 阶段一：赛前与数据

### 爬虫 / 赛程更新

```bash
cd cup-analyzer/crawler-server
# 默认世界杯 c75
node crawlers/scheduleCrawler.js

# 欧冠 c103 → 写入 championsLeague/data/c103.js
CUP_ANALYZER_CUP=championsLeague node crawlers/scheduleCrawler.js
# 或 npm run crawl:schedule:ucl
```

球员数据用 `backend-server` 的 `crawlerPlayer.js` / `crawlerClub3_new.js` 与 `player_center/`（**非** `crawler-server/crawlers/squadCrawler.js`，后者面向世界杯国家队批量缓存）。

---

## 阶段二：赛中逐场分析

**顺序**：先完成 **大名单抓取**（与 `league-analyzer/workflow.md` 一致），再写预测首发与赛前报告。

1. **大名单（每场必做）**  
   - 编辑 `backend-server/config/wudaconfig.js`：`teamSerial`、`leagueSerial`（国内联赛）、`roundSerial`、`isNation: false`、`teamChineseName`。  
   - `cd backend-server && node crawlerPlayer.js` → `player_center/{序号}.json`  
   - `node crawlerClub3_new.js` → `player_center/{序号}-new.json`  
   - 主、客队各跑一遍；素材写入 `cup-analyzer/championsLeague/news/{赛季}/{阶段}/{对阵}/`。  
2. **赛前**：`dh-match-predict-analysis` 流程 + `match_analysis_template.md` 小点不遗漏  
3. **盘口**：可读 `l103.js`、`bs103.js`、`td103.js`（若有）  
4. **赛后**：`dh-post-match-analysis` 流程  

---

## 阶段三：欧冠专项策略

1. **联赛阶段**：更新 `league-phase-standings.md`（直通/附加赛/淘汰区）  
2. **抽签**：更新 `knockout-draw-analysis.md`  
3. **两回合**：`two-leg-tactics.md`（总比分、加时、点球）  
4. **疲劳**：`cross-competition-fatigue.md`（欧冠 vs 国内联赛 vs 国内杯赛）  

---

## 档次定位（参考）

结合 `data/冠军赔率.md` 划分夺冠热门档次，用于**临场盘口**与联赛广实交叉验证（具体区间需按赛季赔率更新）。

---

## 工具与脚本

| 脚本 | 用途 |
|------|------|
| `backend-server/crawlerPlayer.js` | 抓取球队大名单（需先改 `config/wudaconfig.js`） |
| `backend-server/crawlerClub3_new.js` | 抓取球队详细出场/首发/进球助攻/阵型等（依赖 `player_center` 与同配置） |
| `crawler-server/crawlers/scheduleCrawler.js` | 更新 c75 / c103 赛程 |
| `crawler-server/crawlers/matchDataCrawler.js` | 赛后数据 |
| `crawler-server/crawlers/oddsCrawler.js` | 赔率 |

---

## 参考索引

| 需要什么 | 去哪找 |
|---------|--------|
| 工作流程 | `cup-analyzer/championsLeague/workflow.md` |
| 计划 | `cup-analyzer/championsLeague/PLAN.md` |
| 赛前模板 | `league-analyzer/prompts/match_analysis_template.md` |

---

> **东恒出品** | AI Native Coder · 独立开发者
