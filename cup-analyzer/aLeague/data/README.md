# 澳超数据（data）

球探体育联赛序号 **273**，常规联赛阶段子联赛 ID **462**（见 titan007 `arrSubLeague`）。

| 文件 | 说明 |
|------|------|
| `s273_462.js` | 赛程与积分榜等（`CUP_ANALYZER_CUP=aLeague node crawlers/scheduleCrawler.js` 更新） |
| `l273.js` | 亚盘盘路榜（与 `league-analyzer/data/l273.js` 同源，可同步更新） |
| `bs273.js` | 大小球盘路榜 |
| `td273.js` | 入球时间分布 |

数据来源 URL 模板：`http://zq.titan007.com/jsData/matchResult/2025-2026/s273_462.js?version=YYYYMMDDHH`

`l273` / `bs273` / `td273` 可从球探同联赛目录导出或与 `league-analyzer/data/` 保持一致。
