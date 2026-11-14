# 国际友谊赛分析工作流程

## 赛事与目录

- **赛事**：国际友谊赛（International Friendly，球探简称国际友谊）。
- **模块名**：`InternationalFriendship`；球探序号 **1366**。
- **类型**：国家队杯赛，`type: 'cup'`、`isNation: true`；杯赛赛程使用 `c1366.js` 和 `G*` 阶段，不使用联赛 `s*` / `R_*` 格式。
- **当前赛季**：`2026`，与球探 URL 的赛季目录一致。
- **维护范围**：仅配置日本、巴西、中国、马来西亚四支成年男子国家队；赛程文件保留球探原始全赛事数据。
- **配置**：`data/config.json`，含位置映射和全部 4 队懂球帝／球探对应关系；球队序号见 [对照表](./data/球队与序号对照表.md)。

名单和画像按球队平铺：`squad/{队名}.md` → `squad-final/{队名}.md` → `teamProfile/{队名}.md`。报告、素材与复盘使用 `2026/round-{N}/`，`roundSerial` 用作报告目录编号；友谊赛没有联赛轮次或淘汰赛晋级轮次。

## 运行前准备

以下命令均在 **`cup-analyzer/crawler-server`** 中运行，使用现有共用脚本；无需把 JS 脚本复制成另一套。

先编辑 `crawler-server/config/squadTarget.js`，逐队填写：

```js
const squadTarget = {
  leagueSerial: '1366',
  leagueSlug: 'InternationalFriendship',
  season: '2026',
  teamSerial: '903', // 示例：日本；换队时同时修改中文名。
  teamChineseName: '日本',
  isNation: true,
  matchByName: true, // 国家队按全名匹配，不能沿用俱乐部的 false。
  matchLeagueName: '国际友谊',
};

module.exports = squadTarget;
```

单场相关命令运行前，再从真实赛程填写 `matchSerial`、`matchTime`（北京时间 `YYYY-MM-DD HH:mm:ss`）和 `roundSerial`。杯赛出场统计按 `G*` 阶段读取，`roundSerial` 主要用于报告目录，不用它套联赛轮次筛选。环境变量决定赛事和输出目录，`squadTarget.js` 决定当前球队，两者必须一致。

## 阶段一：赛程、大名单与球队画像

### 1. 更新赛程与盘路

```bash
npm run crawl:schedule:InternationalFriendship
# 同一脚本的完整写法：
npx cross-env CUP_ANALYZER_CUP=InternationalFriendship node crawlers/scheduleCrawler.js
```

输出 `InternationalFriendship/data/c1366.js`、`l1366.js`、`bs1366.js`，赛程同步到 `crawler-server/match_center/c1366.js`。`resolveScheduleData('1366', true)` 指向本模块赛程。杯赛不抓取联赛专用的 `td1366.js`，不得在报告中编造 75 分钟后进球统计。

### 2. 从大名单到球队画像（与 EPL 使用同一流水线）

国际友谊赛统一使用 **playerListCrawler → clubMatchAnalyzer → leagueSquadProcessor → teamScheduleProcessor → squadFinalInitializer → teamProfileGenerator**。国家队球员按**姓名**关联比赛、名单与画像中的数据，不按球衣号匹配。

**前置配置**：在 `config/squadTarget.js` 设置 `leagueSerial: '1366'`、`leagueSlug: 'InternationalFriendship'`、`isNation: true`、`matchByName: true`，并填写当前 `teamSerial`、`teamChineseName`、`season` 和 `matchTime`（北京时间，`YYYY-MM-DD HH:mm:ss`）。

**大名单数据源**：`npm run crawl:player-list:club` 默认抓取懂球帝；也可通过 `-w` 指定来源。选择球探或显式指定懂球帝时使用：

```bash
npm run crawl:player-list:club -- -w qiutan
npm run crawl:player-list:club -- -w dqd
```

也可省略 `-w dqd`，直接运行 `npm run crawl:player-list:club`。球探来源通过球探球员资料补充俱乐部与转会记录；懂球帝来源抓取当前赛季统计、球员资料、能力值和转会记录。两种来源都写入 `output/player_center/{teamSerial}.json`。抓取完成后再运行 `analyze:club-domestic`。

懂球帝国家队名单不读取俱乐部的 `seasons` / `season_list`。国际友谊赛统计从球员的 `international` 分组按 `data/config.json` 的 `dqd.competitionId: '389'` 和 `dqd.seasonId: '26128'` 精确筛选；跨年时需同步核实这两个 ID。国家队赛程不传俱乐部跨年赛季参数，使用接口返回的当前年份赛程。没有本届赛事统计的球员保留名单，统计字段不补零。

以下两条任意系统相同：

```bash
npm run crawl:player-list:club
npm run analyze:club-domestic
```

