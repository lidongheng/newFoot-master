# A-League（澳大利亚足球超级联赛 / 澳超）分析模块架构方案

> 最后更新: 2026-04-10

## 一、背景与定位

澳超是**国内联赛**（12 队、常规赛 **26 轮**，前六进入季后赛），与英超（20 队 38 轮）、欧冠（杯赛）和世界杯（国家队）赛制不同。`cup-analyzer` 中 `aLeague/` 与 `epl/`、`championsLeague/` 平行，作为统一分析模块。

球探体育联赛序号：**273**，常规联赛子联赛 ID **462** → 赛程数据文件 **`s273_462.js`**（与韩 K 联 `s15_313` 同属「联赛 + 子联赛」格式）。

## 二、目录结构（当前）

```
cup-analyzer/
├── aLeague/
│   ├── README.md                 # 本文件
│   ├── PLAN.md                   # 项目计划（持续迭代）
│   ├── workflow.md               # 工作流程说明
│   ├── prompts/
│   │   └── match_analysis_template.md   # 与 league-analyzer / 英超同源模板
│   ├── data/
│   │   ├── s273_462.js           # 赛程与积分榜（scheduleCrawler 写入）
│   │   ├── l273.js               # 亚盘盘路榜（自 league-analyzer）
│   │   ├── bs273.js              # 大小球盘路榜
│   │   └── td273.js              # 入球时间分布
│   ├── squad-final/              # 可选：最终名单草稿（与世界杯流程对齐时）
│   ├── teamProfile/              # 球队画像（自 league-analyzer teamInfo 迁移，英文 slug 文件名）
│   ├── report/
│   │   └── 25-26/                # 赛前分析报告（round-*）
│   ├── postMatchSummary/
│   │   └── 25-26/                # 赛后复盘
│   └── news/
│       └── 25-26/                # 大名单、统计信息等素材
```

可选后续扩展（对齐英超模块）：`rule/`、`strategy/`、`description/25-26/`。

## 三、澳超 vs 英超 vs 欧冠 关键差异

| 维度 | 澳超 | 英超 | 欧冠 |
|------|------|------|------|
| 规模 | 12 队 | 20 队 | 多阶段杯赛 |
| 常规赛 | 26 轮 | 38 轮 | 联赛阶段 + 淘汰赛 |
| 季后赛 | 前六争冠附加 | 无（纯积分） | 两回合淘汰等 |
| 赛程数据 | `s273_462.js` | `s36.js` | `c103.js` |
| 盘路样本 | 轮次少于英超，`l273`/`bs273` 仍具参考 | `l36`/`bs36` 样本大 | `l103`/`bs103` |
| 分析侧重 | 季后赛资格、前二直通准决赛 | 争冠/争四/保级/德比 | 积分区间、两回合 |

## 四、数据与爬虫

- **赛程更新**：`cd cup-analyzer/crawler-server && CUP_ANALYZER_CUP=aLeague node crawlers/scheduleCrawler.js`（或 `npm run crawl:schedule:aleague`）
- **盘路 / 入球时间**：`l273.js`、`bs273.js`、`td273.js` 可与 `league-analyzer/data/` 同步或从球探同联赛导出。

配置见 [crawler-server/config/index.js](../crawler-server/config/index.js) 中 `aLeague` 条目。

## 五、参考

- 工作流程：[workflow.md](./workflow.md)
- 项目进度与迁移记录：[PLAN.md](./PLAN.md)
- 数据目录说明：[data/README.md](./data/README.md)
- 爬虫总说明：[crawler-server/README.md](../crawler-server/README.md)
