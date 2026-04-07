const path = require('path');
const BaseCrawler = require('../crawlers/base');
const config = require('../config');
const { saveMarkdown, readFile } = require('../utils/fileWriter');

/**
 * 策略分析器 - 世界杯独特策略分析
 *
 * 包含：小组出线路径计算、挑对手逻辑、默契球检测、赛程疲劳度
 */
class StrategyAnalyzer extends BaseCrawler {
  constructor() {
    super('StrategyAnalyzer');

    // 32强对阵规则 (from 16th-finals-rule.md)
    this.knockoutBracket = {
      upper: [
        { matchNum: 1, home: 'A2', away: 'B2', time: '2026-06-29 03:00' },
        { matchNum: 2, home: 'C1', away: 'F2', time: '2026-06-30 01:00' },
        { matchNum: 3, home: 'E1', away: '3rd_ABCDF', time: '2026-06-30 04:30' },
        { matchNum: 5, home: 'E2', away: 'I2', time: '2026-07-01 01:00' },
        { matchNum: 9, home: 'G1', away: '3rd_AEHIJ', time: '2026-07-02 04:00' },
        { matchNum: 10, home: 'D1', away: '3rd_BEFIJ', time: '2026-07-02 08:00' },
        { matchNum: 11, home: 'H1', away: 'J2', time: '2026-07-03 03:00' },
        { matchNum: 12, home: 'K2', away: 'L2', time: '2026-07-03 07:00' },
      ],
      lower: [
        { matchNum: 4, home: 'F1', away: 'C2', time: '2026-06-30 09:00' },
        { matchNum: 6, home: 'I1', away: '3rd_CDFGH', time: '2026-07-01 05:00' },
        { matchNum: 7, home: 'A1', away: '3rd_CEFHI', time: '2026-07-01 09:00' },
        { matchNum: 8, home: 'L1', away: '3rd_EHIJK', time: '2026-07-02 00:00' },
        { matchNum: 13, home: 'B1', away: '3rd_EFGIJ', time: '2026-07-03 11:00' },
        { matchNum: 14, home: 'D2', away: 'G2', time: '2026-07-04 02:00' },
        { matchNum: 15, home: 'J1', away: 'H2', time: '2026-07-04 06:00' },
        { matchNum: 16, home: 'K1', away: '3rd_DEIJL', time: '2026-07-04 09:30' },
      ],
    };
  }

  /**
   * 分析小组出线路径 - 计算各种名次对应的淘汰赛路径
   */
  analyzeGroupPath(groupLetter) {
    const paths = { first: [], second: [], third: [] };

    // 小组第一的路径
    for (const bracket of ['upper', 'lower']) {
      for (const match of this.knockoutBracket[bracket]) {
        if (match.home === `${groupLetter}1`) {
          paths.first.push({
            round: '32强',
            bracket,
            matchNum: match.matchNum,
            opponent: match.away,
            time: match.time,
          });
        }
      }
    }

    // 小组第二的路径
    for (const bracket of ['upper', 'lower']) {
      for (const match of this.knockoutBracket[bracket]) {
        if (match.home === `${groupLetter}2` || match.away === `${groupLetter}2`) {
          paths.second.push({
            round: '32强',
            bracket,
            matchNum: match.matchNum,
            opponent: match.home === `${groupLetter}2` ? match.away : match.home,
            time: match.time,
          });
        }
      }
    }

    // 小组第三的路径（复杂，涉及多种可能）
    for (const bracket of ['upper', 'lower']) {
      for (const match of this.knockoutBracket[bracket]) {
        if (match.away && match.away.startsWith('3rd_') && match.away.includes(groupLetter)) {
          paths.third.push({
            round: '32强',
            bracket,
            matchNum: match.matchNum,
            opponent: match.home,
            condition: `作为小组第三从 ${match.away.replace('3rd_', '')} 组合中出线`,
            time: match.time,
          });
        }
      }
    }

    return paths;
  }

