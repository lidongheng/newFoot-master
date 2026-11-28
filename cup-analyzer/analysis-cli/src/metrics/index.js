// 累计、平均值、积分榜和阵容指标各自采用明确的聚合方式。
const teamDefinitions = [
  ['shots', '射门', 'SHOOT'], ['shotsOnTarget', '射正', 'TARGET'], ['xg', '预期进球 xG', 'EXPECTED_GOALS'],
  ['yellowCards', '黄牌', 'YELLOW'], ['redCards', '红牌', 'RED'], ['clearances', '解围', 'CLEARANCES'],
  ['tackles', '抢断成功', 'STEAL_SUCCESS'], ['interceptions', '拦截', 'HOLDUP'], ['passes', '传球', 'PASSBALL'],
  ['corners', '角球', 'CORNER'], ['shotsOffTarget', '射门不中', 'OFFTARGET'], ['shotsBlocked', '射门被挡', 'BLOCKED'],
  ['saves', '扑救', 'SAVE'], ['shotsInside', '禁区内射门', 'SHOOT_INSIDE'], ['shotsOutside', '禁区外射门', 'SHOOT_OUTSIDE'],
  ['bigChances', '绝佳机会', 'BIG_CHANCES'], ['bigChancesMissed', '错失绝佳机会', 'BIG_CHANCES_MISSED'],
  ['fouls', '犯规', 'FOULS'], ['offsides', '越位', 'OFFSIDE'], ['attacks', '进攻', 'ATTACK'],
  ['dangerousAttacks', '危险进攻', 'DANGEROUS_ATTACK'], ['freeKicks', '任意球', 'FREEKICT'],
  ['headers', '头球', 'HEADER'], ['headersWon', '争顶成功', 'HEADER_SUCEESS'], ['tackleAttempts', '铲球', 'TACKLE'],
  ['substitutions', '换人', 'SUBST'], ['dribbles', '过人', 'DRIBBLES'], ['throwIns', '界外球', 'THROWINS'],
  ['woodwork', '击中门框', 'HIT_WOODWORK'], ['assists', '助攻', 'ASSISTS'], ['longPasses', '长传', 'LONG_PASS'],
  ['successfulCrosses', '成功传中', 'SUCCESS_CROSS'], ['boxTouches', '对方禁区触球', 'TIOBX'],
  ['openPlayXg', '运动战 xG', 'XGOPEN_PlAY'], ['setPlayXg', '定位球 xG', 'XGSET_PlAY'],
  ['nonPenaltyXg', '非点球 xG', 'XGNON_PENAlTY'], ['xgot', '射正预期进球', 'XGOT'],
];
const playerDefinitions = [
  ['shots', '射门', 'Shots'], ['shotsOnTarget', '射正', 'ShotOnTarget'], ['keyPasses', '关键传球', 'KeyPass'],
  ['headersWon', '争顶成功', 'HeadBulbSuccee'], ['bodyContacts', '身体接触', 'BodyContact'], ['dribbles', '带球过人', 'ControlPass'],
  ['foulsDrawn', '被侵犯', 'BeAttacked'], ['dispossessed', '被抢断', 'BeSteal'], ['errors', '失误', 'Fault'],
  ['offsides', '越位', 'Offside'], ['tackles', '抢断', 'Steal'], ['interceptions', '拦截', 'Intercept'],
  ['clearances', '解围次数', 'Clearances'], ['effectiveClearances', '有效解围', 'ClearanceWon'], ['shotsBlocked', '封堵', 'ShotsBlocked'],
  ['offsidesProvoked', '制造越位', 'OffsideProvoked'], ['fouls', '犯规', 'Fouls'], ['passes', '传球次数', 'PassBall'],
  ['successfulPasses', '传球成功次数', 'PassBallSuc'], ['crosses', '横传次数', 'CrossNum'], ['accurateCrosses', '精确横传', 'CrossWon'],
  ['longPasses', '长传次数', 'LongPass'], ['accurateLongPasses', '精确长传', 'LongBallsWon'],
  ['throughBalls', '直塞次数', 'ThroughBall'], ['accurateThroughBalls', '精确直塞', 'ThroughBallWon'], ['minutes', '上场分钟', 'PlayingTime'],
];
const eventDefinitions = [
  ['goalEvents', '非点球进球事件', 'Goal'], ['penaltyGoals', '罚进点球事件', 'Penalty'], ['ownGoals', '乌龙球', 'OwnGoal'],
  ['assists', '助攻事件', 'Assist'], ['yellowCards', '黄牌事件', 'yellowCard'], ['redCards', '直接红牌事件', 'redCard'],
  ['secondYellowCards', '两黄变红事件', 'DoubleYellow'], ['woodwork', '击中门框', 'ShotOnPost'],
  ['penaltiesWon', '制造点球', 'PenaltyProvoked'], ['penaltiesMissed', '罚失点球', 'PenaltyFailure'],
  ['penaltiesSaved', '扑出点球', 'PenaltySave'], ['lastManTackles', '最后一人抢断', 'LastManTackle'],
  ['errorsLeadingToGoal', '失误致失球', 'ErrorLeadToGoal'], ['goalLineClearances', '门线解围', 'ClearanceOffLine'],
];

