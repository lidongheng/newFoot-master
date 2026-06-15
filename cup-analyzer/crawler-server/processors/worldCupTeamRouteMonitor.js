const path = require('path');
const BaseCrawler = require('../crawlers/base');
const StrategyAnalyzer = require('./strategyAnalyzer');
const config = require('../config');
const { readFile, saveMarkdown } = require('../utils/fileWriter');

/**
 * 强队视角晋级路线监控器
 *
 * 每次 c75.js 更新后手动运行，按强队视角比较小组第1/第2/第3出线的路径。
 */
class WorldCupTeamRouteMonitor extends BaseCrawler {
  constructor() {
    super('WorldCupTeamRouteMonitor');
    this.strategyAnalyzer = new StrategyAnalyzer();
    this.groupLetters = 'ABCDEFGHIJKL';
    this.focusTeams = [
      {
        name: '瑞士',
        angle: '重点看 B1 是否落入更差半区；当前选择权不足时，先看能否抢到 4 分。',
      },
      {
        name: '巴西',
        angle: '重点联动 F 组，比较 C1 打 F2 与 C2 打 F1，尤其观察荷兰落位。',
        linkedTeam: '荷兰',
        ownRiskSlot: 'C1/C2',
        avoidSlot: 'F1/F2',
      },
      {
        name: '德国',
        angle: '重点比较 E1 打第三名与 E2 打 I2；第一轮赢球后，第二轮平局到 4 分的价值上升。',
        linkedTeam: '法国',
        ownRiskSlot: 'E1/E2',
        avoidSlot: 'I1/I2',
      },
      {
        name: '荷兰',
        angle: '重点联动 C 组，F1 打 C2、F2 打 C1，需等巴西排序后再评估。',
        linkedTeam: '巴西',
        ownRiskSlot: 'F1/F2',
        avoidSlot: 'C1/C2',
      },
      {
        name: '美国',
        angle: '东道主赛程天然有利，先假定不需要控分，一路争胜落 D1；其他队天然倾向避开 D1。',
        linkedTeam: '比利时',
        ownRiskSlot: 'D1/D2',
        avoidSlot: 'G1/G2',
        assumedSlot: 'D1',
        noControlNeeded: true,
      },
      {
        name: '比利时',
        angle: '重点警惕 D/G 联动与美国线路，比较 G1 第三名路线和 G2 打 D2。',
        linkedTeam: '美国',
        ownRiskSlot: 'G1/G2',
        avoidSlot: 'D1/D2',
      },
      {
        name: '西班牙',
        angle: '重点联动 J 组阿根廷，比较 H1 打 J2 与 H2 打 J1 的互避空间。',
        linkedTeam: '阿根廷',
        ownRiskSlot: 'H1',
        avoidSlot: 'J2',
      },
      {
        name: '法国',
        angle: '重点比较 I1 第三名路线与 I2 打 E2，警惕与巴西、德国过早同线。',
        linkedTeam: '德国',
        ownRiskSlot: 'I1/I2',
        avoidSlot: 'E1/E2',
      },
      {
        name: '阿根廷',
        angle: '重点联动 H 组西班牙，比较 J1 打 H2 与 J2 打 H1 的互避空间。',
        linkedTeam: '西班牙',
        ownRiskSlot: 'J1',
        avoidSlot: 'H2',
      },
      {
        name: '葡萄牙',
        angle: '重点比较 K1 打第三名与 K2 打 L2，关注半区强敌密度。',
        linkedTeam: '英格兰',
        ownRiskSlot: 'K1/K2',
        avoidSlot: 'L1/L2',
      },
      {
        name: '英格兰',
        angle: '重点比较 L1 打第三名与 L2 打 K2，强队具备挑半区动机。',
        linkedTeam: '葡萄牙',
        ownRiskSlot: 'L1/L2',
        avoidSlot: 'K1/K2',
      },
    ];
  }