  /**
   * 检测默契球风险 - 分析小组赛最后一轮
   */
  detectTacitMatchRisk(groupLetter, scheduleData) {
    const matchKey = `G27970${groupLetter}`;
    const matches = scheduleData.rounds[matchKey];
    if (!matches) return null;

    const teamMap = this.buildTeamMap(scheduleData.arrTeam);

    // 最后一轮（第5、6场，同时开赛）
    const lastRoundMatches = matches.slice(4, 6);
    if (lastRoundMatches.length < 2) return null;

    const time1 = lastRoundMatches[0][3];
    const time2 = lastRoundMatches[1][3];
    const simultaneousKickoff = time1 === time2;

    const risks = [];

    if (simultaneousKickoff) {
      risks.push({
        type: 'simultaneous_kickoff',
        description: '同时开赛，降低默契球风险',
        level: 'low',
      });
    } else {
      risks.push({
        type: 'sequential_kickoff',
        description: '非同时开赛，后开赛的球队知道另一场结果',
        level: 'medium',
      });
    }

    return {
      group: groupLetter,
      lastRoundMatches: lastRoundMatches.map((m) => ({
        matchId: m[0],
        home: teamMap[m[4]]?.chineseName || m[4],
        away: teamMap[m[5]]?.chineseName || m[5],
        kickoff: m[3],
      })),
      simultaneousKickoff,
      risks,
    };
  }

  /**
   * 计算赛程疲劳度
   */
  calculateFatigueSchedule(scheduleData) {
    const teamMap = this.buildTeamMap(scheduleData.arrTeam);
    const teamSchedules = {};

    // 收集每个队的比赛时间
    for (const [key, matches] of Object.entries(scheduleData.rounds)) {
      if (!Array.isArray(matches)) continue;
      for (const match of matches) {
        if (!match[3]) continue;
        const homeId = match[4];
        const awayId = match[5];
        const kickoff = match[3];

        [homeId, awayId].forEach((teamId) => {
          const teamName = teamMap[teamId]?.chineseName;
          if (!teamName || teamId >= 36185) return;
          if (!teamSchedules[teamName]) teamSchedules[teamName] = [];
          teamSchedules[teamName].push({
            matchId: match[0],
            kickoff,
            stage: key,
            isHome: teamId === homeId,
          });
        });
      }
    }

    // 计算间隔天数
    const fatigueReport = {};
    for (const [teamName, schedule] of Object.entries(teamSchedules)) {
      const sorted = schedule.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
      const gaps = [];
      for (let i = 1; i < sorted.length; i++) {
        const days = (new Date(sorted[i].kickoff) - new Date(sorted[i - 1].kickoff)) / (1000 * 60 * 60 * 24);
        gaps.push({
          from: sorted[i - 1].kickoff,
          to: sorted[i].kickoff,
          days: parseFloat(days.toFixed(1)),
          tight: days <= 3,
        });
      }
      fatigueReport[teamName] = {
        matchCount: sorted.length,
        schedule: sorted,
        gaps,
        tightGapCount: gaps.filter((g) => g.tight).length,
        avgGap: gaps.length ? parseFloat((gaps.reduce((a, b) => a + b.days, 0) / gaps.length).toFixed(1)) : 0,
      };
    }

    return fatigueReport;
  }

  /**
   * 识别保留实力风险
   */
  identifyRotationRisk(groupLetter, roundNumber, scheduleData) {
    const standingKey = `S27970${groupLetter}`;
    const standings = scheduleData.rounds[standingKey];
    if (!standings) return null;

    const teamMap = this.buildTeamMap(scheduleData.arrTeam);
    const risks = [];

    standings.forEach((row) => {
      const teamId = row[1];
      const teamName = teamMap[teamId]?.chineseName || String(teamId);
      const points = row[2] || 0;
      const played = row[3] || 0;

      if (roundNumber === 3) {
        if (points >= 6 && played >= 2) {
          risks.push({
            team: teamName,
            type: 'already_qualified',
            description: `${teamName}已提前出线(${points}分/${played}场)，第3轮可能保留实力`,
            level: 'high',
          });
        }
        if (points === 0 && played >= 2) {
          risks.push({
            team: teamName,
            type: 'already_eliminated',
            description: `${teamName}已提前淘汰(${points}分/${played}场)，第3轮可能无战意`,
            level: 'high',
          });
        }
      }

      if (roundNumber === 2 && points >= 3) {
        risks.push({
          team: teamName,
          type: 'favorable_position',
          description: `${teamName}处于有利位置(${points}分)，第2轮可能考虑挑对手`,
          level: 'medium',
        });
      }
    });

    return risks;
  }

