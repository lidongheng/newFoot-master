# 墨西联 teamAgent 数据分析工作流

本文件用于操作 `cup-analyzer/analysis-cli`：将本联赛 `teamAgent/{球队}/basicData` 中的本地比赛数据加工成球队榜、球员榜。

## 一、数据准备与工作目录

本地赛程赛季为 **2025-2026**，结果目录短名为 **25-26**。分析前确认球队的 config.js 与赛程一致，并已采集所选比赛的数据。

原始比赛数据的采集命令见各球队目录的 workflow.md；赛程与采集器操作见 [本联赛工作流](../workflow.md)。分析命令不联网、不自动补采，不改原始 basicData。

从仓库根目录进入分析 CLI：

```bash
cd cup-analyzer/analysis-cli
```

如果终端当前就在本文件所在的 `teamAgent` 目录，则执行 `cd ../../analysis-cli`。**下面所有 node bin/cli.js 命令都在 analysis-cli 目录执行**，不在 crawler-server 或球队目录执行。

### 第五步：生成“本赛季同档次对手较量”

在 `analysis-cli` 目录执行：

```bash
node bin/sameOpeningHandicap.js --league ligaMx --season 2025-2026
# 可选：仅统计指定轮次，或改用 --from / --to 指定北京时间日期范围
node bin/sameOpeningHandicap.js --league ligaMx --season 2025-2026 --round 1-6
```

只分析全场亚盘。读取本联赛配置指向的 `data/s*.js`，使用 `jh["R_N"]` 比赛数组下标 10 的全场初赔及下标 6 的全场比分，仅统计状态下标 2 严格等于 -1 的已完赛比赛，不依赖 basicData 或榜单 JSON。

每队按“相同主客＋相同初赔”分组；同档次在此指同初赔，不另套球队实力分档。初赔保留源文件的主队让球视角，同时展示本队让球：正数让球、负数受让、0 平手。主场与客场分开统计，不合并让球与受让。列出场次、赢盘、赢半、走盘、输半、输盘、赢盘率（含赢半）、净赢盘及逐场对手、时间、轮次、比分、结算和比赛 ID。四分之一盘口拆为两个相邻半球盘结算；赢盘率＝（赢盘＋赢半）÷有效场次，净赢盘＝赢盘＋赢半×0.5－输半×0.5－输盘，不代表实际投注盈利。

初赔或全场比分缺失、无效时明确列出数据缺口，不填兜底值，也不纳入有效场次；真实 0 初赔照常统计，没有样本的组合不生成行。相同比赛 ID 只计一次，重复数据冲突时报错。

各球队目录分别生成并覆盖以下两个文件，不改原始数据；不传范围即使用本赛季本地全部已完赛比赛：

```text
ligaMx/teamAgent/{球队目录}/本赛季同档次对手较量.md
ligaMx/teamAgent/{球队目录}/本赛季同档次对手较量.html
```

全部已登记联赛按各自本地赛程赛季生成：`node bin/buildAllSameOpeningHandicap.js`。单联赛失败后继续处理其他联赛，结果及原因写入 `analysis-cli/output/same-opening-handicap-summary.json`。

### 第六步：生成“球队未来一个月赛程”

在 `analysis-cli` 目录执行：

```bash
node bin/monthlySchedule.js --league ligaMx --season 2025-2026
# 按各联赛本地赛程赛季批量处理
node bin/buildAllMonthlySchedule.js
```

直接读取各球队 `teamProfile/{球队目录}/{球队目录}.json` 的 `futureSchedule`，以生成画像时的 `matchTime` 为开始时间（JSON内部保存为 `futureSchedule.anchorTime`），不使用当前时间或当前全局配置替代。展示其后30天内、包含截止时刻的所有赛事，按北京时间开球时间升序，包含联赛、欧战及杯赛。

每场一行，依次为日期时间、赛事、轮次或阶段、主队vs客队、间隔、等级、备注。例如：`12月3日 04:30 西甲 第23轮 巴塞罗那vs马德里竞技 77小时 警告`。首场与 `matchTime` 计算间隔，后续与上一场开球时间计算间隔；不是与上场终场时间比较。

| 等级 | 实际开球间隔 |
| --- | --- |
| 危险 | ≤66小时 |
| 警告 | >66且≤92小时 |
| 良好 | >92且≤120小时 |
| 一周一赛 | >120小时 |

间隔最多显示两位小数，判级使用实际值。以连续三场滑动检查密集赛程，基准比赛也参与首个窗口：首尾≤144小时标“6天3场”，>144且≤168小时标“7天3场”；同一窗口只标更紧密的一档，在第三场备注中列出日期范围，重叠窗口分别保留。

输出并覆盖各球队目录的两个文件：

```text
ligaMx/teamAgent/{球队目录}/球队未来一个月赛程.md
ligaMx/teamAgent/{球队目录}/球队未来一个月赛程.html
```

不接受轮次或日期筛选，不修改画像及原始赛程，不联网补采。缺少画像JSON、futureSchedule、基准时间或关键比赛字段时记录原因并跳过该队，继续其他球队，失败球队的旧报告不覆盖。有效的空比赛数组会明确说明窗口内无比赛，不能把缺失数据当作空赛程。批量结果及逐队缺项写入 `analysis-cli/output/monthly-schedule-summary.json`，有失败时返回非零退出码。