const indicatorDefinitions = [
  ['comebackPoints', '落后追回分数', 'matchEvents', '分', 'events/goal/score'],
  ['standings', '积分榜', 'schedule', '积分', 'score'],
  ['firstHalfStandings', '上半场积分榜', 'schedule', '积分', 'halfScore'],
  ['secondHalfStandings', '下半场积分榜', 'schedule', '积分', 'score - halfScore'],
  ['homeStandings', '主场积分榜', 'schedule', '积分', 'score'],
  ['awayStandings', '客场积分榜', 'schedule', '积分', 'score'],
  ['averageAge', '平均年龄', 'teamProfile', '岁', 'players.age'],
  ['averageHeight', '平均身高', 'teamProfile', 'cm', 'players.height'],
  ['totalMarketValue', '总身价', 'teamProfile', '万', 'players.marketValue'],
  ['averagePossession', '平均控球率', 'techStats', '%', 'CONTROL_PERCENT'],
];
const catalog = [
  { id: 'pointsDropped', label: '领先丢掉分数', entity: 'teams', source: 'matchEvents', field: 'events/goal/score', unit: '分', additive: false, order: 'asc' },
  ...indicatorDefinitions.map(([id, label, source, unit, field]) => ({ id, label, entity: 'teams', source, unit, field, additive: false })),
  ...teamDefinitions.map(([id, label, field]) => ({ id, label, entity: 'teams', source: 'techStats', field, unit: '次', additive: true })),
  ...playerDefinitions.map(([id, label, field]) => ({ id, label, entity: 'players', source: 'stats', field, unit: '次', additive: true })),
  ...eventDefinitions.map(([id, label, field]) => ({ id, label, entity: 'players', source: 'events', field, unit: '次', additive: true })),
  { id: 'goals', label: '进球（Goal＋Penalty，不含乌龙）', entity: 'players', source: 'events', field: 'Goal|Penalty', unit: '球', additive: true },
  { id: 'goals', label: '进球', entity: 'teams', source: 'schedule', field: 'score', unit: '球', additive: true },
  { id: 'goalsAgainst', label: '失球', entity: 'teams', source: 'schedule', field: 'score', unit: '球', additive: true },
  { id: 'goalsMinusXg', label: '实际进球 − xG', entity: 'teams', source: 'derived', field: 'goals - xg', unit: '球', additive: true },
  { id: 'averageXg', label: '场均 xG', entity: 'teams', source: 'derived', field: 'xg', unit: '预期进球/场', additive: false, aggregation: 'average' },
  { id: 'zeroShotsOnTarget', label: '0射正', entity: 'teams', source: 'derived', field: 'shotsOnTarget', unit: '场', additive: false, aggregation: 'zeroCount', order: 'asc' },
  { id: 'averageShots', label: '场均射门', entity: 'teams', source: 'derived', field: 'shots', unit: '次/场', additive: false, aggregation: 'average' },
  { id: 'shotConversionRate', label: '射门转化率', entity: 'teams', source: 'derived', field: 'shots', unit: '%', additive: false, aggregation: 'conversionRate' },
  { id: 'shotOnTargetConversionRate', label: '射正转化率', entity: 'teams', source: 'derived', field: 'shotsOnTarget', unit: '%', additive: false, aggregation: 'conversionRate' },
  { id: 'shotsAgainst', label: '被对手射门', entity: 'teams', source: 'techStats', field: 'SHOOT', side: 'opponent', unit: '次', additive: true, order: 'asc' },
  { id: 'averageShotsAgainst', label: '场均被对手射门', entity: 'teams', source: 'derived', field: 'shotsAgainst', unit: '次/场', additive: false, aggregation: 'average', order: 'asc' },
];
for (const metric of catalog) {
  if (/xg/i.test(metric.id) && metric.source === 'techStats') metric.unit = '预期进球';
  if (metric.id === 'minutes') metric.unit = '分钟';
}

function metricsFor(entity, requested) {
  return catalog.filter((metric) => metric.entity === entity && (!requested || requested.includes(metric.id)));
}

module.exports = { catalog, metricsFor };
