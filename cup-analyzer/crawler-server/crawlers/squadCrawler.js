const path = require('path');
const BaseCrawler = require('./base');
const targets = require('../config/targets');
const config = require('../config');
const { saveJSON, fileExists } = require('../utils/fileWriter');

/**
 * 大名单爬虫 - 批量爬取世界杯48队26人名单
 * 复用 backend-server/crawlerPlayer.js 的解析逻辑，适配国家队
 *
 * 数据来源: titan007 teamDetail API
 * 输出: output/player_center/{teamSerial}.json
 */
class SquadCrawler extends BaseCrawler {
  constructor() {
    super('SquadCrawler');
  }

  /**
   * 从 titan007 球员数据中解析大名单
   * 变量由 eval 注入: rearguard(后卫), vanguard(前锋), goalkeeper(门将), midfielder(中场), lineupDetail(详细信息)
   */
  parsePlayerData(sandbox) {
    const { rearguard = [], vanguard = [], goalkeeper = [], midfielder = [], lineupDetail = [] } = sandbox;

    const players = [];
    const nameIndexMap = {};

    const addPlayers = (list, posGroup) => {
      list.forEach((item) => {
        players.push({
          number: Number(item[1]),
          name: item[2],
          positionGroup: posGroup,
        });
      });
    };

    addPlayers(goalkeeper, 'GK');
    addPlayers(rearguard, 'DF');
    addPlayers(midfielder, 'MF');
    addPlayers(vanguard, 'FW');

    players.forEach((p, i) => {
      nameIndexMap[p.name] = i;
    });

    for (const detail of lineupDetail) {
      if (detail[8] === '主教练') continue;

      const name = (detail[2] || '').trim();
      const idx = nameIndexMap[name];
      if (idx === undefined) continue;

      const birthYear = (detail[5] || '').trim().split('-')[0];
      players[idx].age = birthYear ? new Date().getFullYear() - Number(birthYear) : null;
      players[idx].height = Number(detail[6]) || null;
      players[idx].weight = Number(detail[7]) || null;
      players[idx].position = (detail[8] || '').trim();
      players[idx].nationality = (detail[9] || '').trim();
      players[idx].marketValue = (detail[11] || '').trim();
      players[idx].birthDate = (detail[5] || '').trim();
    }

    return players;
  }

  /**
   * 爬取单个球队大名单
   */
  async crawlTeam(teamSerial) {
    const url = targets.titan007.teamDetailUrl(teamSerial);
    this.log(`爬取球队 ${teamSerial}: ${url}`);

    const sandbox = await this.fetchJsData(url, targets.titan007.headers.desktop);
    if (!sandbox) {
      this.error(`球队 ${teamSerial} 数据解析失败`);
      return null;
    }

    const players = this.parsePlayerData(sandbox);
    const outputPath = path.join(config.paths.playerCenter, `${teamSerial}.json`);
    saveJSON(outputPath, players);

    this.log(`球队 ${teamSerial} 完成，共 ${players.length} 名球员`);
    return { teamSerial, playerCount: players.length, outputPath };
  }

  /**
   * 批量爬取48队大名单
   */
  async crawlAllTeams() {
    const scheduleData = this.parseScheduleData();
    if (!scheduleData) {
      this.error('无法读取赛程数据 c75.js');
      return null;
    }

    const teamMap = this.buildTeamMap(scheduleData.arrTeam);

    // 过滤出确定的参赛队（排除占位符球队：id >= 36185 的都是占位符）
    const realTeams = Object.values(teamMap).filter((t) => t.id < 36185);
    this.log(`共 ${realTeams.length} 支确定参赛队`);

    const results = { success: [], failed: [], skipped: [] };

    for (let i = 0; i < realTeams.length; i++) {
      const team = realTeams[i];
      const outputPath = path.join(config.paths.playerCenter, `${team.id}.json`);

      if (fileExists(outputPath)) {
        this.log(`[${i + 1}/${realTeams.length}] ${team.chineseName}(${team.id}) 已存在，跳过`);
        results.skipped.push(team);
        continue;
      }

      this.log(`[${i + 1}/${realTeams.length}] ${team.chineseName}(${team.id})`);

      try {
        const result = await this.crawlTeam(team.id);
        if (result) {
          results.success.push({ ...team, playerCount: result.playerCount });
        } else {
          results.failed.push(team);
        }
      } catch (err) {
        this.error(`${team.chineseName}(${team.id}) 爬取失败: ${err.message}`);
        results.failed.push(team);
      }

      if (i < realTeams.length - 1) await this.delay();
    }

    this.log(`\n爬取完成: 成功${results.success.length} 跳过${results.skipped.length} 失败${results.failed.length}`);
    return results;
  }
}

// CLI 模式
if (require.main === module) {
  const args = process.argv.slice(2);
  const crawler = new SquadCrawler();

  if (args[0] === '--team' && args[1]) {
    crawler.crawlTeam(args[1]).catch(console.error);
  } else {
    crawler.crawlAllTeams().catch(console.error);
  }
}

module.exports = SquadCrawler;
