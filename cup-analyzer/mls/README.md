# MLS（美国职业大联盟 / 美职联）分析模块

> 最后更新: 2026-04-12

## 一、背景与定位

美职联为**国内联赛**（东西区、常规赛与季后赛分阶段；具体轮次与季后赛规则以球探 `arrLeague` / `arrSubLeague` 与官方为准）。`cup-analyzer/mls/` 与 `epl/`、`aLeague/`、`koreanKLeague/` 平行。

球探体育联赛序号：**21**，常规赛子联赛 ID **165** → 赛程数据文件 **`s21_165.js`**（与澳超 `s273_462`、韩 K `s15_313` 同属「联赛 + 子联赛」格式）。

## 二、目录结构（当前）

```
cup-analyzer/
├── mls/
│   ├── README.md                 # 本文件
│   ├── PLAN.md                   # 项目计划（持续迭代）
│   ├── workflow.md               # 工作流程说明
│   ├── prompts/
│   │   └── match_analysis_template.md   # 与英超 / 澳超同源模板
│   ├── data/
│   │   ├── s21_165.js            # 赛程与积分榜（scheduleCrawler 写入）
│   │   ├── l21.js                # 亚盘盘路榜
│   │   ├── bs21.js               # 大小球盘路榜
│   │   ├── td21.js               # 入球时间分布
│   │   └── 冠军赔率.md           # MLS Cup 等夺冠赔率（手工维护，供 teamProfileGenerator）
│   ├── squad/
│   ├── squad-final/
│   ├── teamProfile/
│   ├── report/
│   │   └── 2026/                 # 赛前分析报告（round-*）
│   ├── postMatchSummary/
│   │   └── 2026/
│   └── news/
│       └── 2026/
```

可选后续扩展（对齐英超模块）：`rule/`、`strategy/`、`description/2026/`。

## 三、美职联 vs 英超 vs 澳超（摘要）

| 维度 | 美职联 | 英超 | 澳超 |
|------|--------|------|------|
| 规模 | 30 队（东西区） | 20 队 | 12 队 |
| 常规赛 | 34 轮（球探子联赛 165） | 38 轮 | 26 轮 |
| 季后赛 | 有（东西区 + MLS 杯等） | 无（纯积分） | 前六进入季后赛 |
| 赛程数据 | `s21_165.js` | `s36.js` | `s273_462.js` |

## 四、数据与爬虫

- **赛程更新**：`cd cup-analyzer/crawler-server && CUP_ANALYZER_CUP=mls node crawlers/scheduleCrawler.js`（或 `npm run crawl:schedule:mls`）
- **夺冠赔率**：手工维护，见 [`data/冠军赔率.md`](./data/冠军赔率.md)（与 [`epl/data/冠军赔率.md`](../epl/data/冠军赔率.md) 用法一致，供 `teamProfileGenerator` 画像）。
- **盘路 / 入球时间**：`l21.js`、`bs21.js`、`td21.js` 由同一爬虫写入 `mls/data/`。
- **亚盘周期 HTML（霍华德·马克斯周期视角）**：与英超相同，在配置好 `squadTarget.js` 后执行 `npm run generate:cycle-report`（需 `CUP_ANALYZER_CUP=mls`），生成 `{主队}_vs_{客队}_cycle.html`；完整步骤见 [workflow.md](./workflow.md) 中「亚盘周期盈亏 HTML（霍华德·马克斯周期视角）」。

配置见 [crawler-server/config/index.js](../crawler-server/config/index.js) 中 `mls` 条目。

## 五、参考

- 工作流程：[workflow.md](./workflow.md)
- 项目进度：[PLAN.md](./PLAN.md)
- 数据目录：[data/README.md](./data/README.md)
- 爬虫总说明：[crawler-server/README.md](../crawler-server/README.md)
