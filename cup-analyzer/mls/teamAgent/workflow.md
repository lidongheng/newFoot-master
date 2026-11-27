# 美职联 teamAgent 数据分析工作流

本文件用于操作 `cup-analyzer/analysis-cli`：将本联赛 `teamAgent/{球队}/basicData` 中的本地比赛数据加工成球队榜、球员榜。

## 一、数据准备与工作目录

本地赛程赛季为 **2026**，结果目录短名为 **2026**。分析前确认球队的 config.js 与赛程一致，并已采集所选比赛的数据。

原始比赛数据的采集命令见各球队目录的 workflow.md；赛程与采集器操作见 [本联赛工作流](../workflow.md)。分析命令不联网、不自动补采，不改原始 basicData。

从仓库根目录进入分析 CLI：

```bash
cd cup-analyzer/analysis-cli
```

如果终端当前就在本文件所在的 `teamAgent` 目录，则执行 `cd ../../analysis-cli`。**下面所有 node bin/cli.js 命令都在 analysis-cli 目录执行**，不在 crawler-server 或球队目录执行。

## 二、查看指标及生成榜单

```bash
# 查看球队、球员支持的指标 ID、中文名和数据来源
node bin/cli.js catalog --league mls --season 2026

# 处理本地该赛季全部已完赛数据，生成所有支持的单项榜
node bin/cli.js build --league mls --season 2026

# 可选：只生成射门、射正、球队 xG，以及实际进球减 xG 榜
node bin/cli.js build --league mls --season 2026 --metrics shots,shotsOnTarget,xg,goalsMinusXg
```

## 三、指定统计范围

以下是互相独立的示例，选择所需的一条运行，参数由你自行调整。

```bash
# 按轮次区间；示例为第 1–13 轮，单轮可写 --rounds 13
node bin/cli.js build --league mls --season 2026 --rounds 1-13

# 每队最近 N 场；示例为 6 场，不足时按实际样本统计
node bin/cli.js build --league mls --season 2026 --last 6

# 按北京时间日期区间；起止日期均包含，请替换成目标范围
node bin/cli.js build --league mls --season 2026 --from 2026-09-01 --to 2026-11-27
```

`--rounds`、`--last`、`--from/--to` 三种范围互斥；不传范围即处理本地全部已完赛数据。日期必须同时提供 from/to。可以配合 --metrics 指定指标。

球员使用其球队选中的比赛范围，不另外取“球员最近 N 次出场”；未采集或没有提供的数据不能按 0 处理。

## 四、只分析一支球队

以下以本地赛程的 **纽约红牛（球探 ID 310）** 为例，可替换 --team 后的 ID：

```bash
node bin/cli.js build --league mls --season 2026 --team 310 --rounds 1-13

node bin/cli.js build --league mls --season 2026 --team 310 --last 6 --metrics shots,shotsOnTarget,xg,goalsMinusXg
```

**输出覆盖规则：所有范围都写入同一套指标路径。** 单队命令也会覆盖所选指标的全联赛结果，不另建单队或范围目录。要恢复全联赛榜，重新运行第二节的全联赛 build 命令。只指定部分 --metrics 时，仅更新这些指标，其他指标保持原样。

## 五、在哪里查看结果

```text
mls/leagueRanking/2026/
├── teams/
│   ├── README.md
│   ├── shots/shots.md、shots.html、shots.json
│   ├── xG/xG.md、xG.html、xG.json
│   └── goalsMinusXg/goalsMinusXg.md、goalsMinusXg.html、goalsMinusXg.json
└── players/
    ├── README.md
    └── shots/shots.md、shots.html、shots.json
```

- [球队射门榜](../leagueRanking/2026/teams/shots/shots.md)：Markdown 表格。
- [球队射门 HTML](../leagueRanking/2026/teams/shots/shots.html)：本地 Element Plus 表格，可搜索、排序。
- [球队 xG 榜](../leagueRanking/2026/teams/xG/xG.md)。
- [实际进球减 xG 榜](../leagueRanking/2026/teams/goalsMinusXg/goalsMinusXg.md)：依次列出实际进球、预期进球 xG、差值，按差值降序。
- [球员射门榜](../leagueRanking/2026/players/shots/shots.md)。

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
node bin/cli.js repair preview --patch "repairs/patches/mls/2026/{比赛ID}-lineup.json"

# 核对用户提供的数据后应用：同步双方目录并保存备份和历史
node bin/cli.js repair apply --patch "repairs/patches/mls/2026/{比赛ID}-lineup.json"

# 修正完成后，使用原统计范围重新生成榜单
node bin/cli.js build --league mls --season 2026 --rounds 1-13
```

补丁的 league、season、matchId 必须对应本联赛、本赛季的已完赛比赛。preview 不写文件，只有 apply 修改原始阵容；当前只支持 lineup.json 的阵型、首发和替补字段。

详细格式与旧值冲突、部分补充、备份恢复规则见 [人工修正说明](../../analysis-cli/repairs/README.md)。更多参数与统计口径见 [analysis-cli 使用说明](../../analysis-cli/README.md)。
