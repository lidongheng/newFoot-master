# 欧洲国家联赛分析工作流程

## 赛事与目录

- **赛事**：欧洲国家联赛（UEFA Nations League，球探简称欧国联）。
- **模块名**：`europeanNationalLeague`；球探序号 **1864**。
- **类型**：国家队杯赛，`type: 'cup'`、`isNation: true`；杯赛赛程使用 `c1864.js` 和 `G*` 阶段，不使用联赛 `s*` / `R_*` 格式。
- **当前赛季**：`2026-2027`，与球探 URL 的赛季目录一致。
- **参赛队**：54 队，A/B/C 级别各 16 队，D 级别 6 队。分析时同时记录级别与小组，不能把不同级别的同名小组混用。
- **配置**：`data/config.json`，含位置映射和全部 54 队懂球帝／球探对应关系；球队序号见 [对照表](./data/球队与序号对照表.md)。

名单和画像按球队平铺：`squad/{队名}.md` → `squad-final/{队名}.md` → `teamProfile/{队名}.md`。报告、素材与复盘使用 `2026-2027/round-{N}/`，淘汰赛可将 `N` 填为阶段名称。

## 运行前准备

以下命令均在 **`cup-analyzer/crawler-server`** 中运行，使用现有共用脚本；无需把 JS 脚本复制成另一套。

先编辑 `crawler-server/config/squadTarget.js`，逐队填写：

```js
const squadTarget = {
  leagueSerial: '1864',
  leagueSlug: 'europeanNationalLeague',
  season: '2026-2027',
  teamSerial: '744', // 示例：英格兰；换队时同时修改中文名。
  teamChineseName: '英格兰',
  isNation: true,
  matchByName: true, // 国家队按全名匹配，不能沿用俱乐部的 false。
  matchLeagueName: '欧国联',
};

module.exports = squadTarget;
```

单场相关命令运行前，再从真实赛程填写 `matchSerial`、`matchTime`（北京时间 `YYYY-MM-DD HH:mm:ss`）和 `roundSerial`。杯赛出场统计按 `G*` 阶段读取，`roundSerial` 主要用于报告目录，不用它套联赛轮次筛选。环境变量决定赛事和输出目录，`squadTarget.js` 决定当前球队，两者必须一致。

## 阶段一：赛程、大名单与球队画像

### 1. 更新赛程与盘路

```bash
npm run crawl:schedule:europeanNationalLeague
# 同一脚本的完整写法：
npx cross-env CUP_ANALYZER_CUP=europeanNationalLeague node crawlers/scheduleCrawler.js
```

输出 `europeanNationalLeague/data/c1864.js`、`l1864.js`、`bs1864.js`，赛程同步到 `crawler-server/match_center/c1864.js`。`resolveScheduleData('1864', true)` 指向本模块赛程。杯赛不抓取联赛专用的 `td1864.js`，不得在报告中编造 75 分钟后进球统计。

### 2. 从大名单到球队画像（与 EPL 使用同一流水线）

欧国联统一使用 **playerListCrawler → clubMatchAnalyzer → leagueSquadProcessor → teamScheduleProcessor → squadFinalInitializer → teamProfileGenerator**。国家队球员按**姓名**关联比赛、名单与画像中的数据，不按球衣号匹配。

**前置配置**：在 `config/squadTarget.js` 设置 `leagueSerial: '1864'`、`leagueSlug: 'europeanNationalLeague'`、`isNation: true`、`matchByName: true`，并填写当前 `teamSerial`、`teamChineseName`、`season` 和 `matchTime`（北京时间，`YYYY-MM-DD HH:mm:ss`）。

**大名单数据源**：`npm run crawl:player-list:club` 默认抓取懂球帝；也可通过 `-w` 指定来源。选择球探或显式指定懂球帝时使用：

```bash
npm run crawl:player-list:club -- -w qiutan
npm run crawl:player-list:club -- -w dqd
```

也可省略 `-w dqd`，直接运行 `npm run crawl:player-list:club`。球探来源通过球探球员资料补充俱乐部与转会记录；懂球帝来源抓取当前赛季统计、球员资料、能力值和转会记录。两种来源都写入 `output/player_center/{teamSerial}.json`。抓取完成后再运行 `analyze:club-domestic`。

懂球帝国家队名单不读取俱乐部的 `seasons` / `season_list`。欧国联统计从球员的 `international` 分组按 `data/config.json` 的 `dqd.competitionId: '2442'` 和 `dqd.seasonId: '27038'` 精确筛选；换届时需同步核实这两个 ID。国家队赛程不传俱乐部跨年赛季参数，使用接口返回的当前年份赛程。没有本届赛事统计的球员保留名单，统计字段不补零。

以下两条任意系统相同：

```bash
npm run crawl:player-list:club
npm run analyze:club-domestic
```

`isNation: true` 控制杯赛 `c1864.js` / `G*` 阶段读取；`matchByName: true` 控制国家队全名匹配。名单处理器和画像的数据合并同样按姓名匹配，球衣号仅作为球员资料展示。

下面四条需设置 `CUP_ANALYZER_CUP=europeanNationalLeague`。**任意系统推荐**：

```bash
npx cross-env CUP_ANALYZER_CUP=europeanNationalLeague node processors/leagueSquadProcessor.js
# 运行前在 squadTarget.js 设置 teamSerial 和 matchTime（北京时间，YYYY-MM-DD HH:mm:ss）。
npx cross-env CUP_ANALYZER_CUP=europeanNationalLeague node processors/teamScheduleProcessor.js
npx cross-env CUP_ANALYZER_CUP=europeanNationalLeague node processors/squadFinalInitializer.js --team <序号>
# 人工审核 europeanNationalLeague/squad-final/{队名}.md。
npx cross-env CUP_ANALYZER_CUP=europeanNationalLeague node processors/teamProfileGenerator.js --team <序号>
```