  generateReport() {
    const scheduleData = this.parseScheduleData();
    if (!scheduleData) {
      throw new Error('无法读取世界杯赛程数据');
    }

    const teamMap = this.buildTeamMap(scheduleData.arrTeam);
    const teamIndex = this.buildTeamIndex(scheduleData, teamMap);
    const worldRankingMap = this.loadWorldRankingMap();
    const lines = [];

    lines.push('# 强队视角晋级路线监控\n');
    lines.push('> 每次 `theWorldCup/data/c75.js` 更新后手动刷新。核心是从强队自己的视角，比较小组第一、第二、第三三条路线。\n');
    lines.push(`- 数据更新时间：${scheduleData.lastUpdateTime}`);
    lines.push('- 刷新命令：`cd cup-analyzer/crawler-server && npm run generate:worldcup-routes`');
    lines.push('- 监控重点：两轮后 4 分控位、第三轮选择权、C/F、E/I、H/J、K/L 等联动小组。');
    lines.push('- 美国基准：东道主不按控分模型处理，先假定一路争胜落 D1；其他队路线天然需要警惕并尽量避开 D1。\n');

    this.focusTeams.forEach((focusTeam) => {
      const teamState = teamIndex.get(focusTeam.name);
      if (!teamState) {
        lines.push(`\n## ${focusTeam.name}\n`);
        lines.push('- 当前状态：不可判断（c75.js 未找到该队）');
        return;
      }

      lines.push(this.buildTeamSection(scheduleData, teamMap, teamState, focusTeam, teamIndex, worldRankingMap));
    });

    lines.push('\n## 使用提醒\n');
    lines.push('- 这份报告只回答“强队如果选不同名次，会走哪条路线”，不直接给投注建议。');
    lines.push('- 第三名路线只列候选对手；最终对手取决于 12 个小组第三名的整体组合。');
    lines.push('- 如果球队还没有到 4 分控位，先判断它有没有选择权，再谈挑对手；美国例外，按东道主 D1 基准观察。');

    const outputPath = path.join(config.paths.cupAnalyzer, 'strategy', 'team-route-monitor.md');
    saveMarkdown(outputPath, lines.join('\n'));

    this.log(`强队视角路线监控已生成: ${outputPath}`);
    return { success: true, outputPath };
  }

  buildTeamIndex(scheduleData, teamMap) {
    const index = new Map();

    for (const letter of this.groupLetters) {
      const standings = scheduleData.rounds[`S27970${letter}`];
      if (!standings) {
        throw new Error(`缺少小组 ${letter} 积分榜`);
      }

      standings.forEach((row) => {
        const team = teamMap[row[1]];
        if (!team) {
          throw new Error(`缺少球队信息: ${row[1]}`);
        }

        index.set(team.chineseName, {
          group: letter,
          teamId: row[1],
          teamName: team.chineseName,
          rank: row[0],
          played: row[2],
          won: row[3],
          drawn: row[4],
          lost: row[5],
          goalsFor: row[6],
          goalsAgainst: row[7],
          goalDiff: row[8],
          points: row[9],
        });
      });
    }

    return index;
  }

  loadWorldRankingMap() {
    const rankingPath = path.join(config.paths.cupAnalyzer, 'data', '世界排名.md');
    const content = readFile(rankingPath);
    if (!content) {
      throw new Error(`缺少世界排名文件: ${rankingPath}`);
    }

    const rankingMap = new Map();
    content
      .trim()
      .split('\n')
      .forEach((line) => {
        const match = line.match(/^(\d+)-(.+)$/);
        if (!match) return;

        const rank = Number(match[1]);
        const teamName = match[2].trim();
        rankingMap.set(teamName, rank);
      });

    return rankingMap;
  }

