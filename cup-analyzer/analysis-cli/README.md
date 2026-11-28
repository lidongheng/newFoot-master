# 足球数据分析 CLI

熟悉联赛第六步：在本目录执行 `node bin/monthlySchedule.js --league laLiga --season 2026-2027`，或用 `node bin/buildAllMonthlySchedule.js` 批量运行。读取球队画像 JSON 的 `futureSchedule`，以生成画像时的 `matchTime`（内部存储字段 `anchorTime`）为基准，读取 `recentMatches`（最近3场已完赛）、`currentMatch`（本场）和 `matches`（未来比赛），按时间展示最近3场、本场及之后30天内的全部赛事。本场一行及报告说明重点显示距上一场的小时数。按相邻开球时间计算间隔，最早一场无上一场记录，间隔和等级留空；危险≤66小时、警告>66且≤92小时、良好>92且≤120小时、一周一赛>120小时。连续三场首尾≤144小时备注6天3场，>144且≤168小时备注7天3场，基准比赛参与检查。输出每队 `teamAgent/{球队目录}/球队未来一个月赛程.md`、`.html`。缺少画像或结构化赛程时记录原因并继续其他球队，不生成空报告；缺少历史或本场结构化字段时，先运行 `teamScheduleProcessor.js` 再生成画像；真实无已完赛记录时保留空数组，本场说明无法计算上一场间隔。批量摘要见 `output/monthly-schedule-summary.json`；存在失败时命令返回非零退出码。不修改源JSON，不联网刷新，不接受轮次或日期筛选参数。

熟悉联赛第五步：在本目录执行 `node bin/sameOpeningHandicap.js --league laLiga --season 2026-2027`，或用 `node bin/buildAllSameOpeningHandicap.js` 按各联赛本地赛程赛季全量生成。仅取 `data/s*.js` 的 `jh["R_N"]` 中全场亚盘初赔 `[10]` 与全场比分 `[6]`，按每队相同主客、相同初赔分组，分别统计赢盘、赢半、走盘、输半、输盘，并附逐场明细。输出各队 `teamAgent/{球队目录}/本赛季同档次对手较量.md`、`.html`。支持 `--round`、`--from/--to`；无范围时使用本赛季本地全部已完赛比赛。缺失初赔和比分列明排除，不补零；同档次在此仅指同初赔。详细口径与命令见各联赛 `teamAgent/workflow.md`；全量执行摘要见 `output/same-opening-handicap-summary.json`。

读取已登记联赛的 teamAgent/basicData，按单项指标生成球队榜和球员榜。分析不联网、不修改原始比赛数据；人工修正使用独立 repair 命令。各联赛的 teamAgent/workflow.md 提供对应命令，以下以西甲为例。

## 使用

工作目录：cup-analyzer/analysis-cli。

```bash
# 查看球队、球员支持的指标与字段来源
node bin/cli.js catalog --league laLiga --season 2026-2027

# 第 1–13 轮，生成全部支持的单项榜
node bin/cli.js build --league laLiga --season 2026-2027 --rounds 1-13

# 只生成射门、射正、球队 xG 榜
node bin/cli.js build --league laLiga --season 2026-2027 --metrics shots,shotsOnTarget,xg

# 北京时间日期范围，包含起止日
node bin/cli.js build --league laLiga --season 2026-2027 --from 2026-09-01 --to 2026-11-27

# 每队最近 N 场，球员使用球队选中的比赛
node bin/cli.js build --league laLiga --season 2026-2027 --last 6

# 可选：限定巴萨及其球员
node bin/cli.js build --league laLiga --season 2026-2027 --team 84 --rounds 1-13

node --test tests/analysis.test.js
```

league、完整 season 必填，必须与本地赛程一致。轮次、日期、近 N 场范围互斥；不传则使用本地该赛季全部已完赛数据。日期必须同时提供 from/to，未知指标直接报错。

## 唯一输出结构