输出路径：`squad/{队名}.md` → `squad-final/{队名}.md` → `teamProfile/{队名}.md`。按本次征召审核名单、主教练和阵型，并填写 `## 伤停` / `## 伤疑`（每行 `球衣号-姓名`）。已有最终名单应先人工核对，避免重新初始化覆盖手工内容。

### 3. 历史比赛画像

```bash
npx cross-env CUP_ANALYZER_CUP=europeanNationalLeague node processors/historyMatchGenerator.js --team <序号>
# 只读本地历史阵容，不补抓网络数据：
npx cross-env CUP_ANALYZER_CUP=europeanNationalLeague node processors/historyMatchGenerator.js --team <序号> --no-crawl
```

输出 `historyMatch/{队名}.md`，历史比赛球员按全名匹配。在 `description/{队名}.md` 补充主帅、核心球员、磨合程度、战术和本次征召变化。

## 阶段二：单场赛前与赛后流程

### 赛前 2–3 天

1. 更新双方最终名单中的伤停、伤疑，并重跑画像。
2. 生成单场大名单文案，写入赛前报告正文：

```bash
# 744 / 772 仅示范主客队参数；正式运行须与真实对阵一致。
npx cross-env CUP_ANALYZER_CUP=europeanNationalLeague node processors/matchSquadGenerator.js --home 744 --away 772
```

每队输出预测首发、预测替补、伤疑、伤停；国家队沿用世界杯规则，替补为首发与伤停以外的全部名单，不生成俱乐部的「落选」行。

3. 填写真实 `matchSerial`，抓取交锋、近况、未来赛程与球探伤病摘要：

```bash
npx cross-env CUP_ANALYZER_CUP=europeanNationalLeague npm run crawl:match-statistics
```

4. 查询双方从本场开球起未来 14 天的全部比赛，核对俱乐部归队、跨国旅行、连续征召和休息间隔。相邻开球间隔低于 67 小时标红，67–92 小时标黄，超过 92 小时标绿。记录实际来源与时间，不推测缺失赛程。
5. 搜集双方最新发布会、主帅采访和伤停新闻，记录来源、发布时间及确认程度；伤停正文与审核后的 `squad-final` 一致。
6. 依据 [赛前报告模板](./prompts/match_analysis_template.md) 生成 `report/2026-2027/round-{N}/{主队}_vs_{客队}.md`，素材存入同层次 `news/`。

### 盘口与安全边际

- 初盘／临场、主客场及中立场身份逐场核实。`l1864.js` 与 `bs1864.js` 可用于盘路统计，须核对文件实际字段、样本与排名范围，不能套用英超 20 队排名。
- 有对应数据时，分别列总盘／主场／客场的双方净胜盘、排名，以及大球率和排名。缺失项目明确写缺项；无 `td1864.js` 时不要求 EPL 的 75 分钟进球数据块。
- 主队视角让球为负、受让为正；记录 **Fair（合理让球）**、**Market（初盘／临场）**、**Δ = Fair − Market**。
- Fair 推导链：国家队相对实力 → 实际主场或中立场 → 伤停与首发 → 国家队磨合 → 所在级别、小组积分及争冠／升级／保级战意 → 赛程与旅行。
- 按信息完整度、偏差和预设阈值标注「值得投／观望／反向投」，写明理由。样本少、已完成目标、轮换未明时单独说明不确定性。

### 亚盘周期盈亏 HTML（与两个参考工作流同源）

填写 `squadTarget.js` 的 `matchSerial`、`season: '2026-2027'`、`roundSerial`、`matchLeagueName: '欧国联'` 后运行：

```bash
npx cross-env CUP_ANALYZER_CUP=europeanNationalLeague npm run generate:cycle-report
```

实际输出目录是 `report/{season}/round-{roundSerial}/`，文件名由脚本生成，后缀 `_cycle.html`。与文字报告一同交付路径。该工具每场模拟投入 1000 元、固定港盘水位 0.9，展示全部／主或客／同赛事的累计模拟盈亏；不等于真实投注结果。因缺少场次或网络失败未生成时，注明实际原因。

### 临场与赛后

赛前 1–2 小时核对实际首发、伤停与临场盘口，更新 Fair / Market / Δ。赛后按真实单场序号运行现有比赛数据脚本：

```bash
npx cross-env CUP_ANALYZER_CUP=europeanNationalLeague node crawlers/matchDataCrawler.js --match <比赛序号>
# 赛后详细数据按真实阶段键批量增量抓取，示例为 A 级联赛 A 组：
npx cross-env CUP_ANALYZER_CUP=europeanNationalLeague node crawlers/postMatchDataCrawler.js --round G28577A
npm run crawl:schedule:europeanNationalLeague
```

赛后复盘写入 `postMatchSummary/2026-2027/round-{N}/`。`postMatchDataCrawler` 的 `--round` 使用赛程中真实的 `G*` 阶段键；不要使用只在其本地 HTML 模式中生效的 `--match` 来筛选在线抓取。

## 阶段三：赛事策略维护

每个国家队比赛窗口更新级别、小组排名、晋级与升降级条件，参考 [策略框架](./strategy/README.md) 和 [规则核验](./rule/README.md)。区分小组主客双循环、两回合淘汰或附加赛、决赛圈单场比赛；具体规则以该赛季官方规定为准。

世界杯的 `strategyAnalyzer.js` 和 `worldCupTeamRouteMonitor.js` 采用世界杯固定分组与晋级路线，不作为欧国联流程运行。
