# 全量球队画像迁移与待补数据

| 赛事 | 原有画像 | 迁移 | MD/JSON成功 | 缺失字段 | 失败 |
|---|---|---|---|---|---|
| [theWorldCup](theWorldCup.md) | 48 | 48 | 48 | 4738 | 0 |
| [europeanNationalLeague](europeanNationalLeague.md) | 34 | 34 | 34 | 3206 | 0 |
| [InternationalFriendship](InternationalFriendship.md) | 6 | 6 | 6 | 560 | 0 |
| [championsLeague](championsLeague.md) | 11 | 11 | 11 | 283 | 0 |
| [afcChampionsLeague](afcChampionsLeague.md) | 14 | 14 | 14 | 744 | 0 |
| [afcChampionsLeagueTwo](afcChampionsLeagueTwo.md) | 4 | 4 | 4 | 128 | 0 |
| [europaLeague](europaLeague.md) | 1 | 1 | 1 | 36 | 0 |
| [uefaConferenceLeague](uefaConferenceLeague.md) | 0 | 0 | 0 | 0 | 0 |
| [epl](epl.md) | 23 | 23 | 22 | 300 | 1 |
| [eflChampionship](eflChampionship.md) | 9 | 9 | 9 | 84 | 0 |
| [allsvenskan](allsvenskan.md) | 2 | 2 | 2 | 36 | 0 |
| [eliteSerien](eliteSerien.md) | 0 | 0 | 0 | 0 | 0 |
| [eredivisie](eredivisie.md) | 7 | 7 | 7 | 34 | 0 |
| [jLeague](jLeague.md) | 20 | 20 | 20 | 1157 | 0 |
| [bundesliga](bundesliga.md) | 13 | 13 | 13 | 156 | 0 |
| [ligue1](ligue1.md) | 8 | 8 | 8 | 58 | 0 |
| [laLiga](laLiga.md) | 10 | 10 | 10 | 39 | 0 |
| [koreanKLeague](koreanKLeague.md) | 12 | 12 | 12 | 573 | 0 |
| [ChinaSuperLeague](ChinaSuperLeague.md) | 2 | 2 | 2 | 99 | 0 |
| [aLeague](aLeague.md) | 12 | 12 | 12 | 566 | 0 |
| [mls](mls.md) | 10 | 10 | 10 | 312 | 0 |
| [serieA](serieA.md) | 16 | 16 | 16 | 124 | 0 |
| [ligaMx](ligaMx.md) | 0 | 0 | 0 | 0 | 0 |

请按各赛事 MD 末尾的待补数据 补充源名单、赛季统计或赛程，之后重新生成画像和榜单。原文保存在 originals 中。

重新生成：`node processors/migrateTeamProfiles.js`（在 crawler-server 目录执行）。
