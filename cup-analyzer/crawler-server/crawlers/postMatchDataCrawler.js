/**
 * postMatchDataCrawler.js
 * 批量增量爬取球探体育赛后数据统计页面（从 backend-server/crawlerPostMatchData.js 迁移）
 *
 * 配置：环境变量 CUP_ANALYZER_CUP（与 scheduleCrawler 一致），见 config/index.js
 * 输出：cup-analyzer/{联赛模块}/basicData/{赛季目录}/round-{N}|{杯赛阶段}/{主队}_vs_{客队}/
 *
 * 使用方式：
 *   npx cross-env CUP_ANALYZER_CUP=epl node crawlers/postMatchDataCrawler.js
 *   npx cross-env CUP_ANALYZER_CUP=epl node crawlers/postMatchDataCrawler.js --round 26
 *   npx cross-env CUP_ANALYZER_CUP=epl node crawlers/postMatchDataCrawler.js --local example.html --match 2789380
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const MatchDataCrawler = require('./matchDataCrawler');
const config = require('../config');
const {
  readFile,
  ensureDir,
  saveJSON,
  toSlug,
  sleep,
  fileExists,
} = require('../utils/fileWriter');
const { evalJsData, extractJsonData } = require('../utils/parser');
const targets = require('../config/targets');

const CRAWL_DELAY_MS = config.crawlDelayMs || 3000;

/**
 * 本地 basicData 目录统一短赛季名：全写如 2025-2026 → 25-26；已是 25-26 或 2026 则保持
 */
function folderSeasonForBasicData(season) {
  if (!season) return 'unknown';
  const m = /^(\d{4})-(\d{4})$/.exec(String(season).trim());
  if (m) return `${m[1].slice(2)}-${m[2].slice(2)}`;
  return season;
}

function extractPostMatchSummaryFromHtml(html) {
  const $ = cheerio.load(html);
  const paragraphs = [];
  $('#afterPreInfo p').each((i, el) => {
    const text = $(el).text().trim();
    if (text) paragraphs.push(text);
  });
  return paragraphs.join('\n\n');
}

class PostMatchDataCrawler extends MatchDataCrawler {
  constructor() {
    super();
    this.baseOutputDir = path.join(
      config.paths.basicData,
      folderSeasonForBasicData(config.season),
    );
  }

  parseScheduleForPostMatch() {
    const schedulePath = config.paths.cupScheduleData;
    const content = readFile(schedulePath);
    if (!content) {
      this.error(`赛程文件不存在: ${schedulePath}`);
      return null;
    }
    const sandbox = evalJsData(content);
    if (!sandbox || !sandbox.jh) {
      this.error('赛程解析失败或缺少 jh');
      return null;
    }
    return {
      arrTeam: sandbox.arrTeam,
      rounds: sandbox.jh,
    };
  }

  buildTeamMapWithSlug(arrTeam) {
    const map = {};
    if (!arrTeam || !Array.isArray(arrTeam)) return map;
    arrTeam.forEach((team) => {
      map[team[0]] = {
        id: team[0],
        chineseName: team[1],
        englishName: team[3],
        slug: toSlug(team[3]),
      };
    });
    return map;
  }

  isMatchDataExists(outputDir) {
    return fileExists(path.join(outputDir, 'matchEvents.json'));
  }

