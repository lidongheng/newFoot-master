# 西甲（LaLiga）分析模块

本目录用于分析西班牙足球甲级联赛，与 `epl/`、`serieA/` 等联赛模块并列。

## 联赛信息

- 球探体育联赛序号：**31**。
- 球探赛程数据文件：`data/s31.js`；盘路与入球时间文件为 `data/l31.js`、`data/bs31.js`、`data/td31.js`。
- 当前爬虫赛季：**2026-2027**；报告等本地内容使用 `26-27/` 赛季目录。
- 赛制与欧战名额以当赛季官方规则为准；策略框架见 `strategy/`。

## 目录

- `data/`：赛程、盘路、赔率和球队序号映射。
- `rule/`、`strategy/`：联赛规则与赛季形势分析框架。
- `squad/`、`squad-final/`、`teamProfile/`：球队名单与画像流水线。
- `report/`、`news/`、`postMatchSummary/`、`basicData/`：比赛分析素材与产物。
- `description/`：球队背景资料。
- `prompts/`：赛前分析模板。

## 更新赛程

在 `crawler-server/` 下运行 `npm run crawl:schedule:laliga`。爬虫会按球探序号 31 更新本目录的赛程与盘路数据，并同步赛程文件到 `crawler-server/match_center/s31.js`。

懂球帝球队映射已按提供的 20 条记录写入 `data/config.json`。球探赛程文件生成后，再核对球队序号对照表；不要沿用英超球队数据。