```text
laLiga/leagueRanking/26-27/
├── teams/
│   ├── shots/
│   │   ├── shots.md
│   │   ├── shots.html
│   │   └── shots.json
│   ├── shotsOnTarget/
│   │   ├── shotsOnTarget.md
│   │   ├── shotsOnTarget.html
│   │   └── shotsOnTarget.json
│   └── xG/
│       ├── xG.md
│       ├── xG.html
│       └── xG.json
└── players/
    ├── shots/
    │   ├── shots.md
    │   ├── shots.html
    │   └── shots.json
    └── 其他已支持的球员指标/
```

赛季目录只包含 teams、players，不再生成 all、team-84、范围子目录、首页或 manifest/data 文件。

每个指标目录严格只有三个同名文件：

- MD：该指标的排行榜表格；表格后列出相关待补数据，不混入其他指标。
- JSON：MD 表格对应的对象数组，字段名就是表头，行顺序、排名、数值与 MD 一致，无其他元信息。null 表示缺失，MD 对应显示「缺失」，不会补成 0。
- HTML：使用本地 Vue、Element Plus 的表格，支持搜索、表头排序、斑马纹和固定表头。数据与 MD/JSON 一致，暂无图表。

命令行指标 ID 仍使用 xg，实际目录和文件名为 xG。球员没有个人 xG 来源，不生成 players/xG。

每次运行覆盖所选指标的三个文件，不保留旧范围版本；例如 --team 84 会把所选指标更新为单队结果，运行前应确认命令范围。不指定 --metrics 时更新全部支持指标；仅指定部分指标时，其他指标文件保持原样。运行范围和质量问题数量在控制台摘要中显示。

## 统计口径

- 按比赛 ID 合并双方副本，不重复累计。副本身份或统计冲突时不擅自选值，该场不进入汇总。
- 球队按 techStats.kind 读取，球员使用明确字段与事件映射；两黄变红和直接红牌分开统计。
- 球队与球员合计不一致时各自保留原值，不强行修正。
- 计数按实际值累计，单项同值并列；缺失不补零，表格提供有效场次、缺失场次。
- 球员仅表示实际观察到的记录，缺少名单时不把未知球员当作 0 表现。跨队球员按 ID 汇总并列出球队 ID。
- 转化率目前仅支持球队射门转化率、射正转化率；不做其他效率、每90分钟、评分/成功率汇总、潜力评分或个人 xG 推算。
- 球队 `goalsMinusXg` 指标为「实际进球 − xG」，按差值降序排列；差值前列出实际进球、预期进球 xG，三列使用相同的有效场次。仅累计有 xG 的场次，支持负数，缺失 xG 不补零。

## 共享资源与人工修正

ECharts 及相关许可证统一位于 workspace 根目录 shared-assets/echarts，由根 package.json 固定版本。可在根目录运行 node scripts/syncSharedAssets.js 同步，当前表格页不加载 ECharts。

表格使用 shared-assets/vue、shared-assets/element-plus 及 shared-assets/ranking-table。第三方资源由 node scripts/syncTableAssets.js 从官方 npm 包下载指定文件，固定版本并校验完整性，不执行 npm/pnpm install。HTML 仅通过本地相对路径加载，不依赖 CDN、后台服务或在线 JSON 请求；离线分享时需保留 workspace 相对目录结构并携带 shared-assets。

人工修正见 [repairs/README.md](repairs/README.md)。只按用户资料制作补丁，preview 显示差异，apply 才会修改双方原文件并备份。分析命令不会自动修正数据。


## 新增球队指标与全量生成

```bash
# 按各联赛本地赛程的实际赛季，生成下面指标
node bin/buildAll.js

# 单联赛同样支持 catalog、默认 build 和 --metrics
node bin/cli.js build --league laLiga --season 2026-2027 --metrics standings,homeStandings,awayStandings,averageAge,averageHeight,totalMarketValue,averagePossession,averageXg
```

