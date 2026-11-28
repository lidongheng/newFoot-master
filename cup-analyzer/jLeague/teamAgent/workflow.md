# 日职联 teamAgent 数据分析工作流

本文件用于操作 `cup-analyzer/analysis-cli`：将本联赛 `teamAgent/{球队}/basicData` 中的本地比赛数据加工成球队榜、球员榜。

## 一、数据准备与工作目录

本地赛程赛季为 **2026-2027**，结果目录短名为 **26-27**。分析前确认球队的 config.js 与赛程一致，并已采集所选比赛的数据。

原始比赛数据的采集命令见各球队目录的 workflow.md；赛程与采集器操作见 [本联赛工作流](../workflow.md)。分析命令不联网、不自动补采，不改原始 basicData。

从仓库根目录进入分析 CLI：

```bash
cd cup-analyzer/analysis-cli
```

如果终端当前就在本文件所在的 `teamAgent` 目录，则执行 `cd ../../analysis-cli`。**下面所有分析命令都在 analysis-cli 目录执行**，不在 crawler-server 或球队目录执行。

<!-- 熟悉联赛 -->

### 第一步：生成“xG告诉我们的故事”

不传范围时，先确认 `jLeague/leagueRanking/26-27/teams` 下已有 `standings`、`averageXg`、`averageShots`、`goalsMinusXg` 各自目录中的同名 JSON；尚未生成时，先执行下方第二节的全联赛 build 命令。传入轮次或日期范围时，命令会先调用现有 build 更新所需榜单 JSON，再读取 JSON 生成报告。

在 `analysis-cli` 目录执行：

```bash
node bin/xgStory.js --league jLeague --season 2026-2027
```

直接引用上述 JSON，以总积分榜名次排序，生成八列：名次、球队、场均xG排名、场均射门排名、实际进球-xG排名、场均xG、场均射门、实际进球-xG。三个指标排名直接引用各自 JSON 的“排名”字段，不重新计算排名或指标，统计范围及有效场次沿用源榜单；源值为 null 显示“缺失”，不补零。文件、必要字段缺失或球队无法完整关联时，在写入前报错。

结果与本 workflow 同级，重复执行覆盖这两个文件：

- [xG告诉我们的故事.md](xG告诉我们的故事.md)
- [xG告诉我们的故事.html](xG告诉我们的故事.html)：可直接打开、搜索和排序，初始顺序为总积分榜顺序。

### 第二步：生成“球队战力”

```bash
node bin/teamStrength.js --league jLeague --season 2026-2027
```

读取 `standings/standings.json`、`homeStandings/homeStandings.json`，按总积分榜名次排列，在一张表中列出：球队、积分排名、胜场排名、主场胜场排名、积分、胜场、主场胜场。积分排名直接沿用总积分榜；胜场数据直接引用各自 JSON 的“胜”字段，按数量降序生成胜场排名，同值并列（如 1、1、3），不把主场积分名次当作主场胜场排名。不传范围时须先准备这两项 JSON；传入范围时自动调用现有 build 更新这两项 JSON。

结果同样与本 workflow 同级：

- [球队战力.md](球队战力.md)
- [球队战力.html](球队战力.html)

### 第三步：生成“关键球员不首发时球队的表现”

```bash
node bin/keyPlayerStarts.js --league jLeague --season 2026-2027
```

每次先复用现有 build 流程更新同范围的 `players` 榜 JSON，再选出各队进球（`goals`，Goal＋Penalty、不含乌龙）、助攻（`assists`）、抢断（`tackles`）、解围（`clearances`）、传球成功次数（`successfulPasses`）、争顶成功次数（`headersWon`）、拦截（`interceptions`）、封堵（`shotsBlocked`）最高的球员。并列球员全取，同一球员合并关键指标；跨队球员使用现有聚合器按本队期间拆分，不能把跨队合计值作为本队数据。现有争顶榜统计成功次数，不是全部争顶尝试次数。

球队比分读取本地赛程；首发状态按球员ID核对该队 `lineup.json` 的完整11人首发名单，双方比赛副本只计一场。每名关键球员分“首发”“不首发”两行，依次列出球衣号、球员、球员ID、关键指标、首发情况、场次、胜、平、负、进、失、净、积分。球衣号按球队及球员ID读取本赛季逐场统计、首发及替补名单中的号码，缺失或号码冲突时显示 `-`。不首发包含替补及未出场；首发名单缺失、不完整或副本冲突的比赛不归入任何一组，在报告中列明缺口。场次为0表示该组无可统计比赛，缺失的球员指标不补零。

文件写入各自球队目录，重复运行覆盖同名文件：

```text
jLeague/teamAgent/{球队目录}/关键球员不首发时球队的表现.md
jLeague/teamAgent/{球队目录}/关键球员不首发时球队的表现.html
```

