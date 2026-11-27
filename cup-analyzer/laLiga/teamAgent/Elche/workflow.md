# 埃尔切球队研究

<!-- team-agent-workflow-v1 -->
## 球队研究工作流

- 球队：埃尔切（Elche，球探 ID 126）。
- 赛事：laLiga，赛季：2026-2027。
- 初始化状态：未采集、未分析；这不是每次执行采集后的实时状态。

以下命令均在 `cup-analyzer/crawler-server` 执行。

1. 核对本队 config.js；本地赛程的赛事、赛季、球队 ID 必须一致。
2. 更新所属赛事赛程。执行前核对 crawler-server/config/index.js 的对应赛事 season 是否为 2026-2027，不一致时先人工确认，不用旧配置直接覆盖赛程。

```bash
npx cross-env CUP_ANALYZER_CUP=laLiga node crawlers/scheduleCrawler.js
```

3. 采集本队本赛季、本赛事已完赛比赛；再次执行时跳过完整数据，重新采集不完整数据。

```bash
node processors/teamPostMatchDataProcessor.js --config "../laLiga/teamAgent/Elche/config.js"
```

4. 检查 `basicData/26-27/{matchId}/` 中的核心文件及命令成功、跳过、失败统计；文件 ID、终场事件与技术统计必须完整，并对照本地赛程检查缺场。
5. 后续分析：结合比赛表现、盘口、对手、主客场、阵容和赛程，形成带判断时间的潜力观察，再用后续比赛验证。本次未实现趋势判断或预测。

## 可选：联赛积分与赛前对照分析

以下命令均在 `cup-analyzer/crawler-server` 执行，通过 `--config` 直接读取埃尔切配置，无须修改全局 `squadTarget.js`。

```bash
# 下半场积分榜：统计西甲全部有效完赛比赛，并与全场积分榜对比。
node processors/secondHalfStandings.js --config "../laLiga/teamAgent/Elche/config.js"

# 自定义轮次积分榜：示例为第 1–13 轮；可自行调整 --rounds，省略则统计全部已完赛轮次。
node processors/customRoundStandings.js --config "../laLiga/teamAgent/Elche/config.js" --rounds 1-13

# 历史同盘口／同档次：以埃尔切 config.js 中的目标轮次、比赛为基准，仅分析开赛前的历史场次。
# 同档次必须有同赛事、同赛季分档；缺少时明确跳过，不套用旧赛季。
node processors/historicalHandicapAnalysis.js --config "../laLiga/teamAgent/Elche/config.js"
```

## 本轮即将开打比赛的单场统计

在埃尔切 `config.js` 中配置 `roundSerial`、`matchSerial`。当前按本地西甲赛程设置为第 14 轮、比赛 ID `3013775`，北京时间 `2026-11-29 01:30`，埃尔切 vs 马德里竞技。每轮赛前先更新赛程并核对这两个字段，不自动沿用上一场 ID。

```bash
# 原 crawlerStatistics.js 对应入口：交锋、双方近况、未来赛程及页面伤病信息，需要联网。
# 运行前核验 matchSerial 属于本轮本队且尚未开打。
node processors/matchStatisticsProcessor.js --config "../laLiga/teamAgent/Elche/config.js"
```

前三条使用西甲全联赛赛程；单场统计使用配置中本轮本队的比赛，不使用最近一场已完赛的 ID，也不读取旧 backend 配置。
