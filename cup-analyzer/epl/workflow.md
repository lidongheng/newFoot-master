# 英超联赛分析工作流程

## 赛事概览

- **赛事**：英格兰足球超级联赛（Premier League）
- **联赛序号（球探）**：**36** → `s36.js` / `l36.js` / `bs36.js` / `td36.js`
- **当前架构赛季**：`25-26`（目录 `report/25-26/`、`news/25-26/` 等）；新赛季增加平行目录如 `26-27/`
- **赛制**：20 队、双循环 **38 轮**，胜 3 分、平 1 分、负 0 分

## 三大阶段工作流

### 阶段一：赛前准备（赛季初或数据更新时）

```
1. 确认 data/ 下赛程与盘路数据为最新
   └─ cd cup-analyzer/crawler-server && CUP_ANALYZER_CUP=epl node crawlers/scheduleCrawler.js
   └─ 可选：对照 match_center/s36.js

2. 维护 data/冠军赔率.md、data/球队与序号对照表.md

3. 更新 teamProfile/ 下 Big 6 画像（阿森纳、曼彻斯特城、利物浦、曼彻斯特联、托特纳姆热刺、切尔西）
   └─ 转会窗、圣诞/新年密集赛程、双线作战负荷、伤病与状态

4. 阅读 strategy/ 下框架文档，按轮次更新争冠、争四、欧战、保级与赛程拥堵
```

**大名单（每场）**：与欧冠俱乐部流程一致，使用 **`cup-analyzer/crawler-server`**：

```
  a. 准备 match_center/s36.js（英超）
  b. 编辑 config/squadTarget.js：teamSerial、leagueSerial=36、roundSerial、isNation=false 等
  c. npm run crawl:player-list → output/player_center/{teamSerial}.json
  d. npm run analyze:club-domestic → {teamSerial}-new.json
  e. 将双方大名单、伤停等整理进 news/{赛季}/round-N/{对阵}/
```

### 阶段二：赛中分析（每场）

```
赛前 2–3 天:
  0. 抓取双方大名单（必做）
  1. 预测首发（格式见 prompts/match_analysis_template.md）
  2. 交锋、近况、未来赛程（含欧冠/欧联/国内杯赛）
  3. 盘口：初盘/临场；引用 l36.js、bs36.js、td36.js
  4. 英超专项：积分榜位置、战意（争冠/争四/保级）、德比属性
  5. 赛前报告 → report/{赛季}/round-N/{主队}_vs_{客队}.md

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
2. **广实**：联赛积分榜 + `data/冠军赔率.md` + Big 6 画像。
3. **无两回合**：单场决胜，战意与轮换更多来自积分榜与赛程密度。
4. **Big 6**：新闻与热度集中，优先保证 `teamProfile/` 与复盘深度。

### 报告与素材路径约定

| 类型 | 路径 |
|------|------|
| 赛前报告 | `cup-analyzer/epl/report/{赛季}/round-{N}/...` |
| 素材 | `cup-analyzer/epl/news/{赛季}/round-{N}/...` |
| 赛后 | `cup-analyzer/epl/postMatchSummary/{赛季}/round-{N}/...` |

详细目录规划见 [PLAN.md](./PLAN.md)。
