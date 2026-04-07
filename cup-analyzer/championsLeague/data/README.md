# championsLeague/data 说明

| 文件 | 说明 |
|------|------|
| `c103.js` | 球探杯赛 **103** 赛程与积分榜等（与 `league-analyzer/data/c103.js` 同步） |
| `l103.js` | 联赛阶段亚盘盘路榜 |
| `bs103.js` | 大小球盘路榜 |
| `td103.js` | **入球时间分布**（若仓库中暂无，可从球探导出 `td103.js` 放入本目录，结构与 `league-analyzer/data/README.md` 中 `td*` 说明一致） |
| `冠军赔率.md` | 欧冠夺冠赔率，用于广实/档次参考 |
| `球队与序号对照表.md` | 球队中文名 ↔ 球探序号（可由 `c103.js` 的 `arrTeam` 生成） |

**赛季**：`c103.js` 内 `arrCup` 含赛季信息；爬虫更新时使用 `CUP_ANALYZER_CUP=championsLeague` 与 `25-26` 赛季目录。