  /**
   * 生成完整策略分析报告
   */
  async generateFullReport() {
    const scheduleData = this.parseScheduleData();
    if (!scheduleData) {
      this.error('无法读取赛程数据');
      return null;
    }

    const strategyDir = path.join(config.paths.cupAnalyzer, 'strategy');

    // 1. 小组出线路径分析
    this.generateGroupPathReport(strategyDir);

    // 2. 挑对手策略
    this.generateOpponentSelectionReport(strategyDir, scheduleData);

    // 3. 默契球风险
    this.generateTacitMatchReport(strategyDir, scheduleData);

    // 4. 赛程疲劳度
    this.generateFatigueReport(strategyDir, scheduleData);

    // 5. README
    this.generateStrategyReadme(strategyDir);

    this.log('策略分析报告生成完成');
    return { success: true };
  }

  generateGroupPathReport(strategyDir) {
    const lines = [];
    lines.push('# 小组出线路径分析\n');
    lines.push('> 基于2026世界杯48队赛制，分析各小组不同名次的淘汰赛路径\n');

    for (const letter of 'ABCDEFGHIJKL') {
      const paths = this.analyzeGroupPath(letter);
      lines.push(`\n## 小组 ${letter}\n`);

      lines.push('### 小组第一');
      paths.first.forEach((p) => {
        lines.push(`- 32强: vs ${p.opponent} (${p.bracket === 'upper' ? '上半区' : '下半区'}, ${p.time})`);
      });

      lines.push('\n### 小组第二');
      paths.second.forEach((p) => {
        lines.push(`- 32强: vs ${p.opponent} (${p.bracket === 'upper' ? '上半区' : '下半区'}, ${p.time})`);
      });

      lines.push('\n### 小组第三（最佳第三出线）');
      if (paths.third.length === 0) {
        lines.push('- 无直接对位（取决于哪些小组第三出线）');
      } else {
        paths.third.forEach((p) => {
          lines.push(`- 可能32强: vs ${p.opponent} (${p.bracket === 'upper' ? '上半区' : '下半区'}, ${p.condition})`);
        });
      }
    }

    saveMarkdown(path.join(strategyDir, 'group-path-analysis.md'), lines.join('\n'));
  }

  generateOpponentSelectionReport(strategyDir, scheduleData) {
    const teamMap = this.buildTeamMap(scheduleData.arrTeam);
    const lines = [];
    lines.push('# 挑对手策略分析\n');
    lines.push('> 世界杯小组赛第2、3轮，强队可能通过控制比分来选择更有利的淘汰赛路径\n');

    lines.push('\n## 核心逻辑\n');
    lines.push('1. 小组第1名 vs 小组第2名的淘汰赛路径不同（上/下半区）');
    lines.push('2. 冠军级球队会倾向于选择更弱的半区路径');
    lines.push('3. 第3轮两场同时开赛，但如果某队已锁定出线，可能控制比分\n');

    lines.push('\n## 各小组分析要点\n');
    lines.push('> 需结合实际比赛结果动态更新\n');

    for (const letter of 'ABCDEFGHIJKL') {
      const paths = this.analyzeGroupPath(letter);
      const standingKey = `S27970${letter}`;
      const standings = scheduleData.rounds[standingKey];

      lines.push(`\n### 小组 ${letter}\n`);
      if (standings) {
        lines.push('| 球队 | 第一名路径 | 第二名路径 |');
        lines.push('|------|-----------|-----------|');
        standings.forEach((row) => {
          const name = teamMap[row[1]]?.chineseName || String(row[1]);
          const firstPath = paths.first[0] ? `vs ${paths.first[0].opponent}` : '-';
          const secondPath = paths.second[0] ? `vs ${paths.second[0].opponent}` : '-';
          lines.push(`| ${name} | ${firstPath} | ${secondPath} |`);
        });
      }
    }

    saveMarkdown(path.join(strategyDir, 'opponent-selection.md'), lines.join('\n'));
  }