  buildTeamSection(scheduleData, teamMap, teamState, focusTeam, teamIndex, worldRankingMap) {
    const lines = [];
    const choicePower = this.getChoicePower(teamState, focusTeam);
    const nextMatch = this.findNextGroupMatch(scheduleData, teamMap, teamState);
    const paths = this.strategyAnalyzer.analyzeGroupPath(teamState.group);
    const teamMatches = this.getTeamGroupMatches(scheduleData, teamMap, teamState);
    const opponentStrengthMap = this.buildOpponentStrengthMap(teamMatches, worldRankingMap);

    lines.push(`\n## ${teamState.teamName}\n`);
    lines.push('### 当前状态');
    lines.push(`- 小组：${teamState.group}组`);
    lines.push(`- 当前排名：第${teamState.rank}`);
    lines.push(`- 当前积分：${teamState.points}`);
    lines.push(`- 已赛：${teamState.played}`);
    lines.push(`- 净胜球：${teamState.goalDiff}`);
    lines.push(`- 当前选择权：${choicePower.label}`);
    lines.push(`- 核心判断：${choicePower.reason}`);
    lines.push(`- 队伍视角：${focusTeam.angle}`);
    if (focusTeam.assumedSlot) {
      lines.push(`- 基准落位：${focusTeam.assumedSlot}`);
    }

    lines.push('\n### 小组赛赛程强弱顺序');
    lines.push(...this.formatScheduleStrengthLines(teamMatches, opponentStrengthMap, worldRankingMap));

    lines.push('\n### 已赛比赛与控分解读');
    lines.push(...this.formatPlayedMatchLines(teamState, focusTeam, teamMatches, opponentStrengthMap, worldRankingMap));

    lines.push('\n### 信息优势');
    lines.push(...this.formatInformationAdvantageLines(teamState, focusTeam, teamIndex, scheduleData, teamMap));

    lines.push('\n### 过早锁线风险');
    lines.push(...this.formatEarlyRouteLockRiskLines(teamState, focusTeam, teamIndex, scheduleData, teamMap, opponentStrengthMap));

    lines.push('\n### 如果小组第一出线');
    lines.push(...this.formatPathLines(scheduleData, teamMap, paths.first, '第一名', focusTeam));

    lines.push('\n### 如果小组第二出线');
    lines.push(...this.formatPathLines(scheduleData, teamMap, paths.second, '第二名', focusTeam));

    lines.push('\n### 如果小组第三出线');
    lines.push(...this.formatPathLines(scheduleData, teamMap, paths.third, '第三名', focusTeam));

    lines.push('\n### 下一场监控');
    lines.push(...this.formatNextMatchLines(teamState, nextMatch, focusTeam));

    return lines.join('\n');
  }

  getChoicePower(teamState, focusTeam) {
    if (focusTeam.noControlNeeded) {
      return {
        label: '东道主D1基准',
        reason: '美国先不按控分模型处理，假定依靠东道主赛程与主场环境一路争胜，目标落位 D1。',
      };
    }

    if (teamState.played === 0) {
      return {
        label: '未进入选择阶段',
        reason: '小组赛尚未开打，先看第一轮结果，再判断能否走向 4 分控位。',
      };
    }

    if (teamState.played >= 2 && teamState.points === 4) {
      return {
        label: '强选择权（4分控位）',
        reason: '两轮后 4 分，第三轮通常可以通过胜、平、小负影响最终名次。',
      };
    }

    if (teamState.points === 6) {
      return {
        label: '锁定路线',
        reason: '两连胜后出线安全，但小组名次可能更早锁定，挑路线空间反而下降。',
      };
    }

    if (teamState.points === 3) {
      return {
        label: '弱选择权（冲4分）',
        reason: '下一场打平即可到 4 分，若线路压力明显，平局价值会上升。',
      };
    }

    if (teamState.points === 1) {
      return {
        label: '无选择权（先抢4分）',
        reason: '当前只有 1 分，下一场必须赢球才可能进入 4 分控位。',
      };
    }

    if (teamState.points === 0) {
      return {
        label: '无选择权（抢分求生）',
        reason: '当前 0 分，下一场优先目标是保住出线可能，暂时不能谈挑路线。',
      };
    }

    return {
      label: '不可判断',
      reason: `当前积分为 ${teamState.points}，需要结合后续赛果人工判断选择权。`,
    };
  }

  getTeamGroupMatches(scheduleData, teamMap, teamState) {
    const matches = scheduleData.rounds[`G27970${teamState.group}`];
    if (!matches) {
      throw new Error(`缺少 ${teamState.group} 组赛程`);
    }

    return matches
      .filter((match) => this.isTeamInMatch(match, teamState.teamId))
      .sort((a, b) => new Date(a[3]) - new Date(b[3]))
      .map((match, index) => {
        const home = teamMap[match[4]];
        const away = teamMap[match[5]];
        if (!home || !away) {
          throw new Error(`比赛缺少球队信息: ${match[0]}`);
        }

        const isHome = match[4] === teamState.teamId;
        const opponent = isHome ? away : home;

        return {
          matchId: match[0],
          roundIndex: index + 1,
          kickoff: match[3],
          homeId: match[4],
          awayId: match[5],
          homeName: home.chineseName,
          awayName: away.chineseName,
          opponentId: opponent.id,
          opponentName: opponent.chineseName,
          score: match[6],
          finished: this.isMatchFinished(match),
          isHome,
        };
      });
  }

