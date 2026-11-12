# 欧洲国家联赛

- 模块名：`europeanNationalLeague`。
- 球探赛事序号：`1864`；国家队杯赛，`type: 'cup'`、`isNation: true`。
- 当前赛季：`2026-2027`；赛程：`data/c1864.js`。
- `data/config.json` 沿用 EPL 的 `positionMap` / `team` 结构，包含全部 54 支参赛国家队的懂球帝 ID、名称与球探序号。
- 名单、最终名单、画像按球队平铺，不使用世界杯的 `group-A` 等目录，避免 A/B/C/D 级别小组重名。

完整命令见 [workflow.md](./workflow.md)，球队 ID 见 [球队与序号对照表](./data/球队与序号对照表.md)。共用 `crawler-server` 的原有脚本，通过 `CUP_ANALYZER_CUP=europeanNationalLeague` 切换输出位置。

本模块参考 `theWorldCup/workflow.md` 的国家队流程与 `epl/workflow.md` 的单队流水线，并复制了 EPL 的 [赛前报告模板](./prompts/match_analysis_template.md)。世界杯专用的 48 队、26 人裁剪、32 强路线监控不适用于欧国联。
