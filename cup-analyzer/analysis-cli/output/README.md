# 全联赛新增指标与待补数据

| 联赛 | 赛季 | 状态 | 待补项 | 清单或原因 |
|---|---|---|---|---|
| epl | 2026-2027 | generated | 382 | [球队榜与待补清单](../../epl/leagueRanking/26-27/teams/README.md) |
| eflChampionship | 2026-2027 | generated | 505 | [球队榜与待补清单](../../eflChampionship/leagueRanking/26-27/teams/README.md) |
| allsvenskan | 2026 | generated | 482 | [球队榜与待补清单](../../allsvenskan/leagueRanking/2026/teams/README.md) |
| eliteSerien | 缺失 | blocked | 待核验 | ENOENT: no such file or directory, open 'C:\www\newFoot-master\cup-analyzer\eliteSerien\data\s22.js' |
| eredivisie | 2026-2027 | generated | 282 | [球队榜与待补清单](../../eredivisie/leagueRanking/26-27/teams/README.md) |
| jLeague | 2026-2027 | generated | 677 | [球队榜与待补清单](../../jLeague/leagueRanking/26-27/teams/README.md) |
| bundesliga | 2026-2027 | generated | 306 | [球队榜与待补清单](../../bundesliga/leagueRanking/26-27/teams/README.md) |
| ligue1 | 2026-2027 | generated | 264 | [球队榜与待补清单](../../ligue1/leagueRanking/26-27/teams/README.md) |
| laLiga | 2026-2027 | generated | 57 | [球队榜与待补清单](../../laLiga/leagueRanking/26-27/teams/README.md) |
| koreanKLeague | 2026 | generated | 515 | [球队榜与待补清单](../../koreanKLeague/leagueRanking/2026/teams/README.md) |
| ChinaSuperLeague | 2026 | generated | 576 | [球队榜与待补清单](../../ChinaSuperLeague/leagueRanking/2026/teams/README.md) |
| aLeague | 2026-2027 | generated | 311 | [球队榜与待补清单](../../aLeague/leagueRanking/26-27/teams/README.md) |
| mls | 2026 | generated | 306 | [球队榜与待补清单](../../mls/leagueRanking/2026/teams/README.md) |
| serieA | 2026-2027 | generated | 318 | [球队榜与待补清单](../../serieA/leagueRanking/26-27/teams/README.md) |
| ligaMx | 2025-2026 | generated | 342 | [球队榜与待补清单](../../ligaMx/leagueRanking/25-26/teams/README.md) |

请补齐各队 squad-final、player_center 赛季统计及比赛 techStats.json 后，先重新生成画像，再执行 `node bin/buildAll.js`。

画像全量迁移与字段缺失清单：[查看汇总](../../crawler-server/output/profile-migration/README.md)。