  buildOpponentStrengthMap(teamMatches, worldRankingMap) {
    const rankedOpponents = teamMatches
      .map((match) => {
        const worldRank = worldRankingMap.get(match.opponentName);
        return {
          opponentName: match.opponentName,
          worldRank,
        };
      })
      .filter((item) => item.worldRank !== undefined)
      .sort((a, b) => a.worldRank - b.worldRank);

    const strengthMap = new Map();
    const labels = ['强', '中', '弱'];
    rankedOpponents.forEach((item, index) => {
      strengthMap.set(item.opponentName, {
        label: labels[index],
        opponentOrder: index + 1,
      });
    });

    return strengthMap;
  }

  formatScheduleStrengthLines(teamMatches, opponentStrengthMap, worldRankingMap) {
    const sequence = teamMatches.map((match) => {
      const strength = opponentStrengthMap.get(match.opponentName);
      if (!strength) {
        return '不可判断';
      }

      return strength.label;
    });

    const lines = [];
    lines.push(`- 强弱顺序：${sequence.join('-')}`);

    teamMatches.forEach((match) => {
      const worldRankText = this.formatWorldRank(worldRankingMap, match.opponentName);
      const strengthText = this.formatOpponentStrength(opponentStrengthMap, match.opponentName);
      lines.push(`- 第${match.roundIndex}场：vs ${match.opponentName}（${match.kickoff}，${worldRankText}，${strengthText}）`);
    });

    return lines;
  }

  formatPlayedMatchLines(teamState, focusTeam, teamMatches, opponentStrengthMap, worldRankingMap) {
    const playedMatches = teamMatches.filter((match) => match.finished);
    if (playedMatches.length === 0) {
      return ['- 暂无已赛小组赛。'];
    }

    const lines = [];
    playedMatches.forEach((match) => {
      const result = this.getTeamMatchResult(match);
      const opponentWorldRankText = this.formatWorldRank(worldRankingMap, match.opponentName);
      const teamWorldRankText = this.formatWorldRank(worldRankingMap, teamState.teamName);
      const strengthText = this.formatOpponentStrength(opponentStrengthMap, match.opponentName);
      const groupOrderText = this.formatGroupOrderText(teamState, match.opponentName, worldRankingMap);

      lines.push(`- ${match.homeName} ${match.score} ${match.awayName}：${teamState.teamName}拿到${result.points}分（${result.label}）`);
      lines.push(`  - ${teamState.teamName}${teamWorldRankText}；${match.opponentName}${opponentWorldRankText}。`);
      lines.push(`  - 对手定位：${match.opponentName}${groupOrderText}，也是${teamState.teamName}三场对手里的${strengthText}。`);
      lines.push(`  - 解读：${this.buildControlInterpretation(teamState, focusTeam, match, result, opponentStrengthMap)}`);
    });

    return lines;
  }

  formatInformationAdvantageLines(teamState, focusTeam, teamIndex, scheduleData, teamMap) {
    if (!focusTeam.linkedTeam) {
      return ['- 暂无固定联动观察队；主要根据本组积分和淘汰赛占位人工判断。'];
    }

    const linkedTeamState = teamIndex.get(focusTeam.linkedTeam);
    if (!linkedTeamState) {
      return [`- 联动观察：${focusTeam.linkedTeam}（当前 c75.js 未找到该队）`];
    }

    const teamThirdMatch = this.getNthGroupMatch(scheduleData, teamMap, teamState, 3);
    const linkedThirdMatch = this.getNthGroupMatch(scheduleData, teamMap, linkedTeamState, 3);
    const lines = [];

    lines.push(`- 联动观察：${linkedTeamState.group}组${linkedTeamState.teamName}`);
    lines.push(`- ${linkedTeamState.teamName}第三轮：${linkedThirdMatch.kickoff}`);
    lines.push(`- ${teamState.teamName}第三轮：${teamThirdMatch.kickoff}`);
    lines.push(`- 判断：${this.buildInformationAdvantageText(teamState, linkedTeamState, teamThirdMatch, linkedThirdMatch)}`);

    return lines;
  }

