# 意甲数据（data）

球探体育联赛序号 **34**，联赛阶段子联赛 ID **2948**（见 titan007 `arrSubLeague`）。

| 文件 | 说明 |
|------|------|
| `s34_2948.js` | 赛程与积分榜等（`CUP_ANALYZER_CUP=serieA node crawlers/scheduleCrawler.js` 更新） |
| `l34.js` | 亚盘盘路榜 |
| `bs34.js` | 大小球盘路榜 |
| `td34.js` | 入球时间分布 |
| [`冠军赔率.md`](./冠军赔率.md) | 意甲冠军等赔率（手工维护；`CUP_ANALYZER_CUP=serieA` 时由 `teamProfileGenerator` 读取，写入画像「冠军赔率 / 赔率定位」） |

数据来源 URL 模板：`http://zq.titan007.com/jsData/matchResult/2025-2026/s34_2948.js?version=YYYYMMDDHH`

球队序号对照见 [球队与序号对照表.md](./球队与序号对照表.md)。