例如名古屋鲸八：[MD](Nagoya_Grampus/关键球员不首发时球队的表现.md)、[HTML](Nagoya_Grampus/关键球员不首发时球队的表现.html)。HTML沿用本地共享资源，可直接打开、搜索和排序。

### 第四步：生成“赛程难度排行榜”

```bash
# 默认未来最近5场
node bin/scheduleDifficulty.js --league jLeague --season 2026-2027

# 自定义未来场数，例如最近8场
node bin/scheduleDifficulty.js --league jLeague --season 2026-2027 --next 8
```

读取本联赛配置指向的 `data/s25.js`（其他联赛使用各自配置的 s 开头赛程文件），仅取内数组下标2严格等于0、且开赛时间晚于运行时刻的比赛，按北京时间开赛时间升序选择各队未来最近N场。这里按实际比赛数取样，不按轮次编号取样，`--next` 默认5，必须为正整数。

对手排名直接读取 `leagueRanking/26-27/teams/standings/standings.json`，运行前应确保它是全赛季总积分榜，若此前按范围生成过积分榜，先运行第二节全联赛 build 恢复。本命令不重算或覆盖积分榜，不修改原始赛程。

难度值＝未来所选对手总积分榜名次之和÷实际比赛数。值越低越凶险，排行榜越靠前；同值并列（如1、1、3）。不足N场时按实际场数计算，零场时难度及排名显示“缺失”、置于末尾，不补零。表格列出排名、球队、比赛数、对手平均排名及按时间排列的未来对手、对手名次、开赛时间与主客场；平均排名显示两位小数，排序使用未舍入值。

与本 workflow 同级生成并覆盖：

- [赛程难度排行榜.md](赛程难度排行榜.md)
- [赛程难度排行榜.html](赛程难度排行榜.html)

### 第五步：生成“本赛季同档次对手较量”

在 `analysis-cli` 目录执行：

```bash
node bin/sameOpeningHandicap.js --league jLeague --season 2026-2027
# 可选：仅统计指定轮次，或改用 --from / --to 指定北京时间日期范围
node bin/sameOpeningHandicap.js --league jLeague --season 2026-2027 --round 1-6
```

只分析全场亚盘。读取本联赛配置指向的 `data/s*.js`，使用 `jh["R_N"]` 比赛数组下标 10 的全场初赔及下标 6 的全场比分，仅统计状态下标 2 严格等于 -1 的已完赛比赛，不依赖 basicData 或榜单 JSON。

每队按“相同主客＋相同初赔”分组；同档次在此指同初赔，不另套球队实力分档。初赔保留源文件的主队让球视角，同时展示本队让球：正数让球、负数受让、0 平手。主场与客场分开统计，不合并让球与受让。列出场次、赢盘、赢半、走盘、输半、输盘、赢盘率（含赢半）、净赢盘及逐场对手、时间、轮次、比分、结算和比赛 ID。四分之一盘口拆为两个相邻半球盘结算；赢盘率＝（赢盘＋赢半）÷有效场次，净赢盘＝赢盘＋赢半×0.5－输半×0.5－输盘，不代表实际投注盈利。

初赔或全场比分缺失、无效时明确列出数据缺口，不填兜底值，也不纳入有效场次；真实 0 初赔照常统计，没有样本的组合不生成行。相同比赛 ID 只计一次，重复数据冲突时报错。

各球队目录分别生成并覆盖以下两个文件，不改原始数据；不传范围即使用本赛季本地全部已完赛比赛：

```text
jLeague/teamAgent/{球队目录}/本赛季同档次对手较量.md
jLeague/teamAgent/{球队目录}/本赛季同档次对手较量.html
```

全部已登记联赛按各自本地赛程赛季生成：`node bin/buildAllSameOpeningHandicap.js`。单联赛失败后继续处理其他联赛，结果及原因写入 `analysis-cli/output/same-opening-handicap-summary.json`。

### 第六步：生成“球队未来一个月赛程”

在 `analysis-cli` 目录执行：

```bash
node bin/monthlySchedule.js --league jLeague --season 2026-2027
# 按各联赛本地赛程赛季批量处理
node bin/buildAllMonthlySchedule.js
```

直接读取各球队 `teamProfile/{球队目录}/{球队目录}.json` 的 `futureSchedule`，以生成画像时的 `matchTime` 为开始时间（JSON内部保存为 `futureSchedule.anchorTime`），不使用当前时间或当前全局配置替代。展示其后30天内、包含截止时刻的所有赛事，按北京时间开球时间升序，包含联赛、欧战及杯赛。

每场一行，依次为日期时间、赛事、轮次或阶段、主队vs客队、间隔、等级、备注。例如：`12月3日 04:30 日职联 第23轮 名古屋鲸八vs浦和红钻 77小时 警告`。首场与 `matchTime` 计算间隔，后续与上一场开球时间计算间隔；不是与上场终场时间比较。