  generateTacitMatchReport(strategyDir, scheduleData) {
    const lines = [];
    lines.push('# 默契球风险识别\n');
    lines.push('> 分析小组赛最后一轮可能出现的默契球场景\n');

    lines.push('\n## 检测条件\n');
    lines.push('1. 同组最后一轮，两场比赛是否同时开赛');
    lines.push('2. 某个特定比分对双方都有利（如双方都出线）');
    lines.push('3. 双方无历史仇恨、无利益冲突');
    lines.push('4. 已确定出线/淘汰的队伍可能配合演戏\n');

    lines.push('\n## 各小组最后一轮分析\n');

    for (const letter of 'ABCDEFGHIJKL') {
      const risk = this.detectTacitMatchRisk(letter, scheduleData);
      if (!risk) continue;

      lines.push(`\n### 小组 ${letter}\n`);
      risk.lastRoundMatches.forEach((m) => {
        lines.push(`- ${m.home} vs ${m.away} (${m.kickoff})`);
      });
      lines.push(`- **同时开赛**: ${risk.simultaneousKickoff ? '是' : '否'}`);
      risk.risks.forEach((r) => {
        lines.push(`- **风险等级**: ${r.level} - ${r.description}`);
      });
      lines.push('\n> 需根据前两轮结果动态评估具体默契球场景');
    }

    saveMarkdown(path.join(strategyDir, 'tacit-match-detection.md'), lines.join('\n'));
  }

  generateFatigueReport(strategyDir, scheduleData) {
    const fatigue = this.calculateFatigueSchedule(scheduleData);
    const lines = [];
    lines.push('# 赛程疲劳度分析\n');
    lines.push('> 分析各队比赛间隔，识别背靠背紧密赛程\n');
    lines.push('> 2026世界杯横跨美国/加拿大/墨西哥三国，旅行距离也是重要因素\n');

    lines.push('\n## 小组赛赛程概览\n');
    lines.push('| 球队 | 小组赛场次 | 平均间隔(天) | 紧密赛程(≤3天) |');
    lines.push('|------|-----------|-------------|----------------|');

    const entries = Object.entries(fatigue)
      .filter(([, data]) => data.matchCount >= 3)
      .sort((a, b) => a[1].avgGap - b[1].avgGap);

    entries.forEach(([team, data]) => {
      const tightLabel = data.tightGapCount > 0 ? `${data.tightGapCount}次 ⚠️` : '无';
      lines.push(`| ${team} | ${data.matchCount} | ${data.avgGap} | ${tightLabel} |`);
    });

    lines.push('\n## 注意事项\n');
    lines.push('- 间隔 ≤ 3天: 体能影响大，主力轮换概率高');
    lines.push('- 间隔 4天: 正常恢复周期');
    lines.push('- 间隔 ≥ 5天: 充分恢复');
    lines.push('- 跨时区旅行会加重疲劳（美东 vs 美西 vs 墨西哥）');

    saveMarkdown(path.join(strategyDir, 'fatigue-schedule.md'), lines.join('\n'));
  }

  generateStrategyReadme(strategyDir) {
    const lines = [];
    lines.push('# 世界杯策略分析\n');
    lines.push('> 2026世界杯独特的策略分析框架\n');
    lines.push('\n## 文件说明\n');
    lines.push('| 文件 | 内容 |');
    lines.push('|------|------|');
    lines.push('| group-path-analysis.md | 12个小组不同名次的淘汰赛路径分析 |');
    lines.push('| opponent-selection.md | 强队在第2、3轮挑对手的策略分析 |');
    lines.push('| tacit-match-detection.md | 小组赛最后一轮默契球风险识别 |');
    lines.push('| fatigue-schedule.md | 各队赛程间隔和疲劳度分析 |');
    lines.push('\n## 使用方式\n');
    lines.push('1. 赛前: 阅读 group-path-analysis.md 了解各小组出线路径');
    lines.push('2. 第1轮结束后: 更新 opponent-selection.md，分析强队第2轮策略');
    lines.push('3. 第2轮结束后: 更新 tacit-match-detection.md，评估第3轮默契球风险');
    lines.push('4. 每轮开始前: 查看 fatigue-schedule.md 评估轮换可能性');

    saveMarkdown(path.join(strategyDir, 'README.md'), lines.join('\n'));
  }
}

// CLI 模式
if (require.main === module) {
  const analyzer = new StrategyAnalyzer();
  analyzer.generateFullReport().catch(console.error);
}

module.exports = StrategyAnalyzer;
