# 法甲（Ligue 1）分析项目方案

> 目录按 `epl/` 的联赛模块结构建立。球探联赛序号：**11**。

## 一、项目全景

在 `cup-analyzer/ligue1/` 分析法国足球甲级联赛，与 `epl/`、`serieA/` 等模块同级。报告、赛程、赔率和球队映射按法甲来源单独维护，不复用英超数据。

## 二、实施状态

| 任务 | 状态 | 说明 |
|------|------|------|
| 建立联赛目录骨架 | 已完成 | 参考 `epl/` 的分析目录 |
| 建立 workflow、PLAN、README 与规则/策略文档 | 已完成 | 适配法甲赛制和分析主题 |
| 建立比赛分析模板 | 已完成 | 复制通用模板，不含英超赛程数据 |
| 建立法甲数据配置与球队映射表 | 已完成 | 球队映射按用户提供的 18 队名单填写 |
| 导入 `s11.js`、`l11.js`、`bs11.js`、`td11.js` | 待完成 | 本次未抓取或伪造数据 |
| 在 `crawler-server` 注册 `ligue1` 与赛程命令 | 已完成 | 球探序号 11，命令 `npm run crawl:schedule:ligue1` |
| 根据有效赛程核对球队球探序号 | 待完成 | 用户提供的序号已入表，赛程抓取后与 `arrTeam` 核对 |

## 三、联赛数据与赛制

- 球探联赛序号：**11**。
- 预期数据文件：`s11.js`、`l11.js`、`bs11.js`、`td11.js`。
- 2026/27 赛季官方赛历列出 18 支球队、34 个比赛日；赛季内容目录使用 `26-27`，球探赛季路径使用完整年份时应为 `2026-2027`。
- 2026/27 官方赛历列明：法甲第 16 名与法乙升级附加赛胜者进行两回合升降级附加赛。后续赛季的名额与规则仍以当季 LFP/UEFA 公布为准。
- 18 队信息：[Ligue 1 官方公告](https://ligue1.com/fr/articles/l1_article_5293-les-dates-de-reprise-des-clubs-de-l1-2627)；赛历和附加赛信息：[LFP 官方日历](https://www.lfp.fr/article/publication-du-calendrier-general-de-la-ligue-1-mcdonald-s-pour-la-saison-2026-2027?wpmobileexternal=true)。

## 四、目录结构

`data/`、`rule/`、`strategy/`、`report/{赛季}/`、`news/{赛季}/`、`postMatchSummary/{赛季}/`、`description/{赛季}/`、`squad/`、`squad-final/`、`teamProfile/` 与英超模块保持同类用途。

## 五、后续步骤

1. 运行正式数据抓取，核对赛程、盘路和入球时间文件格式。
2. 将用户提供的球队与球探序号映射同赛程 `arrTeam` 核对。
3. 再生成大名单、球队画像、报告与赛后复盘。
