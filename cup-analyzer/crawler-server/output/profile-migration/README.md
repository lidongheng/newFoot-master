# 全量球队画像迁移与待补数据

| 赛事 | 原有画像 | 迁移 | MD/JSON成功 | 缺失字段 | 失败 |
|---|---|---|---|---|---|
| [theWorldCup](theWorldCup.json) | 48 | 48 | 48 | 4738 | 0 |
| [europeanNationalLeague](europeanNationalLeague.json) | 34 | 34 | 34 | 3206 | 0 |
| [InternationalFriendship](InternationalFriendship.json) | 6 | 6 | 6 | 560 | 0 |
| [championsLeague](championsLeague.json) | 11 | 11 | 11 | 283 | 0 |
| [afcChampionsLeague](afcChampionsLeague.json) | 14 | 14 | 14 | 744 | 0 |
| [afcChampionsLeagueTwo](afcChampionsLeagueTwo.json) | 4 | 4 | 4 | 128 | 0 |
| [europaLeague](europaLeague.json) | 1 | 1 | 1 | 36 | 0 |
| [uefaConferenceLeague](uefaConferenceLeague.json) | 0 | 0 | 0 | 0 | 0 |
| [epl](epl.json) | 23 | 23 | 22 | 300 | 1 |
| [eflChampionship](eflChampionship.json) | 9 | 9 | 9 | 84 | 0 |
| [allsvenskan](allsvenskan.json) | 2 | 2 | 2 | 36 | 0 |
| [eliteSerien](eliteSerien.json) | 0 | 0 | 0 | 0 | 0 |
| [eredivisie](eredivisie.json) | 7 | 7 | 7 | 34 | 0 |
| [jLeague](jLeague.json) | 20 | 20 | 20 | 1157 | 0 |
| [bundesliga](bundesliga.json) | 13 | 13 | 13 | 156 | 0 |
| [ligue1](ligue1.json) | 8 | 8 | 8 | 58 | 0 |
| [laLiga](laLiga.json) | 10 | 10 | 10 | 39 | 0 |
| [koreanKLeague](koreanKLeague.json) | 12 | 12 | 12 | 573 | 0 |
| [ChinaSuperLeague](ChinaSuperLeague.json) | 2 | 2 | 2 | 99 | 0 |
| [aLeague](aLeague.json) | 12 | 12 | 12 | 566 | 0 |
| [mls](mls.json) | 10 | 10 | 10 | 312 | 0 |
| [serieA](serieA.json) | 16 | 16 | 16 | 124 | 0 |
| [ligaMx](ligaMx.json) | 0 | 0 | 0 | 0 | 0 |

请按各赛事 JSON 的 issues 补充源名单、赛季统计或赛程，之后重新生成画像和榜单。原文保存在 originals 中。

重新生成：`node processors/migrateTeamProfiles.js`（在 crawler-server 目录执行）。
