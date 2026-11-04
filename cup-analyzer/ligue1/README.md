# 法甲（Ligue 1）分析目录

本目录按 `epl/` 的联赛分析结构建立，用于法国足球甲级联赛。球探联赛序号为 **11**，数据文件预期使用 `s11.js`、`l11.js`、`bs11.js`、`td11.js`。

## 目录

- `workflow.md`：赛前准备、赛中分析与赛季策略流程。
- `data/`：赛程、盘路、进球时间数据和球队序号映射。
- `rule/`：赛制与名额规则。
- `strategy/`：争冠、欧战资格、保级、赛程和德比分析框架。
- `prompts/`：比赛分析模板。
- `squad/`、`squad-final/`、`teamProfile/`：大名单、人工审核名单和球队画像。
- `basicData/`、`report/`、`news/`、`postMatchSummary/`、`description/`：按赛季保存比赛素材与分析结果。

## 当前状态

已建立 2026/27 赛季目录骨架，并按提供的球队序号填写 `data/config.json` 与对照表。赛程、盘路和球队画像数据尚未抓取。

`crawler-server` 已登记球探联赛序号 11、赛程路径和 `npm run crawl:schedule:ligue1` 命令。当前尚未抓取赛程与盘路数据；运行工作流中的更新命令后会写入对应文件。

## 参考

- [LFP：2026/27 Ligue 1 赛季日历](https://www.lfp.fr/article/publication-du-calendrier-general-de-la-ligue-1-mcdonald-s-pour-la-saison-2026-2027?wpmobileexternal=true)
- [Ligue 1 官方赛历](https://ligue1.com/en/articles/l1_article_5292-)
- [Ligue 1 官方 2026/27 赛季 18 队信息](https://ligue1.com/fr/articles/l1_article_5293-les-dates-de-reprise-des-clubs-de-l1-2627)
