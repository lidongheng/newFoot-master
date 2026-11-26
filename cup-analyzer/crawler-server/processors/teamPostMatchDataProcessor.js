/**
 * 单队本赛季赛后数据采集，复用原 crawlerPostMatchData 的已迁移采集与解析能力。
 * 工作目录：cup-analyzer/crawler-server。
 * 必填：--config ../{赛事}/teamAgent/{球队}/config.js。
 * 配置字段：leagueSlug、leagueSerial、season、teamSerial、teamChineseName、teamEnglishName。
 * 只读取该配置对应的本地赛事赛程，不读取 squadTarget，不依赖 CUP_ANALYZER_CUP。
 * 输出：球队目录/basicData/{短赛季}/{matchId}/，不采集未完赛比赛。
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');
const PostMatchDataCrawler = require('../crawlers/postMatchDataCrawler');
const { sleep } = require('../utils/fileWriter');
const { collectTeamMatches, loadTeamTarget } = require('../utils/teamAgent');

function isCompleteMatch(directory, matchId) {
  try {
    const read = (name) => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
    const info = read('matchInfo.json');
    const events = read('matchEvents.json');
    const stats = read('techStats.json');
    if (![info, events, stats].every((data) => String(data.matchId) === String(matchId))) {
      return false;
    }
    return info.stateCode === -1 && Array.isArray(events.events) && events.events.some((event) => {
      return event.process === 'FullTime' && Number.isInteger(event.score?.home) && Number.isInteger(event.score?.away);
    }) && stats.fullMatch !== null && typeof stats.fullMatch === 'object' &&
      !Array.isArray(stats.fullMatch) && Object.keys(stats.fullMatch).length > 0;
  } catch {
    // 缺文件或 JSON 不完整表示上次未成功写入，必须重新采集。
    return false;
  }
}

async function collectTarget(loaded, crawler, wait, log) {
  const { target, league, schedule, outputDir } = loaded;
  const matches = collectTeamMatches(schedule, league.type, target.teamSerial);
  const result = { success: [], skipped: [], failed: [] };
  let requested = false;
  for (const match of matches) {
    const id = String(match[0]);
    const directory = path.join(outputDir, id);
    if (isCompleteMatch(directory, id)) {
      result.skipped.push(id);
      continue;
    }
    // 请求之间保留现有采集间隔；跳过本地完整数据不会触发请求。
    if (requested) {
      await wait(config.crawlDelayMs);
    }
    requested = true;
    try {
      const ok = await crawler.crawlSingleMatch(id, directory);
      if (!ok || !isCompleteMatch(directory, id)) {
        throw new Error('核心文件缺失、比赛 ID 不一致、技术统计为空或缺少终场比分。');
      }
      result.success.push(id);
    } catch (error) {
      result.failed.push(id);
      log(`比赛 ${id} 采集失败：${error.message}`);
    }
  }
  log(`${target.teamChineseName} ${target.season}：成功 ${result.success.length}，跳过 ${result.skipped.length}，失败 ${result.failed.length}。`);
  return result;
}

async function main(args) {
  if (args.length !== 2 || args[0] !== '--config' || !args[1]) {
    throw new Error('用法：node processors/teamPostMatchDataProcessor.js --config ../{赛事}/teamAgent/{球队}/config.js');
  }
  const loaded = loadTeamTarget(args[1], config.cups);
  const crawler = new PostMatchDataCrawler();
  // 单队增量采集失败后直接记录，禁用共享 HTTP 客户端默认的 4 次自动重试。
  crawler.requestOptions = { retry: 0 };
  const result = await collectTarget(loaded, crawler, sleep, console.log);
  return result.failed.length > 0 ? 1 : 0;
}

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { isCompleteMatch, collectTarget, main };