  /**
   * 与 backend 一致：优先从 HTML 取赛后总结，再走 API
   */
  async parseAndSave(html, outputDir, matchSerial) {
    const jsonData = extractJsonData(html);
    if (!jsonData) return false;

    let postMatchSummary = extractPostMatchSummaryFromHtml(html);
    if (!postMatchSummary && matchSerial && String(matchSerial) !== 'unknown') {
      postMatchSummary = await this.fetchPostMatchSummary(matchSerial);
    }

    ensureDir(outputDir);

    saveJSON(path.join(outputDir, 'matchInfo.json'), {
      matchId: jsonData.info?.id,
      homeName: jsonData.info?.homeName,
      awayName: jsonData.info?.awayName,
      stateCode: jsonData.info?.stateCode,
      postMatchSummary: postMatchSummary || '',
    });

    saveJSON(path.join(outputDir, 'matchEvents.json'), {
      matchId: jsonData.info?.id,
      homeName: jsonData.info?.homeName,
      awayName: jsonData.info?.awayName,
      events: this.formatEvents(jsonData.events?.eventList),
      cornerEvents: jsonData.conerEvent || null,
    });

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

    const lineupData = this.formatLineup(jsonData.lineup);
    if (lineupData) {
      lineupData.matchId = jsonData.info?.id;
      lineupData.homeName = jsonData.info?.homeName;
      lineupData.awayName = jsonData.info?.awayName;
      saveJSON(path.join(outputDir, 'lineup.json'), lineupData);
    }

    const playerData = this.formatPlayerTech(jsonData.playerTech);
    if (playerData) {
      playerData.matchId = jsonData.info?.id;
      playerData.homeName = jsonData.info?.homeName;
      playerData.awayName = jsonData.info?.awayName;
      saveJSON(path.join(outputDir, 'playerStats.json'), playerData);
    }

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

  async crawlSingleMatch(matchSerial, outputDir) {
    const url = targets.titan007.matchAnalysisUrl(matchSerial);
    const html = await this.fetchText(url, targets.titan007.headers.mobile(matchSerial));
    return this.parseAndSave(html, outputDir, matchSerial);
  }

  collectPendingMatches(matchCenter, targetRounds) {
    const teamMap = this.buildTeamMapWithSlug(matchCenter.arrTeam);
    const pendingMatches = [];
    const skippedMatches = [];
    const notFinishedMatches = [];

    for (const round of targetRounds) {
      let roundKey = `R_${round}`;
      let matches = matchCenter.rounds[roundKey];

      if (!matches && String(round).startsWith('G')) {
        roundKey = round;
        matches = matchCenter.rounds[roundKey];
      }

      if (!matches) continue;

      const isCupFormat =
        Array.isArray(matches[0]) &&
        matches[0].length >= 5 &&
        Array.isArray(matches[0][4]);

      if (isCupFormat) {
        for (const tie of matches) {
          const legs = [tie[4], tie[5]].filter((leg) => leg && leg[0]);
          for (const match of legs) {
            const matchSerial = match[0];
            const stateCode = match[2];
            const homeTeamId = match[4];
            const awayTeamId = match[5];
            const fullScore = match[6];

            const homeInfo = teamMap[homeTeamId];
            const awayInfo = teamMap[awayTeamId];

            if (!homeInfo || !awayInfo) {
              console.warn(`  [跳过] 比赛${matchSerial}: 未知球队 ID (${homeTeamId} / ${awayTeamId})`);
              continue;
            }

            const folderName = `${homeInfo.slug}_vs_${awayInfo.slug}`;
            const roundDir = round;
            const outputDir = path.join(this.baseOutputDir, roundDir, folderName);

            if (stateCode !== -1 || !fullScore) {
              notFinishedMatches.push({ matchSerial, round, homeInfo, awayInfo });
              continue;
            }

            if (this.isMatchDataExists(outputDir)) {
              skippedMatches.push({ matchSerial, round, homeInfo, awayInfo });
              continue;
            }

            pendingMatches.push({
              matchSerial,
              round,
              homeTeamId,
              awayTeamId,
              homeInfo,
              awayInfo,
              fullScore,
              folderName,
              outputDir,
              isLeague: false,
            });
          }
        }
      } else {
        for (const match of matches) {
          const matchSerial = match[0];
          const stateCode = match[2];
          const homeTeamId = match[4];
          const awayTeamId = match[5];
          const fullScore = match[6];

          const homeInfo = teamMap[homeTeamId];
          const awayInfo = teamMap[awayTeamId];

          if (!homeInfo || !awayInfo) {
            console.warn(`  [跳过] 比赛${matchSerial}: 未知球队 ID (${homeTeamId} / ${awayTeamId})`);
            continue;
          }

          const folderName = `${homeInfo.slug}_vs_${awayInfo.slug}`;
          const roundDir = `round-${round}`;
          const outputDir = path.join(this.baseOutputDir, roundDir, folderName);

          if (stateCode !== -1 || !fullScore) {
            notFinishedMatches.push({ matchSerial, round, homeInfo, awayInfo });
            continue;
          }

          if (this.isMatchDataExists(outputDir)) {
            skippedMatches.push({ matchSerial, round, homeInfo, awayInfo });
            continue;
          }

          pendingMatches.push({
            matchSerial,
            round,
            homeTeamId,
            awayTeamId,
            homeInfo,
            awayInfo,
            fullScore,
            folderName,
            outputDir,
            isLeague: true,
          });
        }
      }
    }

    return { pendingMatches, skippedMatches, notFinishedMatches };
  }

  async runLocalMode(args) {
    const localIdx = args.indexOf('--local');
    const localArg = args[localIdx + 1];
    const localFilePath = path.isAbsolute(localArg)
      ? localArg
      : path.resolve(process.cwd(), localArg);
    const matchIdx = args.indexOf('--match');
    const matchSerial = matchIdx !== -1 ? args[matchIdx + 1] : 'unknown';

    const matchCenter = this.parseScheduleForPostMatch();
    let outputDir;

    if (matchCenter) {
      const teamMap = this.buildTeamMapWithSlug(matchCenter.arrTeam);
      let foundMatch = null;
      let foundRound = null;
      for (const roundKey of Object.keys(matchCenter.rounds)) {
        const matches = matchCenter.rounds[roundKey];
        if (!matches || !Array.isArray(matches)) continue;

        const flat = Array.isArray(matches[0]) && matches[0].length >= 5 && Array.isArray(matches[0][4])
          ? null
          : matches;

        if (flat) {
          const found = flat.find((m) => String(m[0]) === String(matchSerial));
          if (found) {
            foundMatch = found;
            foundRound = roundKey.startsWith('R_') ? roundKey.replace('R_', '') : roundKey;
            break;
          }
        } else {
          for (const tie of matches) {
            const legs = [tie[4], tie[5]].filter((leg) => leg && leg[0]);
            for (const m of legs) {
              if (String(m[0]) === String(matchSerial)) {
                foundMatch = m;
                foundRound = roundKey.startsWith('R_') ? roundKey.replace('R_', '') : roundKey;
                break;
              }
            }
            if (foundMatch) break;
          }
          if (foundMatch) break;
        }
      }

      if (foundMatch && foundRound) {
        const homeSlug = teamMap[foundMatch[4]]?.slug || 'home';
        const awaySlug = teamMap[foundMatch[5]]?.slug || 'away';
        const roundSegment = String(foundRound).startsWith('G')
          ? foundRound
          : `round-${foundRound}`;
        outputDir = path.join(this.baseOutputDir, roundSegment, `${homeSlug}_vs_${awaySlug}`);
      }
    }

    if (!outputDir) {
      outputDir = path.join(this.baseOutputDir, `match_${matchSerial}`);
    }

    console.log(`[本地模式] 从文件解析: ${localFilePath}`);
    const htmlBuffer = fs.readFileSync(localFilePath);
    const html = htmlBuffer.toString('utf-8');
    const ok = await this.parseAndSave(html, outputDir, matchSerial);
    if (ok) {
      console.log(`[完成] 数据已保存至: ${outputDir}`);
    } else {
      console.error('[失败] 解析未产出数据');
    }
  }

  async runBatch(args) {
    console.log('='.repeat(60));
    console.log('赛后数据批量增量爬取 (postMatchDataCrawler)');
    console.log(`赛事: ${config.cupName} (${config.chineseName})  赛季: ${config.season} → 目录: ${folderSeasonForBasicData(config.season)}`);
    console.log(`输出根目录: ${this.baseOutputDir}`);
    console.log('='.repeat(60));

    const matchCenter = this.parseScheduleForPostMatch();
    if (!matchCenter) {
      console.error('[终止] 无法读取赛程数据');
      return;
    }

    const roundArg = args.indexOf('--round');
    let targetRounds = [];
    if (roundArg !== -1 && args[roundArg + 1]) {
      targetRounds = [args[roundArg + 1]];
    } else {
      targetRounds = Object.keys(matchCenter.rounds)
        .map((k) => (k.startsWith('R_') ? k.replace('R_', '') : k))
        .sort((a, b) => {
          const aNum = parseInt(a, 10);
          const bNum = parseInt(b, 10);
          if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
          return String(a).localeCompare(String(b));
        });
    }

    const { pendingMatches, skippedMatches, notFinishedMatches } = this.collectPendingMatches(
      matchCenter,
      targetRounds,
    );

    console.log('\n[统计]');
    console.log(`  已完赛且已保存(跳过): ${skippedMatches.length} 场`);
    console.log(`  未完赛(跳过):         ${notFinishedMatches.length} 场`);
    console.log(`  待爬取:               ${pendingMatches.length} 场`);

    if (pendingMatches.length === 0) {
      console.log('\n[完成] 没有需要爬取的新数据，所有已完赛比赛数据均已保存。');
      return;
    }

    console.log(`\n[开始爬取] 共 ${pendingMatches.length} 场，每场间隔 ${CRAWL_DELAY_MS / 1000} 秒\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pendingMatches.length; i++) {
      const m = pendingMatches[i];
      const progress = `[${i + 1}/${pendingMatches.length}]`;
      console.log(
        `${progress} R${m.round} ${m.homeInfo.chineseName} vs ${m.awayInfo.chineseName} (${m.fullScore}) - ID:${m.matchSerial}`,
      );

      try {
        const ok = await this.crawlSingleMatch(m.matchSerial, m.outputDir);
        if (ok) {
          const seg = m.isLeague ? `round-${m.round}` : m.round;
          console.log(`  ✓ 保存至: ${seg}/${m.folderName}/`);
          successCount++;
        } else {
          console.log('  ✗ 数据解析失败');
          failCount++;
        }
      } catch (err) {
        console.error(`  ✗ 爬取失败: ${err.message}`);
        failCount++;
      }

      if (i < pendingMatches.length - 1) {
        await sleep(CRAWL_DELAY_MS);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('[爬取完成]');
    console.log(`  成功: ${successCount} 场`);
    console.log(`  失败: ${failCount} 场`);
    console.log(`  数据目录: ${this.baseOutputDir}`);
    console.log('='.repeat(60));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const crawler = new PostMatchDataCrawler();

  const localIdx = args.indexOf('--local');
  if (localIdx !== -1 && args[localIdx + 1]) {
    await crawler.runLocalMode(args);
    return;
  }

  await crawler.runBatch(args);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[致命错误]', err);
    process.exit(1);
  });
}

module.exports = PostMatchDataCrawler;
