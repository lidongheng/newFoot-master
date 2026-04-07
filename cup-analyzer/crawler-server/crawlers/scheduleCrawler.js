const path = require('path');
const fs = require('fs');
const BaseCrawler = require('./base');
const targets = require('../config/targets');
const config = require('../config');
const { saveJSON } = require('../utils/fileWriter');

/**
 * 赛程更新爬虫 - 更新世界杯赛程和比分数据
 *
 * 数据来源: titan007 赛程数据 JS 文件
 * 输出: 更新 cup-analyzer/theWorldCup/data/c75.js
 */
class ScheduleCrawler extends BaseCrawler {
  constructor() {
    super('ScheduleCrawler');
  }

  /**
   * 从 titan007 获取最新赛程数据并更新 c75.js
   */
  async updateSchedule() {
    const url = targets.titan007.cupScheduleUrl(config.cupSerial, config.season);
    this.log(`更新赛程: ${url}`);

    try {
      const text = await this.fetchText(url, targets.titan007.headers.desktop);
      const outputPath = config.paths.c75Data;

      // 备份旧文件
      if (fs.existsSync(outputPath)) {
        const backupPath = outputPath.replace('.js', `.backup_${Date.now()}.js`);
        fs.copyFileSync(outputPath, backupPath);
        this.log(`已备份旧文件: ${backupPath}`);
      }

      fs.writeFileSync(outputPath, text, 'utf-8');
      this.log(`赛程数据已更新: ${outputPath}`);

      return { success: true, outputPath };
    } catch (err) {
      this.error(`更新赛程失败: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * 获取当前小组积分榜
   */
  async getGroupStandings() {
    const scheduleData = this.parseScheduleData();
    if (!scheduleData) {
      this.error('无法读取赛程数据');
      return null;
    }

    const teamMap = this.buildTeamMap(scheduleData.arrTeam);
    const groupMap = this.buildGroupMap(scheduleData);
    const standings = {};

    for (const [letter, group] of Object.entries(groupMap)) {
      const standingKey = `S27970${letter}`;
      const rawStandings = scheduleData.rounds[standingKey];
      if (!rawStandings) continue;

      standings[letter] = rawStandings.map((row) => {
        const team = teamMap[row[1]] || {};
        return {
          rank: row[0],
          teamId: row[1],
          teamName: team.chineseName || String(row[1]),
          englishName: team.englishName || '',
          played: row[2] || 0,
          won: row[3] || 0,
          drawn: row[4] || 0,
          lost: row[5] || 0,
          goalsFor: row[6] || 0,
          goalsAgainst: row[7] || 0,
          goalDiff: row[8] || 0,
          points: row[9] || 0,
        };
      });
    }

    return standings;
  }
}

// CLI 模式
if (require.main === module) {
  const args = process.argv.slice(2);
  const crawler = new ScheduleCrawler();

  if (args[0] === '--standings') {
    crawler.getGroupStandings().then((s) => console.log(JSON.stringify(s, null, 2))).catch(console.error);
  } else {
    crawler.updateSchedule().catch(console.error);
  }
}

module.exports = ScheduleCrawler;
