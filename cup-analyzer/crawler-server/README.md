# cup-analyzer / crawler-server

球探（titan007）数据抓取与加工：国家队大名单、俱乐部大名单、赛程、赛后数据、赔率，以及大名单 Markdown / 球队画像 / 策略分析等。HTTP 入口为 Koa（`app.js`），多数任务通过 **Node 脚本** 直接运行。

## 环境

```bash
cd cup-analyzer/crawler-server
npm install
```

## 切换赛事（`CUP_ANALYZER_CUP`）

| 环境变量值 | 说明 | 赛程数据文件（示例） |
|------------|------|----------------------|
| `theWorldCup`（默认） | 世界杯 | `theWorldCup/data/c75.js` |
| `championsLeague` | 欧冠 | `championsLeague/data/c103.js` |
| `epl` | 英超 | `epl/data/s36.js` |

示例：

```bash
CUP_ANALYZER_CUP=championsLeague node crawlers/scheduleCrawler.js
```

配置见 [`config/index.js`](config/index.js)。

---

## 爬虫（`crawlers/`）

### 1. `squadCrawler.js` — 国家队大名单（世界杯等）

- **作用**：拉取 `tdl{球队序号}.js`，解析 26 人名单，写入 `output/player_center/{球队序号}.json`。
- **可选**：用同一文件里的 `lineupDetail` 对应 `player{球员序号}.js`，写入 `currentClub`、`recentTransfers`（请求量 ≈ 每队人数；不再依赖阵容页 HTML 解析链接）。

```bash
node crawlers/squadCrawler.js                    # 批量：跳过已有 json；默认不抓俱乐部
node crawlers/squadCrawler.js --team 744         # 单队；默认抓俱乐部+转会
node crawlers/squadCrawler.js -t 744 --force     # 单队强制重抓
node crawlers/squadCrawler.js --team 744 --no-club # 单队不抓俱乐部
node crawlers/squadCrawler.js --with-club        # 批量也抓俱乐部（耗时长）
```

npm：`npm run crawl:squad` / `npm run crawl:squad:one -- 744`

### 2. `playerListCrawler.js` — 俱乐部大名单（欧冠 / 英超）

- **作用**：按 [`config/squadTarget.js`](config/squadTarget.js) 中的 `teamSerial` 拉取单俱乐部大名单，写入 `output/player_center/{teamSerial}.json`。
- **可选**：`--with-club` 同上，补充 `currentClub`、`recentTransfers`。

```bash
node crawlers/playerListCrawler.js
node crawlers/playerListCrawler.js --with-club
```

npm：`npm run crawl:player-list` / `npm run crawl:player-list:club`

### 3. `scheduleCrawler.js` — 更新赛程 JS

- **作用**：下载当前杯赛对应 `c{cupSerial}.js`，覆盖 `config.paths.cupScheduleData` 指向的文件（会先备份）。
- **可选**：`--standings` 仅打印小组积分榜 JSON。

```bash
node crawlers/scheduleCrawler.js
node crawlers/scheduleCrawler.js --standings
```

npm：`npm run crawl:schedule:ucl` / `npm run crawl:schedule:epl`

### 4. `matchDataCrawler.js` — 单场 / 批量赛后数据

- **作用**：移动端赛后页，输出到 `output/basicData/{阶段}/{主队}_vs_{客队}/`（`matchInfo.json`、`lineup.json` 等）。

```bash
node crawlers/matchDataCrawler.js --match 12345678   # 单场（比赛序号）
node crawlers/matchDataCrawler.js group              # 批量小组赛
node crawlers/matchDataCrawler.js group 1            # 小组赛第 1 轮
```

npm：`npm run crawl:match`

### 5. `oddsCrawler.js` — 亚盘 / 欧赔

```bash
node crawlers/oddsCrawler.js 12345678
```

输出：`output/basicData/odds/{比赛序号}.json`

---

## 处理器（`processors/`）

### 6. `squadProcessor.js` — 大名单 JSON → Markdown

- **输入**：`output/player_center/{球队序号}.json`
- **输出**：`{杯赛目录}/squad/group-X/{中文队名}.md`（表头含 **俱乐部**、**转会记录**；无俱乐部数据时显示 `-`）

```bash
node processors/squadProcessor.js
node processors/squadProcessor.js --team 744
```

npm：`npm run process:squad` / `npm run process:squad:one -- 744`

### 7. `squadFinalInitializer.js` — 初选 `squad/` → 最终名单草稿 `squad-final/`

- **作用**：从 `{杯赛}/squad/` 复制到 `{杯赛}/squad-final/`，插入待办注释并将标题改为「最终26人大名单（待确认）」；你在 `squad-final/` 中裁剪至恰好 26 人。
- **输出**：`config.paths.squadFinal`（世界杯为 `theWorldCup/squad-final/`）

```bash
node processors/squadFinalInitializer.js
node processors/squadFinalInitializer.js --team 744
```

npm：`npm run process:squad-final:init` / `npm run process:squad-final:init:one -- 744`

### 8. `teamProfileGenerator.js` — 球队画像

- **输入**：默认优先 `{杯赛}/squad-final/` 下 Markdown；若无或解析为空则回退 `output/player_center/{序号}.json`。`--source raw` 可强制仅用 JSON。
- **squad-final**：当成功从该文件解析名单时，会在写出画像后**回写**同文件中的「## 统计摘要」（与当前表格一致）。
- **输出**：`{杯赛}/teamProfile/{队名}.md`

```bash
node processors/teamProfileGenerator.js
node processors/teamProfileGenerator.js --source raw
node processors/teamProfileGenerator.js --team 744
```

npm：`npm run process:profile` / `npm run process:profile:one -- 744`

### 9. `strategyAnalyzer.js` — 世界杯策略分析（出线 / 挑对手 / 默契球 / 疲劳）

```bash
node processors/strategyAnalyzer.js
```

---

## 分析器（`analyzers/`）

### 10. `clubMatchAnalyzer.js` — 俱乐部国内联赛出场分析

- **前置**：`match_center/s{联赛序号}.js`（见 [`match_center/README.md`](match_center/README.md)）、先跑 `playerListCrawler`、编辑 `config/squadTarget.js`。
- **输出**：`output/player_center/{teamSerial}-new.json`

```bash
node analyzers/clubMatchAnalyzer.js
```

npm：`npm run analyze:club-domestic`

---

## 共享说明

- **球员俱乐部扩展**：[`utils/playerDetailEnricher.js`](utils/playerDetailEnricher.js)（阵容页解析链接 → `player{serial}.js` → `nowTeamInfo` / `transferInfo`）。
- **URL 模板**：[`config/targets.js`](config/targets.js)（`teamLineupUrl`、`playerDataUrl`、`teamDetailUrl` 等）。
- **俱乐部分析目标**：[`config/squadTarget.js`](config/squadTarget.js)（`teamSerial`、`leagueSerial`、`roundSerial` 等）。

---

## 工作流速查

**世界杯大名单 + Markdown**

1. `node crawlers/squadCrawler.js --with-club`（或单队 `node crawlers/squadCrawler.js --team 744`）
2. `node processors/squadProcessor.js` → `squad/`（初选）
3. `node processors/squadFinalInitializer.js` → 编辑 `squad-final/` 为最终 26 人
4. `node processors/teamProfileGenerator.js`（优先 `squad-final`）

**欧冠 / 英超单场赛前**

1. 编辑 `config/squadTarget.js`
2. `node crawlers/playerListCrawler.js --with-club`
3. `node analyzers/clubMatchAnalyzer.js`