## 二、查看指标及生成榜单

```bash
# 查看球队、球员支持的指标 ID、中文名和数据来源
node bin/cli.js catalog --league ligaMx --season 2025-2026

# 处理本地该赛季全部已完赛数据，生成所有支持的单项榜
node bin/cli.js build --league ligaMx --season 2025-2026

# 可选：只生成射门、射正、球队 xG，以及实际进球减 xG 榜
node bin/cli.js build --league ligaMx --season 2025-2026 --metrics shots,shotsOnTarget,xg,goalsMinusXg
```

## 三、指定统计范围

以下是互相独立的示例，选择所需的一条运行，参数由你自行调整。

```bash
# 按轮次区间；示例为第 1–13 轮，单轮可写 --rounds 13
node bin/cli.js build --league ligaMx --season 2025-2026 --rounds 1-13

# 每队最近 N 场；示例为 6 场，不足时按实际样本统计
node bin/cli.js build --league ligaMx --season 2025-2026 --last 6

# 按北京时间日期区间；起止日期均包含，请替换成目标范围
node bin/cli.js build --league ligaMx --season 2025-2026 --from 2026-09-01 --to 2026-11-27
```

`--rounds`、`--last`、`--from/--to` 三种范围互斥；不传范围即处理本地全部已完赛数据。日期必须同时提供 from/to。可以配合 --metrics 指定指标。

球员使用其球队选中的比赛范围，不另外取“球员最近 N 次出场”；未采集或没有提供的数据不能按 0 处理。

## 四、只分析一支球队

以下以本地赛程的 **托卢卡（球探 ID 1263）** 为例，可替换 --team 后的 ID：

```bash
node bin/cli.js build --league ligaMx --season 2025-2026 --team 1263 --rounds 1-13

node bin/cli.js build --league ligaMx --season 2025-2026 --team 1263 --last 6 --metrics shots,shotsOnTarget,xg,goalsMinusXg
```

**输出覆盖规则：所有范围都写入同一套指标路径。** 单队命令也会覆盖所选指标的全联赛结果，不另建单队或范围目录。要恢复全联赛榜，重新运行第二节的全联赛 build 命令。只指定部分 --metrics 时，仅更新这些指标，其他指标保持原样。

## 五、在哪里查看结果

```text
ligaMx/leagueRanking/25-26/
├── teams/
│   ├── README.md
│   ├── shots/shots.md、shots.html、shots.json
│   ├── xG/xG.md、xG.html、xG.json
│   └── goalsMinusXg/goalsMinusXg.md、goalsMinusXg.html、goalsMinusXg.json
└── players/
    ├── README.md
    └── shots/shots.md、shots.html、shots.json
```

- [球队射门榜](../leagueRanking/25-26/teams/shots/shots.md)：Markdown 表格。
- [球队射门 HTML](../leagueRanking/25-26/teams/shots/shots.html)：本地 Element Plus 表格，可搜索、排序。
- [球队 xG 榜](../leagueRanking/25-26/teams/xG/xG.md)。
- [实际进球减 xG 榜](../leagueRanking/25-26/teams/goalsMinusXg/goalsMinusXg.md)：依次列出实际进球、预期进球 xG、差值，按差值降序。
- [球员射门榜](../leagueRanking/25-26/players/shots/shots.md)。

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
node bin/cli.js repair preview --patch "repairs/patches/ligaMx/25-26/{比赛ID}-lineup.json"

# 核对用户提供的数据后应用：同步双方目录并保存备份和历史
node bin/cli.js repair apply --patch "repairs/patches/ligaMx/25-26/{比赛ID}-lineup.json"

# 修正完成后，使用原统计范围重新生成榜单
node bin/cli.js build --league ligaMx --season 2025-2026 --rounds 1-13
```

补丁的 league、season、matchId 必须对应本联赛、本赛季的已完赛比赛。preview 不写文件，只有 apply 修改原始阵容；当前只支持 lineup.json 的阵型、首发和替补字段。

详细格式与旧值冲突、部分补充、备份恢复规则见 [人工修正说明](../../analysis-cli/repairs/README.md)。更多参数与统计口径见 [analysis-cli 使用说明](../../analysis-cli/README.md)。

## 球队射门转化率与射正转化率

在 `analysis-cli` 目录执行：

```bash
node bin/cli.js build --league ligaMx --season 2025-2026 --metrics shotConversionRate,shotOnTargetConversionRate
```

`shotConversionRate`＝同一批有效比赛总进球÷总射门×100%；`shotOnTargetConversionRate`＝同一批有效比赛总进球÷总射正×100%。仅teams支持，进球取已校验全场比分（含对方乌龙送分），分母分别取全场SHOOT/TARGET，不平均逐场比率。按未舍入转化率降序，同值并列、显示两位小数，同时列出同样本进球及分母。零分母或无有效样本时保持缺失、不排名、不补0；缺失数据另列有效/缺失场次及待补清单。

支持原有 `--rounds`、`--last`、`--from/--to` 和 `--team` 参数。默认build包含两项；上述命令只重建这两项的MD、HTML、JSON和球队目录索引。输出路径：`leagueRanking/{短赛季}/teams/shotConversionRate/`、`teams/shotOnTargetConversionRate/`。
