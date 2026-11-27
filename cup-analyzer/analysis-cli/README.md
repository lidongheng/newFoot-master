# 足球数据分析 CLI

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

- MD：只有该指标的排行榜表格，不混入其他指标或逐场明细。
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
- 不做效率、每90分钟、评分/成功率汇总、潜力评分或个人 xG 推算。
- 球队 `goalsMinusXg` 指标为「实际进球 − xG」，按差值降序排列；差值前列出实际进球、预期进球 xG，三列使用相同的有效场次。仅累计有 xG 的场次，支持负数，缺失 xG 不补零。

## 共享资源与人工修正

ECharts 及相关许可证统一位于 workspace 根目录 shared-assets/echarts，由根 package.json 固定版本。可在根目录运行 node scripts/syncSharedAssets.js 同步，当前表格页不加载 ECharts。

表格使用 shared-assets/vue、shared-assets/element-plus 及 shared-assets/ranking-table。第三方资源由 node scripts/syncTableAssets.js 从官方 npm 包下载指定文件，固定版本并校验完整性，不执行 npm/pnpm install。HTML 仅通过本地相对路径加载，不依赖 CDN、后台服务或在线 JSON 请求；离线分享时需保留 workspace 相对目录结构并携带 shared-assets。

人工修正见 [repairs/README.md](repairs/README.md)。只按用户资料制作补丁，preview 显示差异，apply 才会修改双方原文件并备份。分析命令不会自动修正数据。