  formatEarlyRouteLockRiskLines(teamState, focusTeam, teamIndex, scheduleData, teamMap, opponentStrengthMap) {
    const teamMatches = this.getTeamGroupMatches(scheduleData, teamMap, teamState);
    const firstMatch = teamMatches[0];
    if (!firstMatch) {
      throw new Error(`${teamState.teamName}缺少首轮小组赛`);
    }

    const lines = [];
    const firstOpponentStrength = this.formatOpponentStrength(opponentStrengthMap, firstMatch.opponentName);
    const linkedRouteRisk = this.resolveLinkedRouteRisk(teamState, focusTeam, teamIndex);
    const firstMatchWeak = this.isWeakOpponentFirstMatch(firstMatch, opponentStrengthMap);

    lines.push(`- 首轮对手：${firstMatch.opponentName}（${firstOpponentStrength}）`);

    if (focusTeam.noControlNeeded) {
      lines.push('- 路线风险：美国按东道主 D1 基准处理，不把首轮大胜视为控分失败或过早锁线问题。');
      lines.push('- 监控结论：美国主线是继续争胜并巩固 D1；其他队需要把 D1 视为天然规避点。');
      return lines;
    }

    if (linkedRouteRisk) {
      lines.push(`- 路线风险：${linkedRouteRisk}`);
    } else {
      lines.push('- 路线风险：暂无固定联动强队风险，主要看本组排名弹性。');
    }

    if (focusTeam.linkedTeam) {
      const linkedTeamState = teamIndex.get(focusTeam.linkedTeam);
      if (!linkedTeamState) {
        throw new Error(`缺少联动球队状态: ${focusTeam.linkedTeam}`);
      }

      const teamThirdMatch = this.getNthGroupMatch(scheduleData, teamMap, teamState, 3);
      const linkedThirdMatch = this.getNthGroupMatch(scheduleData, teamMap, linkedTeamState, 3);
      lines.push(`- 操作空间：${this.buildInformationAdvantageText(teamState, linkedTeamState, teamThirdMatch, linkedThirdMatch)}`);
    }

    if (!firstMatch.finished && firstMatchWeak) {
      lines.push('- 监控结论：首轮可以赢，但不宜过早把净胜球优势刷得过大；更理想的是先拿 3 分，保留第二轮和第三轮的控位弹性。');
      return lines;
    }

    if (!firstMatch.finished) {
      lines.push('- 监控结论：首轮不是弱档对手，先看结果和积分弹性，再判断是否存在过早锁线。');
      return lines;
    }

    const result = this.getTeamMatchResult(firstMatch);
    const margin = this.getTeamGoalMargin(firstMatch);

    if (firstMatchWeak && result.points === 3 && this.isBigWinRiskScore(margin)) {
      lines.push(`- 已触发风险：首轮对弱档对手净胜${margin}球，路线可能更早锁定；后续如果联动强队爆冷落位，本队可操作空间会下降。`);
      return lines;
    }

    if (firstMatchWeak && result.points === 3) {
      lines.push(`- 监控结论：首轮对弱档对手赢球但未达到大胜阈值，暂未明显锁死路线；继续看第二轮是否主动控到 4 分。`);
      return lines;
    }

    if (firstMatchWeak && result.points !== 3) {
      lines.push('- 监控结论：首轮对弱档对手未赢，过早锁线风险下降，但抢分压力上升。');
      return lines;
    }

    lines.push('- 监控结论：首轮不是弱档大胜场景，暂不标记过早锁线风险。');
    return lines;
  }

  isWeakOpponentFirstMatch(firstMatch, opponentStrengthMap) {
    const strength = opponentStrengthMap.get(firstMatch.opponentName);
    if (!strength) {
      return false;
    }

    return strength.label === '弱';
  }

  isBigWinRiskScore(goalMargin) {
    return goalMargin >= 3;
  }

  resolveLinkedRouteRisk(teamState, focusTeam, teamIndex) {
    if (!focusTeam.linkedTeam) {
      return null;
    }

    const linkedTeamState = teamIndex.get(focusTeam.linkedTeam);
    if (!linkedTeamState) {
      throw new Error(`缺少联动球队状态: ${focusTeam.linkedTeam}`);
    }

    if (focusTeam.ownRiskSlot && focusTeam.avoidSlot) {
      return `${teamState.teamName}若过早锁在 ${focusTeam.ownRiskSlot}，而${linkedTeamState.teamName}爆冷落到 ${focusTeam.avoidSlot}，则对应路线可能提前相遇。`;
    }

    return `${teamState.teamName}需要观察${linkedTeamState.teamName}最终落在 ${linkedTeamState.group}1/${linkedTeamState.group}2/${linkedTeamState.group}3 后，再判断自己的路线选择。`;
  }

