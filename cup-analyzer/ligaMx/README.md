# 墨西联（Liga MX）分析模块

与 [`epl`](../epl) 同构：赛程与盘路在 `data/`（`s140_44.js` 等），大名单与画像在 `squad/` → `squad-final/` → `teamProfile/`。

- **球探序号**：联赛 **140**，子联赛 **44**（`s140_44.js`）
- **爬虫环境变量**：`CUP_ANALYZER_CUP=ligaMx`
- **流程说明**：[workflow.md](./workflow.md)
- **赛程更新**（在 `crawler-server` 下）：`npm run crawl:schedule:ligamx`
