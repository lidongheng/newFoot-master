const path = require('path');
const cheerio = require('cheerio');
const BaseCrawler = require('./base');
const targets = require('../config/targets');
const config = require('../config');
const { saveJSON, fileExists, sleep, toSlug } = require('../utils/fileWriter');
const { extractJsonData } = require('../utils/parser');

/**
 * 赛后数据爬虫 - 爬取世界杯比赛的赛后统计数据
 * 复用 backend-server/crawlerPostMatchData.js 的解析逻辑
 *
 * 数据来源: titan007 移动端赛后分析页
 * 输出: output/basicData/{stage}/{round}/{home}_vs_{away}/
 *       - matchInfo.json, matchEvents.json, techStats.json,
 *         lineup.json, playerStats.json, goalProbability.json
 */
class MatchDataCrawler extends BaseCrawler {
  constructor() {
    super('MatchDataCrawler');
  }

  /**
   * 整理比赛事件数据
   */
  formatEvents(eventList) {
    if (!eventList || !Array.isArray(eventList)) return [];
    return eventList.map((event) => {
      const formatted = { time: event.time || '', kind: event.kind, process: event.process };
      if (event.yellowCard) {
        formatted.type = 'yellowCard';
        formatted.player = { id: event.yellowCard.player.id, name: event.yellowCard.player.name };
      } else if (event.redCard) {
        formatted.type = 'redCard';
        formatted.player = { id: event.redCard.player.id, name: event.redCard.player.name };
      } else if (event.goalIn) {
        formatted.type = 'goal';
        formatted.player = { id: event.goalIn.player.id, name: event.goalIn.player.name };
        if (event.goalIn.playerAssist) {
          formatted.assist = { id: event.goalIn.playerAssist.id, name: event.goalIn.playerAssist.name };
        }
        formatted.score = { home: event.goalIn.homeScore, away: event.goalIn.guestScore };
      } else if (event.changePlayer) {
        formatted.type = 'substitution';
        formatted.playerOn = { id: event.changePlayer.onPlayer.id, name: event.changePlayer.onPlayer.name };
        formatted.playerOff = { id: event.changePlayer.offPlayer.id, name: event.changePlayer.offPlayer.name };
      } else if (event.matchProcess) {
        formatted.type = 'matchProcess';
        formatted.score = { home: event.matchProcess.homeScore, away: event.matchProcess.guestScore };
      }
      return formatted;
    });
  }

  /**
   * 整理技术统计
   */
  formatTechStats(itemList) {
    if (!itemList || !Array.isArray(itemList)) return {};
    const stats = {};
    itemList.forEach((item) => {
      stats[item.name] = {
        home: item.home.value, homeText: item.home.text,
        away: item.away.value, awayText: item.away.text,
        kind: item.kind,
      };
    });
    return stats;
  }

  /**
   * 整理球员技术数据
   */
  formatPlayerTech(playerTech) {
    if (!playerTech) return null;
    const formatTeam = (teamData) => {
      if (!teamData) return null;
      return {
        teamId: teamData.teamId,
        teamName: teamData.teamName,
        formation: teamData.formation,
        players: teamData.playerTechInfo.map((p) => {
          const techObj = {};
          p.techInfos.forEach((t) => { techObj[t.infoKind] = t.infoValue; });
          return {
            playerId: p.playerId, playerName: p.playerName, playerNum: p.playerNum,
            isBest: p.isBest, events: p.events, stats: techObj,
          };
        }),
      };
    };
    return {
      home: formatTeam(playerTech.homeTeamDatas),
      away: formatTeam(playerTech.guestTeamDatas),
      statTitles: playerTech.titles,
    };
  }

