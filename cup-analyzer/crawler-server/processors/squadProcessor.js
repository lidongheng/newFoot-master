const path = require('path');
const fs = require('fs');
const BaseCrawler = require('../crawlers/base');
const config = require('../config');
const { readJSON, saveMarkdown, fileExists } = require('../utils/fileWriter');

/**
 * 大名单处理器 - 将 JSON 球员数据清洗并生成按小组分类的 Markdown 文件
 *
 * 输入: output/player_center/{teamSerial}.json
 * 输出: cup-analyzer/theWorldCup/squad/group-X/{队名}.md
 */
class SquadProcessor extends BaseCrawler {
  constructor() {
    super('SquadProcessor');
  }

  /**
   * 将位置代码标准化为位置缩写
   */
  normalizePosition(position) {
    const posMap = {
      '门将': 'GK',
      '守门员': 'GK',
      '右后卫': 'RB',
      '左后卫': 'LB',
      '中后卫': 'CB',
      '右中后卫': 'RCB',
      '左中后卫': 'LCB',
      '右翼卫': 'RWB',
      '左翼卫': 'LWB',
      '后腰': 'CDM',
      '左边后腰': 'LDM',
      '右边后腰': 'RDM',
      '前腰': 'CAM',
      '右前腰': 'RAM',
      '左前腰': 'LAM',
      '右中场': 'RM',
      '左中场': 'LM',
      '中前卫': 'CM',
      '中锋': 'ST',
      '左边锋': 'LW',
      '右边锋': 'RW',
      '影锋': 'CF',
      '前锋': 'ST',
    };
    return posMap[position] || position || '未知';
  }

  /**
   * 解析身价字符串为数值（万欧元）
   */
  parseMarketValue(valueStr) {
    if (!valueStr) return 0;
    const str = valueStr.replace(/,/g, '');
    const match = str.match(/([\d.]+)/);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    if (str.includes('亿')) return num * 10000;
    return num;
  }

  /**
   * 生成单个球队的 Markdown 大名单
   */
  generateSquadMarkdown(teamInfo, players) {
    const lines = [];
    lines.push(`# ${teamInfo.chineseName}（${teamInfo.englishName}）26人大名单\n`);
    lines.push(`> 球队ID: ${teamInfo.id} | 数据来源: titan007\n`);

    const groups = {
      GK: { label: '门将', players: [] },
      DF: { label: '后卫', players: [] },
      MF: { label: '中场', players: [] },
      FW: { label: '前锋', players: [] },
    };

    players.forEach((p) => {
      const group = groups[p.positionGroup] || groups.MF;
      group.players.push(p);
    });

    for (const [, group] of Object.entries(groups)) {
      if (group.players.length === 0) continue;
      lines.push(`\n## ${group.label}（${group.players.length}人）\n`);
      lines.push('| 球衣号 | 姓名 | 年龄 | 身高 | 位置 | 身价(万) | 国籍 |');
      lines.push('|--------|------|------|------|------|----------|------|');
      group.players.forEach((p) => {
        const pos = this.normalizePosition(p.position);
        lines.push(
          `| ${p.number || '-'} | ${p.name} | ${p.age || '-'} | ${p.height ? p.height + 'cm' : '-'} | ${pos} | ${p.marketValue || '-'} | ${p.nationality || '-'} |`
        );
      });
    }

    // 统计摘要
    const validAges = players.filter((p) => p.age).map((p) => p.age);
    const validHeights = players.filter((p) => p.height).map((p) => p.height);
    const avgAge = validAges.length ? (validAges.reduce((a, b) => a + b, 0) / validAges.length).toFixed(1) : '-';
    const avgHeight = validHeights.length
      ? (validHeights.reduce((a, b) => a + b, 0) / validHeights.length).toFixed(1)
      : '-';

    lines.push('\n## 统计摘要\n');
    lines.push(`- **总人数**: ${players.length}`);
    lines.push(`- **平均年龄**: ${avgAge}岁`);
    lines.push(`- **平均身高**: ${avgHeight}cm`);
    lines.push(`- **位置分布**: 门将${groups.GK.players.length} / 后卫${groups.DF.players.length} / 中场${groups.MF.players.length} / 前锋${groups.FW.players.length}`);

    return lines.join('\n');
  }

  /**
   * 处理所有球队，按小组生成 Markdown
   */
  async processAll() {
    const scheduleData = this.parseScheduleData();
    if (!scheduleData) {
      this.error('无法读取赛程数据');
      return null;
    }

    const teamMap = this.buildTeamMap(scheduleData.arrTeam);
    const groupMap = this.buildGroupMap(scheduleData);
    const results = { success: [], failed: [], noData: [] };

    for (const [letter, group] of Object.entries(groupMap)) {
      this.log(`处理小组 ${letter}...`);

      for (const team of group.teams) {
        const jsonPath = path.join(config.paths.playerCenter, `${team.teamId}.json`);

        if (!fileExists(jsonPath)) {
          this.log(`  ${team.chineseName}(${team.teamId}) 无球员数据`);
          results.noData.push(team);
          continue;
        }

        try {
          const players = readJSON(jsonPath);
          const teamInfo = teamMap[team.teamId] || { id: team.teamId, chineseName: team.chineseName, englishName: team.englishName || '' };
          const md = this.generateSquadMarkdown(teamInfo, players);
          const mdPath = path.join(config.paths.cupAnalyzer, 'squad', `group-${letter}`, `${teamInfo.chineseName}.md`);
          saveMarkdown(mdPath, md);
          results.success.push({ team: teamInfo.chineseName, group: letter });
        } catch (err) {
          this.error(`  ${team.chineseName} 处理失败: ${err.message}`);
          results.failed.push(team);
        }
      }
    }

    this.log(`\n处理完成: 成功${results.success.length} 无数据${results.noData.length} 失败${results.failed.length}`);
    return results;
  }
}

// CLI 模式
if (require.main === module) {
  const processor = new SquadProcessor();
  processor.processAll().catch(console.error);
}

module.exports = SquadProcessor;