`isNation: true` 控制杯赛 `c1366.js` / `G*` 阶段读取；`matchByName: true` 控制国家队全名匹配。名单处理器和画像的数据合并同样按姓名匹配，球衣号仅作为球员资料展示。

**当前数据限制（2026-11-14）**：球探本季马来西亚只有未开赛记录，尚无可统计的已完赛友谊赛。可先抓取名单，但 `analyze:club-domestic` 会提示无符合条件比赛，不能据此要求后续生成本季 `*-new.json`，也不要借用欧国联、预选赛或旧赛季统计来填充。已有 `*-new.json` 必须核对赛事和生成时间，避免误读其它赛事留下的同名缓存。

名单表的「出场 / 首发 / 进球 / 助攻」读取 `analyze:club-domestic` 生成的 `{teamSerial}-new.json`，球员资料仍取懂球帝。两站译名不同时，在 `data/config.json` 对应球队的 `playerNames` 中维护已核实的姓名对照（懂球帝姓名 → 球探姓名数组），不按球衣号关联；未匹配到统计显示 `-`，分析器实际统计为零时显示 `0`。球队画像按联赛规则在球员括号内显示已有统计，零值项省略，国家队同时保留所属俱乐部。这四队暂未配置球员译名对照；遇到不同译名时先核实身份，不按号码补配统计。

球员位置使用分析器 `positions` 中出场次数最多的实际比赛位置，并按该位置归入门将、后卫、中场或前锋；没有有效比赛位置统计时保留懂球帝名单已有位置，不推测细分位置。球衣号、俱乐部等资料仍使用懂球帝名单。

下面四条需设置 `CUP_ANALYZER_CUP=InternationalFriendship`。**任意系统推荐**：

```bash
npx cross-env CUP_ANALYZER_CUP=InternationalFriendship node processors/leagueSquadProcessor.js
# 运行前在 squadTarget.js 设置 teamSerial 和 matchTime（北京时间，YYYY-MM-DD HH:mm:ss）。
npx cross-env CUP_ANALYZER_CUP=InternationalFriendship node processors/teamScheduleProcessor.js
npx cross-env CUP_ANALYZER_CUP=InternationalFriendship node processors/squadFinalInitializer.js --team <序号>
# 人工审核 InternationalFriendship/squad-final/{队名}.md。
npx cross-env CUP_ANALYZER_CUP=InternationalFriendship node processors/teamProfileGenerator.js --team <序号>
```

输出路径：`squad/{队名}.md` → `squad-final/{队名}.md` → `teamProfile/{队名}.md`。按本次征召审核名单、主教练和阵型，并填写 `## 伤停` / `## 伤疑`（每行 `球衣号-姓名`）。已有最终名单应先人工核对，避免重新初始化覆盖手工内容。

### 3. 历史比赛画像

```bash
npx cross-env CUP_ANALYZER_CUP=InternationalFriendship node processors/historyMatchGenerator.js --team <序号>
# 只读本地历史阵容，不补抓网络数据：
npx cross-env CUP_ANALYZER_CUP=InternationalFriendship node processors/historyMatchGenerator.js --team <序号> --no-crawl
```

输出 `historyMatch/{队名}.md`，历史比赛球员按全名匹配。在 `description/{队名}.md` 补充主帅、核心球员、磨合程度、战术和本次征召变化。

## 阶段二：单场赛前与赛后流程

### 赛前 2–3 天

1. 更新双方最终名单中的伤停、伤疑，并重跑画像。
2. 生成单场大名单文案，写入赛前报告正文：

```bash
# 744 / 772 仅示范主客队参数；正式运行须与真实对阵一致。
npx cross-env CUP_ANALYZER_CUP=InternationalFriendship node processors/matchSquadGenerator.js --home 744 --away 772
```

每队输出预测首发、预测替补、伤疑、伤停；国家队沿用世界杯规则，替补为首发与伤停以外的全部名单，不生成俱乐部的「落选」行。

3. 填写真实 `matchSerial`，抓取交锋、近况、未来赛程与球探伤病摘要：

```bash
npx cross-env CUP_ANALYZER_CUP=InternationalFriendship npm run crawl:match-statistics
```

4. 查询双方从本场开球起未来 14 天的全部比赛，核对俱乐部归队、跨国旅行、连续征召和休息间隔。相邻开球间隔低于 67 小时标红，67–92 小时标黄，超过 92 小时标绿。记录实际来源与时间，不推测缺失赛程。
5. 搜集双方最新发布会、主帅采访和伤停新闻，记录来源、发布时间及确认程度；伤停正文与审核后的 `squad-final` 一致。
6. 依据 [赛前报告模板](./prompts/match_analysis_template.md) 生成 `report/2026/round-{N}/{主队}_vs_{客队}.md`，素材存入同层次 `news/`。