  /**
   * 整理阵容数据
   */
  formatLineup(lineup) {
    if (!lineup) return null;
    const formatList = (list) => {
      if (!list) return [];
      return list.map((p) => ({
        id: p.Id, number: p.number, name: p.name,
        captainType: p.captainType, injuryReason: p.injuryReson || '',
      }));
    };
    return {
      homeFormation: lineup.homeFormation,
      guestFormation: lineup.guestFormation,
      homeStarting: formatList(lineup.homePlayerList),
      guestStarting: formatList(lineup.guestPlayerList),
      homeSubs: formatList(lineup.homeBakPlayerList),
      guestSubs: formatList(lineup.guestBakPlayerList),
      homeInjury: formatList(lineup.homeInjury),
      guestInjury: formatList(lineup.guestInjury),
    };
  }

  /**
   * 获取赛后总结
   */
  async fetchPostMatchSummary(matchSerial) {
    try {
      const url = targets.titan007.postMatchSummaryApi(matchSerial);
      const res = await this.fetchJson(url, {
        Referer: `https://m.titan007.com/Analy/ShiJian/${matchSerial}.htm`,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      });
      if (res && res.content) {
        const $ = cheerio.load(res.content);
        const paragraphs = [];
        $('p').each((i, el) => {
          const text = $(el).text().trim();
          if (text) paragraphs.push(text);
        });
        return paragraphs.join('\n\n');
      }
    } catch (e) {
      this.log(`赛后总结获取失败: ${e.message}`);
    }
    return '';
  }

  /**
   * 解析并保存赛后数据
   */
  async parseAndSave(html, outputDir, matchSerial) {
    const jsonData = extractJsonData(html);
    if (!jsonData) return false;

    const postSummary = await this.fetchPostMatchSummary(matchSerial);

    // matchInfo.json
    saveJSON(path.join(outputDir, 'matchInfo.json'), {
      matchId: jsonData.info?.id,
      homeName: jsonData.info?.homeName,
      awayName: jsonData.info?.awayName,
      stateCode: jsonData.info?.stateCode,
      postMatchSummary: postSummary || '',
    });

    // matchEvents.json
    saveJSON(path.join(outputDir, 'matchEvents.json'), {
      matchId: jsonData.info?.id,
      homeName: jsonData.info?.homeName,
      awayName: jsonData.info?.awayName,
      events: this.formatEvents(jsonData.events?.eventList),
      cornerEvents: jsonData.conerEvent || null,
    });

    // techStats.json
    saveJSON(path.join(outputDir, 'techStats.json'), {
      matchId: jsonData.info?.id,
      homeName: jsonData.info?.homeName,
      awayName: jsonData.info?.awayName,
      fullMatch: this.formatTechStats(jsonData.techStat?.itemList),
      firstHalf: this.formatTechStats(jsonData.techStat?.firstHalfList),
      secondHalf: this.formatTechStats(jsonData.techStat?.secondHalfList),
      recentAvg: {
        last10: this.formatTechStats(jsonData.lastTechStat?.itemList),
        last5: this.formatTechStats(jsonData.last5TechStat?.itemList),
        last3: this.formatTechStats(jsonData.last3TechStat?.itemList),
      },
    });

    // lineup.json
    const lineupData = this.formatLineup(jsonData.lineup);
    if (lineupData) {
      lineupData.matchId = jsonData.info?.id;
      lineupData.homeName = jsonData.info?.homeName;
      lineupData.awayName = jsonData.info?.awayName;
      saveJSON(path.join(outputDir, 'lineup.json'), lineupData);
    }

    // playerStats.json
    const playerData = this.formatPlayerTech(jsonData.playerTech);
    if (playerData) {
      playerData.matchId = jsonData.info?.id;
      playerData.homeName = jsonData.info?.homeName;
      playerData.awayName = jsonData.info?.awayName;
      saveJSON(path.join(outputDir, 'playerStats.json'), playerData);
    }

    // goalProbability.json
    if (jsonData.jsq) {
      saveJSON(path.join(outputDir, 'goalProbability.json'), {
        matchId: jsonData.info?.id,
        homeName: jsonData.info?.homeName,
        awayName: jsonData.info?.awayName,
        goalProbability: jsonData.jsq.jsqList,
      });
    }

    return true;
  }

