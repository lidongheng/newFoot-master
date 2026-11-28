# 亚冠联2杯赛工作流

当前赛季2026-2027，从联赛/分组阶段正赛开始，包含后续淘汰赛。资格赛及其附加赛已从teamAgent采集和分析范围排除。

完整可执行流程见[teamAgent数据与赛后复盘工作流](teamAgent/workflow.md)。请依次执行数据准备、build、球队报告及本场复盘。

赛程数据为data/c350.js；联赛/分组阶段及后续阶段键来自本地arrCupKind与G数组，不能套用R轮次。名单、赛季和ID以核验后的配置为准。球队画像及赛前阵容链路入口也见上述工作流的第五节。

## 六、从大名单到球队画像的完整命令链（可选）

本节生成赛前阵容和画像，与teamAgent单队config独立。先核对crawler-server/config/squadTarget.js：teamSerial为本队球探ID；leagueSlug用于读取对应模块data/config.json的映射；clubMatchAnalyzer的leagueSerial应为该队国内联赛序号，不能直接照抄本杯赛ID。CUP_ANALYZER_CUP负责把输出写到本杯赛模块。matchTime使用目标比赛北京时间，完整赛季保持一致。国内联赛ID与懂球帝ID必须从现有映射核实，缺少映射时停止此链路，不影响已有basicData复盘。

在crawler-server目录按顺序执行；下方球队ID取本地正赛arrTeam，运行前把squadTarget同步为该球队：

```bash
# 本地正赛示例：上海申花，球探球队ID 39
npm run crawl:player-list
npm run analyze:club-domestic
npx cross-env CUP_ANALYZER_CUP=afcChampionsLeagueTwo node processors/leagueSquadProcessor.js
npx cross-env CUP_ANALYZER_CUP=afcChampionsLeagueTwo node processors/teamScheduleProcessor.js
npx cross-env CUP_ANALYZER_CUP=afcChampionsLeagueTwo node processors/squadFinalInitializer.js --team 39
# 人工核对squad-final中的阵容，并维护伤停、伤疑；再生成画像
npx cross-env CUP_ANALYZER_CUP=afcChampionsLeagueTwo node processors/teamProfileGenerator.js --team 39
```

不要自动覆盖用户维护的伤停备注，也不要用国内联赛统计代替本杯赛basicData。画像中的未来赛程以生成时matchTime为基准；更新后再运行球队赛程报告。
