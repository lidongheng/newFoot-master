# afcChampionsLeagueTwo/data 说明

| 文件 | 说明 |
|------|------|
| `c350.js` | 球探杯赛 **350**（亚冠联2）赛程与积分榜等 |
| `l350.js` | 小组赛/淘汰赛亚盘盘路榜 |
| `bs350.js` | 大小球盘路榜 |
| `td350.js` | **入球时间分布**（若仓库中暂无，可从球探导出 `td350.js` 放入本目录） |
| `冠军赔率.md` | 亚冠联2 夺冠赔率，用于广实/档次参考 |
| `球队与序号对照表.md` | 球队中文名 ↔ 球探序号（可由 `c350.js` 的 `arrTeam` 生成） |

**赛季**：`c350.js` 内 `arrCup` 含赛季文案（与站点一致，多为全写）。爬虫 `config/index.js` 里 **URL 赛季段** 须为 **`2025-2026`**（球探路径不支持 `25-26`）；本地报告、`basicData` 等目录仍按惯例用 **`25-26`**。执行：`CUP_ANALYZER_CUP=afcChampionsLeagueTwo npm run crawl:schedule:acl2`（见 `crawler-server/package.json`）。
