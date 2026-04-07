const path = require('path');
const BaseCrawler = require('./base');
const targets = require('../config/targets');
const config = require('../config');
const { saveJSON } = require('../utils/fileWriter');
const { loadHtml } = require('../utils/parser');

/**
 * 赔率爬虫 - 爬取世界杯比赛的盘口和赔率数据
 *
 * 数据来源: titan007 分析页面
 * 输出: output/basicData/odds/{matchId}.json
 */
class OddsCrawler extends BaseCrawler {
  constructor() {
    super('OddsCrawler');
  }

  /**
   * 从分析页面提取亚盘数据
   */
  parseAsianHandicap(html) {
    const $ = loadHtml(html);
    const odds = [];

    // 尝试从嵌入的 JS 中提取亚盘数据
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const content = $(script).html() || '';

      // 匹配 game 数组（常见的亚盘数据格式）
      const gameMatch = content.match(/var\s+game\s*=\s*(\[[\s\S]*?\]);/);
      if (gameMatch) {
        try {
          const gameData = new Function(`return ${gameMatch[1]}`)();
          if (Array.isArray(gameData)) {
            gameData.forEach((row) => {
              if (Array.isArray(row) && row.length >= 10) {
                odds.push({
                  company: row[0],
                  initialHandicap: row[1],
                  initialHome: row[2],
                  initialAway: row[3],
                  currentHandicap: row[4],
                  currentHome: row[5],
                  currentAway: row[6],
                });
              }
            });
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    }

    return odds;
  }

  /**
   * 从分析页面提取欧赔数据
   */
  parseEuropeanOdds(html) {
    const $ = loadHtml(html);
    const odds = [];

    const scripts = $('script').toArray();
    for (const script of scripts) {
      const content = $(script).html() || '';

      const oddsMatch = content.match(/var\s+(?:oddsList|europeOdds)\s*=\s*(\[[\s\S]*?\]);/);
      if (oddsMatch) {
        try {
          const oddsData = new Function(`return ${oddsMatch[1]}`)();
          if (Array.isArray(oddsData)) {
            oddsData.forEach((row) => {
              if (Array.isArray(row) && row.length >= 8) {
                odds.push({
                  company: row[0],
                  initialHome: row[1],
                  initialDraw: row[2],
                  initialAway: row[3],
                  currentHome: row[4],
                  currentDraw: row[5],
                  currentAway: row[6],
                });
              }
            });
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    }

    return odds;
  }

  /**
   * 爬取单场比赛的赔率数据
   */
  async crawlMatchOdds(matchSerial) {
    this.log(`爬取比赛 ${matchSerial} 的赔率数据...`);
    const url = targets.titan007.matchStatisticsUrl(matchSerial);

    try {
      const html = await this.fetchText(url, targets.titan007.headers.desktop);
      const asianOdds = this.parseAsianHandicap(html);
      const europeanOdds = this.parseEuropeanOdds(html);

      const result = {
        matchSerial,
        crawlTime: new Date().toISOString(),
        asianHandicap: asianOdds,
        europeanOdds: europeanOdds,
      };

      const outputPath = path.join(config.paths.basicData, 'odds', `${matchSerial}.json`);
      saveJSON(outputPath, result);

      this.log(`比赛 ${matchSerial} 赔率数据已保存，亚盘${asianOdds.length}条 欧赔${europeanOdds.length}条`);
      return result;
    } catch (err) {
      this.error(`爬取赔率失败: ${err.message}`);
      return null;
    }
  }
}

// CLI 模式
if (require.main === module) {
  const args = process.argv.slice(2);
  const crawler = new OddsCrawler();

  if (args[0]) {
    crawler.crawlMatchOdds(args[0]).catch(console.error);
  } else {
    console.log('用法: node oddsCrawler.js <matchSerial>');
  }
}

module.exports = OddsCrawler;
