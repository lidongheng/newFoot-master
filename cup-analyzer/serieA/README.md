# 意甲（Serie A）分析模块

> 最后更新: 2026-04-12

## 一、背景与定位

意大利足球甲级联赛（Serie A）为**国内联赛**（20 队、双循环 **38 轮**），与英超模块同级。`cup-analyzer/serieA/` 与 [`epl/`](../epl/) 平行。

球探体育联赛序号：**34**，联赛阶段子联赛 ID **2948** → 赛程数据文件 **`s34_2948.js`**（同目录 `l34.js`、`bs34.js`、`td34.js`）。

## 二、目录结构（当前）

```
cup-analyzer/
├── serieA/
│   ├── README.md                 # 本文件
│   ├── PLAN.md
│   ├── workflow.md               # 工作流程（含霍华德·马克斯周期 HTML）
│   ├── prompts/
│   │   └── match_analysis_template.md   # 与英超同源
│   ├── data/
│   │   ├── s34_2948.js           # 赛程与积分榜（scheduleCrawler 写入）
│   │   ├── l34.js                # 亚盘盘路榜
│   │   ├── bs34.js               # 大小球盘路榜
│   │   ├── td34.js               # 入球时间分布
│   │   └── 冠军赔率.md           # 意甲冠军等赔率（手工维护，供 teamProfileGenerator）
│   ├── squad/
│   ├── squad-final/
│   ├── teamProfile/
│   ├── report/
│   │   └── 25-26/
│   ├── postMatchSummary/
│   │   └── 25-26/
│   └── news/
│       └── 25-26/
```

可选后续扩展（对齐英超）：`rule/`、`strategy/`、`description/25-26/`。

## 三、数据与爬虫

- **赛程更新**：`cd cup-analyzer/crawler-server && CUP_ANALYZER_CUP=serieA node crawlers/scheduleCrawler.js`（或 `npm run crawl:schedule:seriea`）
- **夺冠赔率**：手工维护，见 [`data/冠军赔率.md`](./data/冠军赔率.md)（与 [`epl/data/冠军赔率.md`](../epl/data/冠军赔率.md) 用法一致，供 `teamProfileGenerator` 画像）。
- **盘路 / 入球时间**：`l34.js`、`bs34.js`、`td34.js` 由同一爬虫写入 `serieA/data/`。
- **亚盘周期 HTML（霍华德·马克斯周期视角）**：配置好 [`squadTarget.js`](../crawler-server/config/squadTarget.js) 后执行 `npm run generate:cycle-report`（需 `CUP_ANALYZER_CUP=serieA`），生成 `{主队}_vs_{客队}_cycle.html`；完整步骤见 [workflow.md](./workflow.md) 中「亚盘周期盈亏 HTML（霍华德·马克斯周期视角）」。

配置见 [crawler-server/config/index.js](../crawler-server/config/index.js) 中 `serieA` 条目。

## 四、参考

- 工作流程：[workflow.md](./workflow.md)
- 项目进度：[PLAN.md](./PLAN.md)
- 数据目录：[data/README.md](./data/README.md)
- 爬虫总说明：[crawler-server/README.md](../crawler-server/README.md)
