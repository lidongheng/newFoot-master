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
| `theWorldCup`（默认） | 世界杯（杯赛 `c`） | `theWorldCup/data/c75.js` |
| `championsLeague` | 欧冠（杯赛 `c`） | `championsLeague/data/c103.js` |
| `epl` | 英超（联赛 `s`） | `epl/data/s36.js` |
| `koreanKLeague` | 韩K联（联赛 `s`，子联赛 313） | `koreanKLeague/data/s15_313.js` |
| `aLeague` | 澳超（联赛 `s`，子联赛 462） | `aLeague/data/s273_462.js` |
| `mls` | 美职联（联赛 `s`，子联赛 165） | `mls/data/s21_165.js` |
| `serieA` | 意甲（联赛 `s`，子联赛 2948） | `serieA/data/s34_2948.js` |

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
- **可选**：`--with-club` 同上，补充 `currentClub`、`recentTransfers`。联赛大名单 Markdown（`leagueSquadProcessor`）中的 **「转会记录」** 列依赖上述字段；若未使用 `--with-club`，分析合并后该列多为 `-`。

```bash
node crawlers/playerListCrawler.js
node crawlers/playerListCrawler.js --with-club
```

npm：`npm run crawl:player-list` / `npm run crawl:player-list:club`（需要转会列时请用后者）

### 3. `scheduleCrawler.js` — 更新赛程 JS

- **作用**：按 `config.fileId` 从球探拉取赛程（杯赛 `c{序号}.js` 或联赛 `s{序号}.js` / `s{序号}_{子联赛}.js`），覆盖 `config.paths.cupScheduleData`（会先备份）。`version` 参数使用 `YYYYMMDDHH`。
- **赛程路径统一**：`clubMatchAnalyzer` 通过 `config.resolveScheduleData(leagueSerial, isNation)` 解析文件——已在 `cups` 中配置的序号指向对应模块 `data/` 下的赛程 JS；未配置的序号仍读 `match_center/s{n}.js` 或 `c{n}.js`。每次赛程拉取成功后，会将主赛程文件**拷贝**到 `match_center/`，与兜底路径保持一致。
- **同步文件**（与赛程同赛季目录、`cupScheduleData` 所在 `data/` 下；序号均为 `config.cupSerial`）：
  - **联赛**（`config.type === 'league'`）：依次更新 `l{序号}.js`（亚盘盘路）、`bs{序号}.js`（大小球盘路）、`td{序号}.js`（入球时间）。
  - **杯赛**（`config.type === 'cup'`）：只额外更新 `l{序号}.js`、`bs{序号}.js`，**不**拉取 `td`（杯赛无入球时间分布 JS）。
  - 各请求间隔 `config.crawlDelayMs`；若赛程拉取失败则不再请求后续文件；若 l/bs/td 中某项失败会记录错误并继续尝试其余项。
- **可选**：`--standings` 仅打印小组积分榜 JSON。

```bash
node crawlers/scheduleCrawler.js
node crawlers/scheduleCrawler.js --standings
```

npm：`npm run crawl:schedule:ucl` / `npm run crawl:schedule:epl` / `npm run crawl:schedule:kleague` / `npm run crawl:schedule:aleague` / `npm run crawl:schedule:mls` / `npm run crawl:schedule:seriea`

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

### 6b. `leagueSquadProcessor.js` — 俱乐部 `*-new.json` → 联赛 `squad/{队名}.md`

- **前置**：`npm run crawl:player-list`（若需 **转会记录** 列则 `npm run crawl:player-list:club`）、`npm run analyze:club-domestic`（生成 `output/player_center/{序号}-new.json`，分析器会从 `{序号}.json` 合并 `currentClub` / `recentTransfers`）。
- **输出**：`{联赛模块}/squad/{中文队名}.md`（平铺，无 `group-X/`；表含出场/首发/进球/助攻及 **转会记录** 列）。
- **环境**：`CUP_ANALYZER_CUP=epl|aLeague|mls|serieA|championsLeague|koreanKLeague` 等。