  getTeamGoalMargin(match) {
    if (!match.finished) {
      throw new Error(`比赛尚未完赛: ${match.matchId}`);
    }

    const [homeScoreText, awayScoreText] = match.score.split('-');
    const homeScore = Number(homeScoreText);
    const awayScore = Number(awayScoreText);

    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      throw new Error(`比分格式无法解析: ${match.score}`);
    }

    if (match.isHome) {
      return homeScore - awayScore;
    }

    return awayScore - homeScore;
  }

  getNthGroupMatch(scheduleData, teamMap, teamState, n) {
    const teamMatches = this.getTeamGroupMatches(scheduleData, teamMap, teamState);
    const targetMatch = teamMatches[n - 1];
    if (!targetMatch) {
      throw new Error(`${teamState.teamName}缺少第${n}场小组赛`);
    }

    return targetMatch;
  }

  getTeamMatchResult(match) {
    if (!match.finished) {
      throw new Error(`比赛尚未完赛: ${match.matchId}`);
    }

    const [homeScoreText, awayScoreText] = match.score.split('-');
    const homeScore = Number(homeScoreText);
    const awayScore = Number(awayScoreText);

    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      throw new Error(`比分格式无法解析: ${match.score}`);
    }

    const teamScore = match.isHome ? homeScore : awayScore;
    const opponentScore = match.isHome ? awayScore : homeScore;

    if (teamScore > opponentScore) {
      return { label: '胜', points: 3 };
    }

    if (teamScore === opponentScore) {
      return { label: '平', points: 1 };
    }

    return { label: '负', points: 0 };
  }

  formatWorldRank(worldRankingMap, teamName) {
    const worldRank = worldRankingMap.get(teamName);
    if (worldRank === undefined) {
      return '世界排名不可判断';
    }

    return `世界排名第${worldRank}`;
  }

  formatOpponentStrength(opponentStrengthMap, opponentName) {
    const strength = opponentStrengthMap.get(opponentName);
    if (!strength) {
      return '强弱档不可判断';
    }

    return `${strength.label}档对手`;
  }

  formatGroupOrderText(teamState, opponentName, worldRankingMap) {
    const standings = this.getStandingsForGroupOrder(teamState.group);
    const rankedTeams = standings
      .map((teamName) => {
        const worldRank = worldRankingMap.get(teamName);
        return { teamName, worldRank };
      })
      .filter((item) => item.worldRank !== undefined)
      .sort((a, b) => a.worldRank - b.worldRank);

    const opponentIndex = rankedTeams.findIndex((item) => item.teamName === opponentName);
    if (opponentIndex === -1) {
      return '在本组世界排名顺位不可判断';
    }

    return `是${teamState.group}组按世界排名第${opponentIndex + 1}强`;
  }

  getStandingsForGroupOrder(group) {
    if (!this.cachedScheduleDataForGroupOrder) {
      this.cachedScheduleDataForGroupOrder = this.parseScheduleData();
    }

    const standings = this.getStandings(this.cachedScheduleDataForGroupOrder, group);
    const teamMap = this.buildTeamMap(this.cachedScheduleDataForGroupOrder.arrTeam);
    return standings.map((row) => {
      const team = teamMap[row[1]];
      if (!team) {
        throw new Error(`缺少 ${group} 组球队信息: ${row[1]}`);
      }

      return team.chineseName;
    });
  }

  buildControlInterpretation(teamState, focusTeam, match, result, opponentStrengthMap) {
    if (focusTeam.noControlNeeded) {
      if (result.points === 3) {
        return `${teamState.teamName}按东道主 D1 基准处理，赢球符合一路争胜逻辑，不按 4 分控位解释。`;
      }

      return `${teamState.teamName}按东道主 D1 基准处理，若丢分则优先观察是否影响 D1 主线，而不是转入主动控分。`;
    }

    const strength = opponentStrengthMap.get(match.opponentName);
    if (!strength) {
      return '对手强弱档不可判断，只记录赛果，不做控分解读。';
    }

    if (result.points === 1 && match.roundIndex === 1 && (strength.label === '强' || strength.label === '中')) {
      return '第一场面对组内强竞争者先拿平局，保留第二轮赢球冲到 4 分的空间，是典型 4 分控位观察点。';
    }

    if (result.points === 3 && match.roundIndex === 1) {
      return '第一场赢球后，第二轮打平即可到 4 分；若路线压力明显，平局价值会上升。';
    }

    if (result.points === 3) {
      return '赢球提升出线安全度，但如果过早到 6 分，第三轮路线选择空间可能下降。';
    }

    if (result.points === 1) {
      return '平局保留积分弹性，但下一场需要结合对手强弱判断是否必须抢到 4 分。';
    }

    return '输球会削弱主动挑路线能力，下一场优先目标转为抢分。';
  }

  buildInformationAdvantageText(teamState, linkedTeamState, teamThirdMatch, linkedThirdMatch) {
    const teamTime = new Date(teamThirdMatch.kickoff).getTime();
    const linkedTime = new Date(linkedThirdMatch.kickoff).getTime();

    if (teamTime > linkedTime) {
      return `${teamState.teamName}后打，可以先看${linkedTeamState.teamName}最终落在 ${linkedTeamState.group}1/${linkedTeamState.group}2/${linkedTeamState.group}3，再评估自己争 ${teamState.group}1 还是 ${teamState.group}2。`;
    }

    if (teamTime < linkedTime) {
      return `${teamState.teamName}先打，无法完全等待${linkedTeamState.teamName}落位，第三轮更依赖赛前预判。`;
    }

    return `${teamState.teamName}与${linkedTeamState.teamName}第三轮同一时间段开赛，信息优势有限，主要看赛前已有积分形势。`;
  }

  findNextGroupMatch(scheduleData, teamMap, teamState) {
    const matches = scheduleData.rounds[`G27970${teamState.group}`];
    if (!matches) {
      throw new Error(`缺少 ${teamState.group} 组赛程`);
    }

    const nextMatches = matches
      .filter((match) => this.isTeamInMatch(match, teamState.teamId))
      .filter((match) => !this.isMatchFinished(match))
      .sort((a, b) => new Date(a[3]) - new Date(b[3]));

    if (nextMatches.length === 0) {
      return null;
    }

    const match = nextMatches[0];
    const home = teamMap[match[4]];
    const away = teamMap[match[5]];
    if (!home || !away) {
      throw new Error(`下一场比赛缺少球队信息: ${match[0]}`);
    }

    return {
      matchId: match[0],
      kickoff: match[3],
      homeName: home.chineseName,
      awayName: away.chineseName,
      opponentName: match[4] === teamState.teamId ? away.chineseName : home.chineseName,
    };
  }

  isTeamInMatch(match, teamId) {
    return match[4] === teamId || match[5] === teamId;
  }

  isMatchFinished(match) {
    return match[2] === -1 && typeof match[6] === 'string' && match[6] !== '';
  }

  formatPathLines(scheduleData, teamMap, paths, positionLabel, focusTeam) {
    if (paths.length === 0) {
      return [`- 32强：不可判断（没有找到${positionLabel}路径）`];
    }

    return paths.map((pathInfo) => {
      const bracket = this.formatBracket(pathInfo.bracket);
      const details = [`32强：vs ${pathInfo.opponent}`, `半区：${bracket}`, `时间：${pathInfo.time}`];
      const opponentDetails = this.resolveOpponentSlot(scheduleData, teamMap, pathInfo.opponent);

      if (pathInfo.condition) {
        details.push(pathInfo.condition);
      }

      if (opponentDetails) {
        details.push(opponentDetails);
      }

      const usaAvoidanceText = this.resolveUsaD1AvoidanceText(pathInfo.opponent, focusTeam);
      if (usaAvoidanceText) {
        details.push(usaAvoidanceText);
      }

      return `- ${details.join('；')}`;
    });
  }

  resolveUsaD1AvoidanceText(opponentSlot, focusTeam) {
    if (focusTeam.noControlNeeded) {
      return null;
    }

    if (opponentSlot === 'D1') {
      return '美国D1避让：按东道主D1基准，这是天然高规避路线';
    }

    if (opponentSlot === 'D2') {
      return '美国D1避让：若美国如预期落D1，则D2不是美国本队';
    }

    if (opponentSlot === '3rd_BEFIJ') {
      return '美国D1避让：D1按美国基准时，该第三名路线会直接撞美国';
    }

    return null;
  }

  resolveOpponentSlot(scheduleData, teamMap, slot) {
    const directRankMatch = slot.match(/^([A-L])([12])$/);
    if (directRankMatch) {
      const group = directRankMatch[1];
      const rank = Number(directRankMatch[2]);
      const standings = this.getStandings(scheduleData, group);
      const currentTeam = standings.find((row) => row[0] === rank);
      if (!currentTeam) {
        throw new Error(`缺少 ${group}${rank} 当前占位`);
      }

      const team = teamMap[currentTeam[1]];
      if (!team) {
        throw new Error(`缺少 ${group}${rank} 球队信息: ${currentTeam[1]}`);
      }

      return `当前占位：${team.chineseName}（${group}组第${rank}）`;
    }

    if (slot.startsWith('3rd_')) {
      const groups = slot.replace('3rd_', '').split('');
      const candidates = groups.map((group) => {
        const standings = this.getStandings(scheduleData, group);
        const currentThird = standings.find((row) => row[0] === 3);
        if (!currentThird) {
          throw new Error(`缺少 ${group}3 当前占位`);
        }

        const team = teamMap[currentThird[1]];
        if (!team) {
          throw new Error(`缺少 ${group}3 球队信息: ${currentThird[1]}`);
        }

        return `${group}3-${team.chineseName}`;
      });

      return `当前第三名候选：${candidates.join(' / ')}`;
    }

    return null;
  }

  getStandings(scheduleData, group) {
    const standings = scheduleData.rounds[`S27970${group}`];
    if (!standings) {
      throw new Error(`缺少 ${group} 组积分榜`);
    }

    return standings;
  }

  formatBracket(bracket) {
    if (bracket === 'upper') {
      return '上半区';
    }

    if (bracket === 'lower') {
      return '下半区';
    }

    return '不可判断';
  }

  formatNextMatchLines(teamState, nextMatch, focusTeam) {
    if (!nextMatch) {
      return ['- 下一场：无（小组赛已完成或未找到未赛比赛）'];
    }

    const lines = [];
    lines.push(`- 下一场：${nextMatch.homeName} vs ${nextMatch.awayName}（${nextMatch.kickoff}）`);
    lines.push(`- 对手：${nextMatch.opponentName}`);

    if (focusTeam.noControlNeeded) {
      lines.push('- 基准：美国不按控分模型处理，下一场继续按争胜和巩固 D1 观察。');
      lines.push('- 若胜：D1 主线增强，其他队继续把 D1 视为天然规避点。');
      lines.push('- 若平/负：再评估 D1 是否动摇，但不先假定美国主动控分。');
      return lines;
    }

    if (teamState.points === 1) {
      lines.push('- 若胜：到 4 分，进入路线选择窗口。');
      lines.push('- 若平/负：主动挑路线能力继续下降。');
      return lines;
    }

    if (teamState.points === 3) {
      lines.push('- 若平：到 4 分，第三轮选择权增强。');
      lines.push('- 若胜：到 6 分，出线安全但路线可能更早锁定。');
      lines.push('- 若负：停在 3 分，第三轮压力上升。');
      return lines;
    }

    if (teamState.played >= 2 && teamState.points === 4) {
      lines.push('- 当前已是 4 分控位，下一场重点看胜/平/小负分别对应的小组名次。');
      return lines;
    }

    if (teamState.points === 0) {
      if (teamState.played === 0) {
        lines.push('- 若胜：拿到 3 分，第二轮可观察是否需要冲 4 分控位。');
        lines.push('- 若平：拿到 1 分，第二轮必须赢才可能进入 4 分控位。');
        lines.push('- 若负：0 分开局，第二轮优先抢分，挑路线空间下降。');
        return lines;
      }

      lines.push('- 若胜：回到 3 分，仍需继续抢分。');
      lines.push('- 若平/负：出线主动权明显下降。');
      return lines;
    }

    lines.push('- 需要结合本组另一场结果人工判断下一步选择权。');
    return lines;
  }
}

if (require.main === module) {
  const monitor = new WorldCupTeamRouteMonitor();
  try {
    monitor.generateReport();
  } catch (err) {
    monitor.error(err.message);
    process.exit(1);
  }
}

module.exports = WorldCupTeamRouteMonitor;
