# 国际友谊赛

基于 `europeanNationalLeague` 模块建立，复用同一套 `crawler-server` 脚本。

- 模块名：`InternationalFriendship`，注意大小写。
- 球探序号：`1366`，国家队杯赛格式，`isNation: true`，`matchByName: true`。
- 当前赛季：`2026`；赛程：`data/c1366.js`，按月份组织 `G*` 阶段。
- `data/config.json` 只维护日本、巴西、中国、马来西亚四队，包含位置映射及懂球帝赛事、赛季和球队 ID。
- 名单、最终名单与画像按球队平铺，报告目录使用 `2026/round-{N}/`。

操作见 [workflow.md](./workflow.md)，球队 ID 见 [球队与序号对照表](./data/球队与序号对照表.md)。报告模板已从欧国联复制并改成友谊赛口径。

友谊赛没有欧国联的升级、保级和出线规则。符合 FIFA 认定条件的 A 级赛涉及排名积分；备战、试阵等实际比赛目标另据名单和发布会核实，详见 [规则说明](./rule/README.md)。
