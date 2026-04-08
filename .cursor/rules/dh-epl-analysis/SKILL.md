---
name: dh-epl-analysis
description: |
  针对英格兰足球超级联赛（英超 EPL）的全流程分析助手。覆盖 38 轮联赛、争冠/争四/欧战/保级、盘路数据、德比、多线作战与赛程拥堵。
  始终从专家视角出发，帮用户多想一步。遇到不确定的问题主动与用户确认。
  支持：Big 6 画像与复盘、赛前分析、赛后复盘、积分榜形势、赛程间隔（<70h、双欧冠夹联赛）。
  当用户提到"英超"、"EPL"、"Premier League"、"英格兰超级联赛"、"争四"、"降级"、"Big6"时使用此技能。
---

# 英超联赛（EPL）分析工作流程

**SKILL**: dh-epl-analysis  
**版本**: v1.0

---

## 项目概览

分析目录：`cup-analyzer/epl/`（与 `championsLeague/`、`theWorldCup/` 同级）。

1. **赛前**：维护 data、冠军赔率、Big 6 `teamProfile/`（含转会窗、圣诞新年赛程）  
2. **赛中**：逐场赛前报告 + 赛后复盘（模板见 `epl/prompts/match_analysis_template.md`）  
3. **策略**：争冠、争欧冠（前四）、争欧战、保级、赛程拥堵、德比  

## 关键差异：英超 vs 欧冠 vs 世界杯

| 维度 | EPL | 欧冠 |
|------|-----|------|
| 赛制 | 20 队 **38 轮** 双循环 | 瑞士制 + 淘汰赛 |
| 盘路 | **l36 / bs36** 样本大 | l103 联赛阶段样本相对较少 |
| 报告路径 | `report/{赛季}/round-N/` | `report/{赛季}/league-phase/...` |
| 策略 | 争冠/争四/欧战/保级、德比 | 积分区间 1–8 / 两回合 |
| 重点球队 | **Big 6** 画像与新闻密度 | 欧战球队三线作战 |

---

## 文件路径说明

### 数据（联赛序号 36）

```
cup-analyzer/epl/data/
├── c36.js                  # 赛程、积分榜（CUP_ANALYZER_CUP=epl scheduleCrawler）
├── l36.js                  # 亚盘盘路榜
├── bs36.js                 # 大小球盘路榜
├── td36.js                 # 入球时间
├── 冠军赔率.md
└── 球队与序号对照表.md
```

### 规则与策略

```
cup-analyzer/epl/rule/league-rule.md

cup-analyzer/epl/strategy/
├── title-race.md
├── ucl-qualification.md
├── european-qualification.md
├── relegation-battle.md
├── fixture-congestion.md
└── derby-dynamics.md
```

### 报告 / 素材 / 复盘

```
cup-analyzer/epl/report/{赛季}/round-{N}/...
cup-analyzer/epl/news/{赛季}/round-{N}/...
cup-analyzer/epl/postMatchSummary/{赛季}/round-{N}/...
```

### Big 6 画像

```
cup-analyzer/epl/teamProfile/阿森纳.md
cup-analyzer/epl/teamProfile/曼彻斯特城.md
cup-analyzer/epl/teamProfile/利物浦.md
cup-analyzer/epl/teamProfile/曼彻斯特联.md
cup-analyzer/epl/teamProfile/托特纳姆热刺.md
cup-analyzer/epl/teamProfile/切尔西.md
```

---

## 爬虫与赛程

```bash
cd cup-analyzer/crawler-server

# 更新英超赛程 → epl/data/c36.js
CUP_ANALYZER_CUP=epl node crawlers/scheduleCrawler.js
# 或：npm run crawl:schedule:epl
```

大名单与联赛出场：`match_center/s36.js` + `config/squadTarget.js` → `npm run crawl:player-list` → `npm run analyze:club-domestic`

---

## 阶段二：逐场分析要点

1. 大名单与伤停（每场）  
2. 积分榜战意（争冠/争四/保级）  
3. 盘口：l36、bs36、td36  
4. 欧战周：查阅 `strategy/fixture-congestion.md`（<70 小时、夹心赛程）  
5. 德比：查阅 `strategy/derby-dynamics.md`  

---

## 参考索引

| 需要什么 | 去哪找 |
|---------|--------|
| 工作流程 | `cup-analyzer/epl/workflow.md` |
| 计划 | `cup-analyzer/epl/PLAN.md` |
| 赛前模板 | `cup-analyzer/epl/prompts/match_analysis_template.md` |

---

> **东恒出品** | AI Native Coder · 独立开发者