### 盘口与安全边际

- 初盘／临场、主客场及中立场身份逐场核实。`l1366.js` 与 `bs1366.js` 可用于盘路统计，须核对文件实际字段、样本与排名范围，不能套用英超 20 队排名。
- 有对应数据时，分别列总盘／主场／客场的双方净胜盘、排名，以及大球率和排名。缺失项目明确写缺项；无 `td1366.js` 时不要求 EPL 的 75 分钟进球数据块。
- 主队视角让球为负、受让为正；记录 **Fair（合理让球）**、**Market（初盘／临场）**、**Δ = Fair − Market**。
- Fair 推导链：国家队相对实力 → 实际主场或中立场 → 伤停与首发 → 国家队磨合 → FIFA 排名积分影响及有来源的备战安排 → 赛程与旅行。
- 按信息完整度、偏差和预设阈值标注「值得投／观望／反向投」，写明理由。样本少、练兵安排或轮换未明时单独说明不确定性。

### 亚盘周期盈亏 HTML（与两个参考工作流同源）

填写 `squadTarget.js` 的 `matchSerial`、`season: '2026'`、`roundSerial`、`matchLeagueName: '国际友谊'` 后运行：

```bash
npx cross-env CUP_ANALYZER_CUP=InternationalFriendship npm run generate:cycle-report
```

实际输出目录是 `report/{season}/round-{roundSerial}/`，文件名由脚本生成，后缀 `_cycle.html`。与文字报告一同交付路径。该工具每场模拟投入 1000 元、固定港盘水位 0.9，展示全部／主或客／同赛事的累计模拟盈亏；不等于真实投注结果。因缺少场次或网络失败未生成时，注明实际原因。

### 临场与赛后

赛前 1–2 小时核对实际首发、伤停与临场盘口，更新 Fair / Market / Δ。赛后按真实单场序号运行现有比赛数据脚本：

```bash
npx cross-env CUP_ANALYZER_CUP=InternationalFriendship node crawlers/matchDataCrawler.js --match <比赛序号>
# 赛后详细数据按真实阶段键批量增量抓取，示例为十一月阶段：
npx cross-env CUP_ANALYZER_CUP=InternationalFriendship node crawlers/postMatchDataCrawler.js --round G28379
npm run crawl:schedule:InternationalFriendship
```

赛后复盘写入 `postMatchSummary/2026/round-{N}/`。`postMatchDataCrawler` 的 `--round` 使用赛程中真实的 `G*` 阶段键；不要使用只在其本地 HTML 模式中生效的 `--match` 来筛选在线抓取。

## 阶段三：友谊赛规则与战意

见 [规则核验](./rule/README.md) 和 [策略框架](./strategy/README.md)。本模块不使用欧国联升级、保级、分组出线或世界杯晋级路线规则。

- **规则层面的结果影响**：对被 FIFA 认定并纳入计算的成年国家队 A 级友谊赛，记录 FIFA 排名积分影响；不是球探标为友谊赛就自动计入排名。排名计算以赛前积分、比赛结果和比赛权重为基础，不能仅用名次差代替积分差。
- **比赛权重**：FIFA SUM 公式为 `P_after = P_before + I × (W − We)`；国际比赛日窗口内友谊赛 `I = 10`，窗口外 `I = 5`。计算前核对官方比赛日窗口与 A 级赛认定。
- **没有竞赛积分战意**：不写争冠、争四、升级、保级、出线、净胜球争位或挑选淘汰赛对手等结论；也不把累计友谊赛结果当作联赛积分榜。
- **实际比赛目标**：备战正式比赛、磨合战术、考察新人、控制负荷和主场表现都可能影响阵容与投入。这些是需要发布会和名单支持的实际目标，不是友谊赛附带的晋级规则；不能把“只涉及排名的竞赛结果”推成“球队只有排名动机”。
- **排名与求胜欲望分开**：FIFA 排名权重较低不等于一定放水，强队必胜、弱队无战意等判断必须有具体信息。记录试阵、轮换、约定换人和比赛时长，分析盘口时区分商业展示、训练性质与正式 A 级友谊赛。

参考来源（2026-11-14 核对）：

1. [FIFA 男足排名 SUM 计算规则](https://digitalhub.fifa.com/m/f99da4f73212220/original/edbm045h0udbwkqew35a-pdf.pdf)：窗口内外权重及积分公式。
2. [FIFA 世界杯前热身赛汇总](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/pre-tournament-warm-up-results-fixtures-scorers)：友谊赛兼具备战、轮换和考察球员用途。
3. [FIFA Series 友谊赛说明](https://inside.fifa.com/advancing-football/media-releases/fifa-series-international-friendlies-pilot-project-to-commence-in-march-2024)：国家队跨洲交手与发展机会。