  /**
   * 爬取单场比赛赛后数据
   */
  async crawlMatch(matchSerial, outputDir) {
    this.log(`爬取比赛 ${matchSerial}...`);
    const url = targets.titan007.matchAnalysisUrl(matchSerial);
    const html = await this.fetchText(url, targets.titan007.headers.mobile(matchSerial));

    if (!outputDir) {
      outputDir = path.join(config.paths.basicData, `match_${matchSerial}`);
    }

    const ok = await this.parseAndSave(html, outputDir, matchSerial);
    if (ok) {
      this.log(`比赛 ${matchSerial} 数据已保存至: ${outputDir}`);
    }
    return { matchSerial, success: ok, outputDir };
  }

  /**
   * 按阶段/轮次批量爬取赛后数据
   */
  async crawlBatch(stage, round) {
    const scheduleData = this.parseScheduleData();
    if (!scheduleData) {
      this.error('无法读取赛程数据');
      return null;
    }

    const teamMap = this.buildTeamMap(scheduleData.arrTeam);
    const stageMap = {
      'group': 'G27970',
      'round-of-32': 'G27980',
      'round-of-16': 'G27975',
      'quarter-finals': 'G27976',
      'semi-finals': 'G27977',
      'third-place': 'G27978',
      'final': 'G27979',
    };

    let matchKey;
    let outputStage;

    if (stage === 'group' && round) {
      // 小组赛特定组别
      matchKey = `G27970${round}`;
      outputStage = `group-stage/group-${round}`;
    } else if (stageMap[stage]) {
      matchKey = stageMap[stage];
      outputStage = stage;
    } else {
      this.error(`未知阶段: ${stage}`);
      return null;
    }

    const matches = scheduleData.rounds[matchKey];
    if (!matches) {
      this.error(`无比赛数据: ${matchKey}`);
      return null;
    }

    const results = { success: [], failed: [], skipped: [] };

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const matchSerial = match[0];
      const fullScore = match[6];
      const homeTeam = teamMap[match[4]];
      const awayTeam = teamMap[match[5]];

      if (!fullScore) {
        results.skipped.push({ matchSerial, reason: '未完赛' });
        continue;
      }

      const homeName = homeTeam?.chineseName || String(match[4]);
      const awayName = awayTeam?.chineseName || String(match[5]);
      const folderName = `${toSlug(homeTeam?.englishName || homeName)}_vs_${toSlug(awayTeam?.englishName || awayName)}`;
      const outputDir = path.join(config.paths.basicData, outputStage, folderName);

      if (fileExists(path.join(outputDir, 'matchEvents.json'))) {
        results.skipped.push({ matchSerial, reason: '已存在' });
        continue;
      }

      this.log(`[${i + 1}/${matches.length}] ${homeName} vs ${awayName} (${fullScore})`);
      try {
        const result = await this.crawlMatch(matchSerial, outputDir);
        if (result.success) results.success.push({ matchSerial, homeName, awayName });
        else results.failed.push({ matchSerial, homeName, awayName });
      } catch (err) {
        this.error(`爬取失败: ${err.message}`);
        results.failed.push({ matchSerial, homeName, awayName });
      }

      if (i < matches.length - 1) await this.delay();
    }

    this.log(`\n批量爬取完成: 成功${results.success.length} 跳过${results.skipped.length} 失败${results.failed.length}`);
    return results;
  }
}

// CLI 模式
if (require.main === module) {
  const args = process.argv.slice(2);
  const crawler = new MatchDataCrawler();

  const matchIdx = args.indexOf('--match');
  if (matchIdx !== -1 && args[matchIdx + 1]) {
    crawler.crawlMatch(args[matchIdx + 1]).catch(console.error);
  } else {
    const stage = args[0] || 'group';
    const round = args[1];
    crawler.crawlBatch(stage, round).catch(console.error);
  }
}

module.exports = MatchDataCrawler;