| 等级 | 实际开球间隔 |
| --- | --- |
| 危险 | ≤66小时 |
| 警告 | >66且≤92小时 |
| 良好 | >92且≤120小时 |
| 一周一赛 | >120小时 |

间隔最多显示两位小数，判级使用实际值。以连续三场滑动检查密集赛程，基准比赛也参与首个窗口：首尾≤144小时标“6天3场”，>144且≤168小时标“7天3场”；同一窗口只标更紧密的一档，在第三场备注中列出日期范围，重叠窗口分别保留。

输出并覆盖各球队目录的两个文件：

```text
jLeague/teamAgent/{球队目录}/球队未来一个月赛程.md
jLeague/teamAgent/{球队目录}/球队未来一个月赛程.html
```

不接受轮次或日期筛选，不修改画像及原始赛程，不联网补采。缺少画像JSON、futureSchedule、基准时间或关键比赛字段时记录原因并跳过该队，继续其他球队，失败球队的旧报告不覆盖。有效的空比赛数组会明确说明窗口内无比赛，不能把缺失数据当作空赛程。批量结果及逐队缺项写入 `analysis-cli/output/monthly-schedule-summary.json`，有失败时返回非零退出码。

### 第一步至第三步的公共参数

三条命令均支持 `--league`、`--season`、`--round`、`--from`、`--to`。联赛和完整赛季必填；`--round 1-13` 表示第 1–13 轮，`--round 13` 仅表示第 13 轮，不表示最近 13 场。`--from/--to` 须同时提供，按北京时间日期筛选且包含起止日；轮次与日期范围互斥。

以下命令互相独立，选择所需范围执行；三个步骤需比较相同范围时，请传入相同参数：

```bash
# 第 1–13 轮；只看第 13 轮时改为 --round 13
node bin/xgStory.js --league jLeague --season 2026-2027 --round 1-13
node bin/teamStrength.js --league jLeague --season 2026-2027 --round 1-13
node bin/keyPlayerStarts.js --league jLeague --season 2026-2027 --round 1-13

# 北京时间日期区间，包含首尾两天
node bin/xgStory.js --league jLeague --season 2026-2027 --from 2026-09-01 --to 2026-11-27
node bin/teamStrength.js --league jLeague --season 2026-2027 --from 2026-09-01 --to 2026-11-27
node bin/keyPlayerStarts.js --league jLeague --season 2026-2027 --from 2026-09-01 --to 2026-11-27
```

传入范围会覆盖所需指标的现有榜单 MD、HTML、JSON，报告正文标明本次范围。第一步、第二步不传范围时仅读取当前 JSON，不自动恢复全赛季；第三步每次刷新其所需指标榜单，不传范围即使用本赛季全部已完赛比赛，保证关键球员选择与首发对比范围一致。三个步骤均覆盖各自同名报告，不另建范围目录，不改原始 basicData。原有 `bin/cli.js build` 仍使用 `--rounds` 参数。

## 二、查看指标及生成榜单

```bash
# 查看球队、球员支持的指标 ID、中文名和数据来源
node bin/cli.js catalog --league jLeague --season 2026-2027

# 处理本地该赛季全部已完赛数据，生成所有支持的单项榜
node bin/cli.js build --league jLeague --season 2026-2027

# 可选：只生成射门、射正、球队 xG，以及实际进球减 xG 榜
node bin/cli.js build --league jLeague --season 2026-2027 --metrics shots,shotsOnTarget,xg,goalsMinusXg
```

## 三、指定统计范围

以下是互相独立的示例，选择所需的一条运行，参数由你自行调整。

```bash
# 按轮次区间；示例为第 1–13 轮，单轮可写 --rounds 13
node bin/cli.js build --league jLeague --season 2026-2027 --rounds 1-13

# 每队最近 N 场；示例为 6 场，不足时按实际样本统计
node bin/cli.js build --league jLeague --season 2026-2027 --last 6

# 按北京时间日期区间；起止日期均包含，请替换成目标范围
node bin/cli.js build --league jLeague --season 2026-2027 --from 2026-09-01 --to 2026-11-27
```

`--rounds`、`--last`、`--from/--to` 三种范围互斥；不传范围即处理本地全部已完赛数据。日期必须同时提供 from/to。可以配合 --metrics 指定指标。

球员使用其球队选中的比赛范围，不另外取“球员最近 N 次出场”；未采集或没有提供的数据不能按 0 处理。

## 四、只分析一支球队

以下以本地赛程的 **名古屋鲸八（球探 ID 181）** 为例，可替换 --team 后的 ID：

```bash
node bin/cli.js build --league jLeague --season 2026-2027 --team 181 --rounds 1-13

node bin/cli.js build --league jLeague --season 2026-2027 --team 181 --last 6 --metrics shots,shotsOnTarget,xg,goalsMinusXg
```

