# 摩纳哥球队研究

<!-- team-agent-workflow-v1 -->
## 球队研究工作流

- 球队：摩纳哥（Monaco，球探 ID 197）。
- 赛事：ligue1，赛季：2026-2027。
- 初始化状态：未采集、未分析；这不是每次执行采集后的实时状态。

以下命令均在 `cup-analyzer/crawler-server` 执行。

1. 核对本队 config.js；本地赛程的赛事、赛季、球队 ID 必须一致。
2. 更新所属赛事赛程。执行前核对 crawler-server/config/index.js 的对应赛事 season 是否为 2026-2027，不一致时先人工确认，不用旧配置直接覆盖赛程。

```bash
npx cross-env CUP_ANALYZER_CUP=ligue1 node crawlers/scheduleCrawler.js
```

3. 采集本队本赛季、本赛事已完赛比赛；再次执行时跳过完整数据，重新采集不完整数据。

```bash
node processors/teamPostMatchDataProcessor.js --config "../ligue1/teamAgent/Monaco/config.js"
```

4. 检查 `basicData/26-27/{matchId}/` 中的核心文件及命令成功、跳过、失败统计；文件 ID、终场事件与技术统计必须完整，并对照本地赛程检查缺场。
5. 后续分析：结合比赛表现、盘口、对手、主客场、阵容和赛程，形成带判断时间的潜力观察，再用后续比赛验证。本次未实现趋势判断或预测。