- `standings`、`homeStandings`、`awayStandings`：直接读取已完赛比分，胜3分、平1分、负0分；依次按积分、净胜球、进球降序，再按球队ID稳定排序，不含纪律扣分。表头为名次、球队、赛、胜、平、负、进、失、净、积分。
- `averagePossession`：读取 techStats.json 的 fullMatch/CONTROL_PERCENT，取本队主客数值，总和除以有效场次。缺失、无效或副本冲突不补0，列出有效及缺失场次；独立于其他比赛文件完整性。
- `averageAge`、`averageHeight`、`totalMarketValue`：读取同赛季 teamProfile/{英文目录}/{英文目录}.json。筛选出场>0，按出场、首发降序及球衣号升序取最多25人，共用同一批样本。缺出场统计不能推定为0。
- 年龄、身高分别按有效人数平均，身价累加已知值（万），部分资料缺失仅在 MD 末尾说明，不添加数据状态列；数值缺失排在榜尾。按未舍入值排名，展示两位小数。阵容指标为赛季快照，不随轮次、日期或近N场重算历史阵容。
- 待补数据只写在各指标 MD 和 teams/README.md 末尾，列明球员或比赛与源文件路径。HTML、JSON 不附加待补清单，不生成 missingData.json；JSON 仍为表格行数组。
- 全量执行结果及不能生成的联赛见 [output/README.md](output/README.md)。补齐源名单或统计后先重新生成画像，再运行榜单命令。

- `averageXg`（场均 xG）：所选比赛的全场 xG 总和 ÷ xG 有效场次，按未舍入值降序排名，展示两位小数。支持轮次、日期、近 N 场和球队筛选；真实 0 纳入统计，缺失不补零，有效及缺失场次保留，具体待补数据仅写在 MD 末尾。

## 球队射门指标

- `shotConversionRate`（射门转化率）：同一批有效比赛的总进球 ÷ 总射门 × 100%。
- `shotOnTargetConversionRate`（射正转化率）：同一批有效比赛的总进球 ÷ 总射正 × 100%。

两项仅用于 teams，进球取已校验全场比分（包含对方乌龙送分），射门/射正取全场技术统计 SHOOT/TARGET。各自只使用进球与分母都有数据的同场样本，不平均逐场比率，不把缺失分母对应的进球计入分子。真实零射门/射正场次计入有效场次；累计分母为0或无有效样本时，转化率保持缺失、不排名、不补0。按未舍入百分比降序，同值并列，展示两位小数；表格同时列出同样本的进球、射门或射正及有效/缺失场次。支持轮次、日期、近N场、单队筛选，缺项汇入指标MD和teams/README.md。默认build和全量生成包含这两项，输出各自目录下同名MD、HTML、JSON，不生成players指标。

```bash
node bin/cli.js build --league laLiga --season 2026-2027 --metrics shotConversionRate,shotOnTargetConversionRate
```

- `averageShots`：场均射门，本队全场 SHOOT 总和除以有效场次，降序。
- `shotsAgainst`：被对手射门，按主客身份取同场对手全场 SHOOT 并累计，升序。
- `averageShotsAgainst`：场均被对手射门，对手射门总和除以对应有效场次，升序。
- 三项支持球队、轮次、日期及近 N 场筛选。真实 0 参与统计，缺失不补零，无数据排在榜尾且不排名；两项平均值按未舍入值排名，展示两位小数。待补说明只写 MD 末尾。

```bash
# 本次仅生成西甲三个新增指标
node bin/cli.js build --league laLiga --season 2026-2027 --metrics averageShots,shotsAgainst,averageShotsAgainst
```

- `zeroShotsOnTarget`（0射正）：统计本队全场 `TARGET` 明确为 0 的比赛场次，场次越少排名越前，同值并列。缺失、无效或副本冲突不算 0；展示有效及缺失场次，待补清单写入 MD。支持轮次、日期、近 N 场及单队筛选。

## 落后追回分数