**输出覆盖规则：所有范围都写入同一套指标路径。** 单队命令也会覆盖所选指标的全联赛结果，不另建单队或范围目录。要恢复全联赛榜，重新运行第二节的全联赛 build 命令。只指定部分 --metrics 时，仅更新这些指标，其他指标保持原样。

## 五、在哪里查看结果

```text
jLeague/leagueRanking/26-27/
├── teams/
│   ├── README.md
│   ├── shots/shots.md、shots.html、shots.json
│   ├── xG/xG.md、xG.html、xG.json
│   └── goalsMinusXg/goalsMinusXg.md、goalsMinusXg.html、goalsMinusXg.json
└── players/
    ├── README.md
    └── shots/shots.md、shots.html、shots.json
```

- [球队射门榜](../leagueRanking/26-27/teams/shots/shots.md)：Markdown 表格。
- [球队射门 HTML](../leagueRanking/26-27/teams/shots/shots.html)：本地 Element Plus 表格，可搜索、排序。
- [球队 xG 榜](../leagueRanking/26-27/teams/xG/xG.md)。
- [实际进球减 xG 榜](../leagueRanking/26-27/teams/goalsMinusXg/goalsMinusXg.md)：依次列出实际进球、预期进球 xG、差值，按差值降序。
- [球员射门榜](../leagueRanking/26-27/players/shots/shots.md)。

链接在首次成功生成后才有文件。每个指标目录只包含三个同名文件；JSON 是 MD 表格对应的行数组，不混入其他指标或元信息。球队 xG 命令行参数写 xg，目录名写 xG；个人 xG 没有来源，不生成球员 xG 榜。

控制台输出已取得/预期比赛数量、球队/球员记录数和质量提示数量；存在缺场、冲突时先核验，不因程序成功退出就认定赛季完整。当前 README 指标目录索引以已存在文件为准，build 不自动创建目录索引 README。

## 六、本地 HTML 的共享静态资源

HTML 可直接用浏览器打开，Vue、Element Plus、中文语言包及表格脚本都从 workspace 根目录 shared-assets 相对引用，不使用 CDN，不需要启动服务。

资源已存在时无须每次同步。缺少 Vue/Element Plus 静态文件时，在**仓库根目录**运行：

```bash
node scripts/syncTableAssets.js
```

该命令下载官方固定版本浏览器文件，不安装 npm 依赖。离线分享时保留 workspace 相对目录结构，并同时携带 shared-assets。

## 七、按用户资料修正阵容后重新分析

缺少或错误的阵型、首发、替补由你提供资料，再整理成补丁；不要编造球员 ID 或名单。以下是命令格式，补丁文件必须先存在，不要把示例路径直接当作已准备好的补丁。

```bash
# analysis-cli 目录：只预览差异，不改 basicData
node bin/cli.js repair preview --patch "repairs/patches/jLeague/26-27/{比赛ID}-lineup.json"

# 核对用户提供的数据后应用：同步双方目录并保存备份和历史
node bin/cli.js repair apply --patch "repairs/patches/jLeague/26-27/{比赛ID}-lineup.json"

# 修正完成后，使用原统计范围重新生成榜单
node bin/cli.js build --league jLeague --season 2026-2027 --rounds 1-13
```

补丁的 league、season、matchId 必须对应本联赛、本赛季的已完赛比赛。preview 不写文件，只有 apply 修改原始阵容；当前只支持 lineup.json 的阵型、首发和替补字段。

详细格式与旧值冲突、部分补充、备份恢复规则见 [人工修正说明](../../analysis-cli/repairs/README.md)。更多参数与统计口径见 [analysis-cli 使用说明](../../analysis-cli/README.md)。

## 球队射门转化率与射正转化率

在 `analysis-cli` 目录执行：

```bash
node bin/cli.js build --league jLeague --season 2026-2027 --metrics shotConversionRate,shotOnTargetConversionRate
```

`shotConversionRate`＝同一批有效比赛总进球÷总射门×100%；`shotOnTargetConversionRate`＝同一批有效比赛总进球÷总射正×100%。仅teams支持，进球取已校验全场比分（含对方乌龙送分），分母分别取全场SHOOT/TARGET，不平均逐场比率。按未舍入转化率降序，同值并列、显示两位小数，同时列出同样本进球及分母。零分母或无有效样本时保持缺失、不排名、不补0；缺失数据另列有效/缺失场次及待补清单。

支持原有 `--rounds`、`--last`、`--from/--to` 和 `--team` 参数。默认build包含两项；上述命令只重建这两项的MD、HTML、JSON和球队目录索引。输出路径：`leagueRanking/{短赛季}/teams/shotConversionRate/`、`teams/shotOnTargetConversionRate/`。