```bash
CUP_ANALYZER_CUP=epl node processors/leagueSquadProcessor.js
```

npm：`npm run process:league-squad`

### 7. `squadFinalInitializer.js` — 初选 `squad/` → 最终名单草稿 `squad-final/`

- **作用**：从 `{杯赛}/squad/` 复制到 `{杯赛}/squad-final/`。**世界杯**：插入待办注释并将标题改为「最终26人大名单（待确认）」；你在 `squad-final/` 中裁剪至恰好 26 人。**联赛 / 无小组积分榜的杯赛（如欧冠）**：平铺路径 `squad/{队名}.md` → `squad-final/{队名}.md`，插入「请审核并确认名单」TODO。**全赛事**：在 `## 统计摘要` 之前自动插入 **`## 伤停` / `## 伤疑`** 占位（若文件中尚无），供赛前填写当前伤停、伤疑名单（每行 `球衣号-姓名`）。
- **输出**：`config.paths.squadFinal`（世界杯为 `theWorldCup/squad-final/`）

```bash
node processors/squadFinalInitializer.js
node processors/squadFinalInitializer.js --team 744
```

npm：`npm run process:squad-final:init` / `npm run process:squad-final:init:one -- 744`

### 8. `teamProfileGenerator.js` — 球队画像

- **输入**：默认优先 `{杯赛}/squad-final/` 下 Markdown；若无或解析为空则回退 `output/player_center/{序号}.json`。`--source raw` 可强制仅用 JSON。
- **squad-final**：当成功从该文件解析名单时，会在写出画像后**回写**同文件中的「## 统计摘要」（与当前表格一致）。若 `squad-final` 中含已填写的 **`## 伤停` / `## 伤疑`**，画像「二、球队阵容」中会生成 **### 伤停 / ### 伤疑**（联赛带出场统计；世界杯/国家队为俱乐部+位置）。
- **输出**：`{杯赛}/teamProfile/{队名}.md`

```bash
node processors/teamProfileGenerator.js
node processors/teamProfileGenerator.js --source raw
node processors/teamProfileGenerator.js --team 744
```

npm：`npm run process:profile` / `npm run process:profile:one -- 744`

### 8b. `matchSquadGenerator.js` — 赛中大名单（单场双方）

- **作用**：读取双方 **`squad-final/{队名}.md`**（联赛平铺；世界杯为 `group-X/{队名}.md`），解析 **推荐首发、伤停、伤疑**，在 stdout 输出预测首发、预测替补、伤疑、伤停；**联赛类**另输出「落选」（替补为除首发/伤停/伤疑外出场数最高的 9 人）；**世界杯**替补为除首发与伤停外的全部球员，**不输出落选**。
- **环境**：需设置正确的 `CUP_ANALYZER_CUP`（`epl`、`championsLeague`、`koreanKLeague`、`aLeague`、`mls`、`serieA`、`theWorldCup` 等）。

```bash
CUP_ANALYZER_CUP=epl node processors/matchSquadGenerator.js --home 19 --away 25
CUP_ANALYZER_CUP=theWorldCup node processors/matchSquadGenerator.js --home 744 --away 640
```

npm：`npm run generate:match-squad -- --home <主队序号> --away <客队序号>`

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

**联赛：大名单 → 球队画像（英超 / 澳超 / 欧冠 / 韩K联等）**

1. 编辑 `config/squadTarget.js`（`leagueSerial` 填**国内联赛**序号；欧冠画像时不是 103）
2. `npm run crawl:player-list` → `npm run analyze:club-domestic`
3. `npm run process:league-squad`（需先 `CUP_ANALYZER_CUP=...`）
4. `npm run process:squad-final:init:one -- <序号>`
5. 人工审核 `squad-final/{队名}.md`（维护 `## 伤停` / `## 伤疑`）
6. `CUP_ANALYZER_CUP=... npm run process:profile:one -- <序号>`

**单场赛前大名单块（可选）**：`CUP_ANALYZER_CUP=... npm run generate:match-squad -- --home <序号> --away <序号>`

各模块步骤与路径见对应目录下 `workflow.md`。
