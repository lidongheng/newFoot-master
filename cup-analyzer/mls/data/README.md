# 美职联数据（data）

球探体育联赛序号 **21**，常规联赛阶段子联赛 ID **165**（见 titan007 `arrSubLeague`）。

| 文件 | 说明 |
|------|------|
| `s21_165.js` | 赛程与积分榜等（`CUP_ANALYZER_CUP=mls node crawlers/scheduleCrawler.js` 更新） |
| `l21.js` | 亚盘盘路榜 |
| `bs21.js` | 大小球盘路榜 |
| `td21.js` | 入球时间分布 |
| [`冠军赔率.md`](./冠军赔率.md) | MLS Cup 等夺冠赔率（手工维护；`CUP_ANALYZER_CUP=mls` 时由 `teamProfileGenerator` 读取，写入画像「冠军赔率 / 赔率定位」） |

数据来源 URL 模板：`http://zq.titan007.com/jsData/matchResult/2026/s21_165.js?version=YYYYMMDDHH`

同目录 `l21` / `bs21` / `td21` 与赛程共用赛季目录 **`2026`**，由 `scheduleCrawler` 一并拉取。

球队序号对照见 [球队与序号对照表.md](./球队与序号对照表.md)。
