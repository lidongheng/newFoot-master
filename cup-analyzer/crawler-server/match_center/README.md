# match_center（国内联赛赛程 JS 兜底目录）

`clubMatchAnalyzer` 读取的赛程格式与 backend-server 相同（**`s{联赛序号}.js`**，如英超 `s36.js`）。

## 优先路径（推荐）

已在 [`config/index.js`](../config/index.js) 的 `cups` 中配置的赛事，**优先**使用各模块下的 `data/` 赛程文件（如 `epl/data/s36.js`、`aLeague/data/s273_462.js`、`mls/data/s21_165.js`、`serieA/data/s34_2948.js`），由 `config.resolveScheduleData(leagueSerial, isNation)` 解析。子联赛文件名（如 `s273_462.js`）无需放在本目录。

## 本目录（兜底）

未在 `cups` 中配置的联赛序号（例如仅存在于 `squadTarget` 的其它联赛），仍从 **`match_center/s{n}.js`** 或 **`c{n}.js`** 读取。

## 自动同步

执行 `node crawlers/scheduleCrawler.js`（或各赛事 `npm run crawl:schedule:*`）时，拉取成功的**赛程主文件**会**覆盖拷贝**到本目录的 `s{序号}.js` / `c{序号}.js`，与上述兜底命名一致，一般无需再手动维护。

## 手动放置（可选）

若无法运行爬虫，可：

1. 从现有 backend-server 复制：`cp /path/to/backend-server/match_center/s36.js ./`
2. 浏览器保存球探赛程脚本，文件名与 `config/squadTarget.js` 中的 `leagueSerial` 一致（英超 `36` → `s36.js`）。

国家队赛事使用 `c{序号}.js` 时，将 `squadTarget.isNation` 设为 `true`。