`comebackPoints`（仅 teams）：曾落后且最终平局 +1 分，曾落后且最终获胜 +3 分；每队每场最多计一次，中途追平后最终输球计 0 分。按追回分数降序，同分并列，球队 ID 稳定排序。

```bash
node bin/cli.js build --league laLiga --season 2026-2027 --metrics comebackPoints
```

独立读取所选比赛双方 `teamAgent/{球队}/basicData/{短赛季}/{比赛ID}/matchEvents.json`，不要求技术统计、阵容或球员文件齐全。双方副本只计一场，一方缺失可使用另一有效副本；存在副本损坏、身份错误或事件冲突时排除。按文件顺序从 0–0 核对每条 `type === 'goal'` 的比分，每次只允许一方加 1；半场比分如有须与过程一致，终场比分须与过程及赛程一致。不完整、跳变或缺终场的比赛列入待补清单，不补零；完整 0–0 比赛计入有效场次。

输出 `teams/comebackPoints/comebackPoints.md`、`.html`、`.json`。三者汇总表一致，列出追回分数、落后场次、追平场次、逆转场次、未抢回场次及有效/缺失场次；未抢回指曾落后且最终输球，无有效样本时统计值保持缺失、不排名。MD 额外列出获得 +1、+3 分的逐场明细，随后附待补清单；待补项同时汇入 teams/README.md。HTML、JSON 仅保留汇总表。

支持现有轮次、日期、近 N 场及单队筛选。默认 build 和全联赛生成命令均包含此指标；只重建本指标时使用 `--metrics comebackPoints`，不会重建其他指标。

## 领先丢掉分数

`pointsDropped`（仅 teams）：球队曾领先但最终平局，按原本可得 3 分减去实际 1 分，计丢 2 分；曾领先但最终输球计丢 3 分。曾领先且最终获胜、从未领先均计 0 分，每队每场最多计一次。按丢分从少到多排列，同值并列；有完整有效样本但从未领先的球队为 0 分。

```bash
node bin/cli.js build --league laLiga --season 2026-2027 --metrics pointsDropped
```

复用 `comebackPoints` 的独立事件读取、进球过程和终场校验规则，支持轮次、日期、近 N 场及单队筛选；缺失不补零，无有效样本不排名。输出 `teams/pointsDropped/pointsDropped.md`、`.html`、`.json`，汇总包含领先丢掉分数、领先场次、被追平场次、被逆转场次、最终获胜场次、有效场次、缺失场次。“被追平”和“被逆转”按最终结果分类，“最终获胜”指曾领先且最终获胜。MD 额外列出丢 2 分或 3 分的比赛明细及待补清单；HTML、JSON 仅保留同一份汇总表。默认 build 与全联赛生成命令已包含本指标。

## 上、下半场积分榜

`firstHalfStandings`（上半场积分榜）按本地赛程的半场比分计算；`secondHalfStandings`（下半场积分榜）按全场比分减半场比分计算。例如全场 2–1、半场 2–0，下半场比分为 0–1，客队获得下半场 3 分。

```bash
node bin/cli.js build --league laLiga --season 2026-2027 --metrics firstHalfStandings,secondHalfStandings
```

两项仅供 teams 使用，各自按胜 3、平 1、负 0 计算积分，沿用现有积分榜表头及排序：有效完整球队优先，再按积分、净胜球、进球降序，球队 ID 稳定排序。只读取已完赛赛程，不依赖比赛技术统计、事件或阵容文件；支持轮次、日期、近 N 场及单队筛选。不计纪律扣分。

半场比分缺失、格式无效或任何一方半场进球大于全场进球时，该场不进入半场榜；比分缺失不补零，待补项写入指标 MD 及 teams/README.md，无有效场次的球队积分保持缺失、不排名。输出 `teams/firstHalfStandings/` 与 `teams/secondHalfStandings/`，每项包含同名 MD、HTML、JSON；默认 build 与全联赛生成命令已包含这两项。
