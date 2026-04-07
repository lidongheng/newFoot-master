/**
 * crawlerPostMatchData.js
 * 批量增量爬取球探体育赛后数据统计页面，提取并保存赛后数据
 *
 * 使用方式：
 *   node crawlerPostMatchData.js                  # 增量爬取所有已完赛但未保存的比赛
 *   node crawlerPostMatchData.js --round 26       # 只爬取指定轮次
 *   node crawlerPostMatchData.js --local example3.html --match 2789380  # 从本地HTML文件解析单场比赛
 *
 * 配置说明：
 *   - wudaconfig.js 中的 leagueSerial 决定爬取哪个联赛
 *   - wudaconfig.js 中的 season 决定赛季
 *   - wudaconfig.js 中的 leagueSlug 决定输出文件夹名（如 epl）
 *   - 比赛序号和对阵信息从 match_center/s{leagueSerial}.js 自动读取
 *   - 输出目录: basicData/{leagueSlug}/{season}/{home}_vs_{away}/
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const { service } = require('./utils/utils');
const staticData = require('./config/wudaconfig');
const { qiutanMHeaders } = require('./config/league');

// ==========================================================
// 配置
// ==========================================================
const LEAGUE_SERIAL = staticData.leagueSerial;
const SEASON = staticData.season;
const LEAGUE_SLUG = staticData.leagueSlug || 'unknown';
const BASE_OUTPUT_DIR = path.resolve(__dirname, 'basicData', LEAGUE_SLUG, SEASON);
const CRAWL_DELAY_MS = 3000; // 每次爬取请求间隔（毫秒），防止被封

// ==========================================================
// 工具函数：解析与格式化
// ==========================================================

/**
 * 从 HTML 中提取 var jsonData = {...} 的 JSON 对象
 */
function extractJsonData(html) {
  const regex = /var\s+jsonData\s*=\s*(\{[\s\S]*?\});?\s*(?:\n|CheckAdEnabled)/;
  const match = html.match(regex);
  if (!match) {
    const regex2 = /var\s+jsonData\s*=\s*(\{.+\})\s*;/;
    const match2 = html.match(regex2);
    if (!match2) {
      console.error('  [错误] 未能从 HTML 中提取 jsonData');
      return null;
    }
    try {
      return JSON.parse(match2[1]);
    } catch (e) {
      console.error('  [错误] jsonData JSON解析失败:', e.message);
      return null;
    }
  }
  try {
    return JSON.parse(match[1]);
  } catch (e) {
    console.error('  [错误] jsonData JSON解析失败:', e.message);
    return null;
  }
}

/**
 * 从 HTML 中提取赛后总结文字（本地文件模式，浏览器保存的页面已包含内容）
 */
function extractPostMatchSummaryFromHtml(html) {
  const $ = cheerio.load(html);
  const paragraphs = [];
  $('#afterPreInfo p').each((i, el) => {
    const text = $(el).text().trim();
    if (text) paragraphs.push(text);
  });
  return paragraphs.join('\n\n');
}

/**
 * 通过独立 API 获取赛后总结（在线爬取模式）
 * 原始 HTML 中 #afterPreInfo 为空，内容由客户端 JS 通过此 API 动态加载
 */
async function fetchPostMatchSummary(matchSerial) {
  try {
    const res = await service({
      method: 'GET',
      url: `https://m.titan007.com/Common/CommonInterface.ashx?type=18&scheid=${matchSerial}&lang=`,
      headers: {
        'Referer': `https://m.titan007.com/Analy/ShiJian/${matchSerial}.htm`,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    });
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (data && data.content) {
      const $ = cheerio.load(data.content);
      const paragraphs = [];
      $('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text) paragraphs.push(text);
      });
      return paragraphs.join('\n\n');
    }
  } catch (e) {
    console.warn(`  [警告] 获取赛后总结失败: ${e.message}`);
  }
  return '';
}

/**
 * 整理比赛事件数据
 */
function formatEvents(eventList) {
  if (!eventList || !Array.isArray(eventList)) return [];
  return eventList.map(event => {
    const formatted = {
      time: event.time || '',
      kind: event.kind,
      process: event.process,
    };
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
 * 整理技术统计数据
 */
function formatTechStats(itemList) {
  if (!itemList || !Array.isArray(itemList)) return {};
  const stats = {};
  itemList.forEach(item => {
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
function formatPlayerTech(playerTech) {
  if (!playerTech) return null;
  function formatTeamPlayers(teamData) {
    if (!teamData) return null;
    return {
      teamId: teamData.teamId,
      teamName: teamData.teamName,
      formation: teamData.formation,
      players: teamData.playerTechInfo.map(p => {
        const techObj = {};
        p.techInfos.forEach(t => { techObj[t.infoKind] = t.infoValue; });
        return {
          playerId: p.playerId, playerName: p.playerName, playerNum: p.playerNum,
          isBest: p.isBest, events: p.events, stats: techObj,
        };
      }),
    };
  }
  return {
    home: formatTeamPlayers(playerTech.homeTeamDatas),
    away: formatTeamPlayers(playerTech.guestTeamDatas),
    statTitles: playerTech.titles,
  };
}

/**
 * 整理阵容数据
 */
function formatLineup(lineup) {
  if (!lineup) return null;
  function formatPlayerList(list) {
    if (!list) return [];
    return list.map(p => ({
      id: p.Id, number: p.number, name: p.name,
      captainType: p.captainType, injuryReson: p.injuryReson || '',
    }));
  }
  return {
    homeFormation: lineup.homeFormation,
    guestFormation: lineup.guestFormation,
    homeStarting: formatPlayerList(lineup.homePlayerList),
    guestStarting: formatPlayerList(lineup.guestPlayerList),
    homeSubs: formatPlayerList(lineup.homeBakPlayerList),
    guestSubs: formatPlayerList(lineup.guestBakPlayerList),
    homeInjury: formatPlayerList(lineup.homeInjury),
    guestInjury: formatPlayerList(lineup.guestInjury),
  };
}

// ==========================================================
// 工具函数：文件 & 目录
// ==========================================================

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 英文队名 → 文件夹用的 slug（小写 + 下划线）
 */
function toSlug(englishName) {
  return englishName
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

// ==========================================================
// 核心：解析 match_center JS 文件
// ==========================================================

/**
 * 解析 match_center/s{leagueSerial}.js 或 c{leagueSerial}.js，提取球队和比赛数据
 */
function parseMatchCenterFile(leagueSerial) {
  let filePath = path.join(__dirname, 'match_center', `s${leagueSerial}.js`);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'match_center', `c${leagueSerial}.js`);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`[错误] match_center 文件不存在: s${leagueSerial}.js 或 c${leagueSerial}.js`);
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const sandbox = { jh: {} };
  vm.createContext(sandbox);
  try {
    vm.runInContext(content, sandbox);
  } catch (e) {
    console.error(`[错误] 解析 match_center 文件失败: ${e.message}`);
    return null;
  }

  return {
    arrLeague: sandbox.arrLeague,
    arrTeam: sandbox.arrTeam,
    rounds: sandbox.jh,
  };
}

/**
 * 从 arrTeam 构建球队 ID → 信息映射
 */
function buildTeamMap(arrTeam) {
  const map = {};
  arrTeam.forEach(team => {
    map[team[0]] = {
      id: team[0],
      chineseName: team[1],
      englishName: team[3],
      slug: toSlug(team[3]),
    };
  });
  return map;
}

/**
 * 检查某场比赛的数据是否已存在（以 matchEvents.json 为标志）
 */
function isMatchDataExists(outputDir) {
  return fs.existsSync(path.join(outputDir, 'matchEvents.json'));
}

// ==========================================================
// 核心：从 HTML 解析并保存赛后数据
// ==========================================================

async function parseAndSavePostMatchData(html, outputDir, matchSerial) {
  const jsonData = extractJsonData(html);
  if (!jsonData) {
    return false;
  }

  let postMatchSummary = extractPostMatchSummaryFromHtml(html);
  if (!postMatchSummary && matchSerial) {
    postMatchSummary = await fetchPostMatchSummary(matchSerial);
  }
  ensureDir(outputDir);

  // 基础信息
  const matchInfo = {
    matchId: jsonData.info?.id,
    homeName: jsonData.info?.homeName,
    awayName: jsonData.info?.awayName,
    stateCode: jsonData.info?.stateCode,
    postMatchSummary: postMatchSummary || '',
  };
  saveJSON(path.join(outputDir, 'matchInfo.json'), matchInfo);

  // 比赛事件
  const eventsData = {
    matchId: jsonData.info?.id,
    homeName: jsonData.info?.homeName,
    awayName: jsonData.info?.awayName,
    events: formatEvents(jsonData.events?.eventList),
    cornerEvents: jsonData.conerEvent || null,
  };
  saveJSON(path.join(outputDir, 'matchEvents.json'), eventsData);

  // 技术统计
  const techStatsData = {
    matchId: jsonData.info?.id,
    homeName: jsonData.info?.homeName,
    awayName: jsonData.info?.awayName,
    fullMatch: formatTechStats(jsonData.techStat?.itemList),
    firstHalf: formatTechStats(jsonData.techStat?.firstHalfList),
    secondHalf: formatTechStats(jsonData.techStat?.secondHalfList),
    recentAvg: {
      last10: formatTechStats(jsonData.lastTechStat?.itemList),
      last5: formatTechStats(jsonData.last5TechStat?.itemList),
      last3: formatTechStats(jsonData.last3TechStat?.itemList),
    },
  };
  saveJSON(path.join(outputDir, 'techStats.json'), techStatsData);

  // 阵容
  const lineupData = formatLineup(jsonData.lineup);
  if (lineupData) {
    lineupData.matchId = jsonData.info?.id;
    lineupData.homeName = jsonData.info?.homeName;
    lineupData.awayName = jsonData.info?.awayName;
    saveJSON(path.join(outputDir, 'lineup.json'), lineupData);
  }

  // 球员技术统计
  const playerTechData = formatPlayerTech(jsonData.playerTech);
  if (playerTechData) {
    playerTechData.matchId = jsonData.info?.id;
    playerTechData.homeName = jsonData.info?.homeName;
    playerTechData.awayName = jsonData.info?.awayName;
    saveJSON(path.join(outputDir, 'playerStats.json'), playerTechData);
  }

  // 进失球概率
  if (jsonData.jsq) {
    const jsqData = {
      matchId: jsonData.info?.id,
      homeName: jsonData.info?.homeName,
      awayName: jsonData.info?.awayName,
      goalProbability: jsonData.jsq.jsqList,
    };
    saveJSON(path.join(outputDir, 'goalProbability.json'), jsqData);
  }

  return true;
}

// ==========================================================
// 核心：爬取单场比赛
// ==========================================================

async function crawlSingleMatch(matchSerial) {
  const res = await service({
    method: 'GET',
    url: `https://m.titan007.com/Analy/ShiJian/${matchSerial}.htm`,
    headers: qiutanMHeaders(matchSerial),
    responseType: 'arraybuffer',
  });
  return iconv.decode(res.data, 'utf-8');
}

// ==========================================================
// 入口：批量增量爬取
// ==========================================================

async function main() {
  const args = process.argv.slice(2);

  // ====== 模式一：从本地文件解析单场 ======
  const localIdx = args.indexOf('--local');
  if (localIdx !== -1 && args[localIdx + 1]) {
    const localFilePath = path.resolve(__dirname, args[localIdx + 1]);
    const matchIdx = args.indexOf('--match');
    const matchSerial = matchIdx !== -1 ? args[matchIdx + 1] : 'unknown';

    // 尝试从 match_center 查找队伍信息和轮次来确定输出目录
    let outputDir;
    const matchCenter = parseMatchCenterFile(LEAGUE_SERIAL);
    if (matchCenter) {
      const teamMap = buildTeamMap(matchCenter.arrTeam);
      let foundMatch = null;
      let foundRound = null;
      for (const roundKey of Object.keys(matchCenter.rounds)) {
        const found = matchCenter.rounds[roundKey].find(m => String(m[0]) === String(matchSerial));
        if (found) {
          foundMatch = found;
          foundRound = roundKey.replace('R_', '');
          break;
        }
      }
      if (foundMatch && foundRound) {
        const homeSlug = teamMap[foundMatch[4]]?.slug || 'home';
        const awaySlug = teamMap[foundMatch[5]]?.slug || 'away';
        outputDir = path.join(BASE_OUTPUT_DIR, `round-${foundRound}`, `${homeSlug}_vs_${awaySlug}`);
      }
    }
    if (!outputDir) {
      outputDir = path.join(BASE_OUTPUT_DIR, `match_${matchSerial}`);
    }

    console.log(`[本地模式] 从文件解析: ${localFilePath}`);
    const htmlBuffer = fs.readFileSync(localFilePath);
    const html = iconv.decode(htmlBuffer, 'utf-8');
    const ok = await parseAndSavePostMatchData(html, outputDir, matchSerial);
    if (ok) {
      console.log(`[完成] 数据已保存至: ${outputDir}`);
    }
    return;
  }

  // ====== 模式二：批量增量爬取 ======
  console.log('='.repeat(60));
  console.log(`赛后数据批量增量爬取`);
  console.log(`联赛: ${LEAGUE_SLUG.toUpperCase()} (ID: ${LEAGUE_SERIAL})  赛季: ${SEASON}`);
  console.log(`输出根目录: ${BASE_OUTPUT_DIR}`);
  console.log('='.repeat(60));

  // 1. 解析 match_center 文件
  const matchCenter = parseMatchCenterFile(LEAGUE_SERIAL);
  if (!matchCenter) {
    console.error('[终止] 无法读取 match_center 数据');
    return;
  }
  const teamMap = buildTeamMap(matchCenter.arrTeam);

  // 2. 确定需要爬取的轮次范围
  const roundArg = args.indexOf('--round');
  let targetRounds = [];
  if (roundArg !== -1 && args[roundArg + 1]) {
    // 指定轮次
    targetRounds = [args[roundArg + 1]];
  } else {
    // 全部轮次
    targetRounds = Object.keys(matchCenter.rounds)
      .map(k => {
        // 联赛格式 R_31 → 31，杯赛格式 G27838 → G27838
        return k.startsWith('R_') ? k.replace('R_', '') : k;
      })
      .sort((a, b) => {
        // 数字轮次按数字排序，其他按字符串排序
        const aNum = parseInt(a);
        const bNum = parseInt(b);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return a.localeCompare(b);
      });
  }

  // 3. 遍历轮次，收集需要爬取的比赛
  const pendingMatches = [];
  const skippedMatches = [];
  const notFinishedMatches = [];

  for (const round of targetRounds) {
    let roundKey = `R_${round}`;
    let matches = matchCenter.rounds[roundKey];
    
    // 如果是杯赛（G开头），尝试直接使用 round 作为 key
    if (!matches && round.startsWith('G')) {
      roundKey = round;
      matches = matchCenter.rounds[roundKey];
    }
    
    if (!matches) continue;

    // 处理杯赛嵌套结构：[[homeId, awayId, score1, score2, [leg1], [leg2]], ...]
    const isCupFormat = Array.isArray(matches[0]) && matches[0].length >= 5 && Array.isArray(matches[0][4]);
    
    if (isCupFormat) {
      // 杯赛格式：展开每个对阵的两回合
      for (const tie of matches) {
        const legs = [tie[4], tie[5]].filter(leg => leg && leg[0]);
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
          const outputDir = path.join(BASE_OUTPUT_DIR, roundDir, folderName);

          if (stateCode !== -1 || !fullScore) {
            notFinishedMatches.push({ matchSerial, round, homeInfo, awayInfo });
            continue;
          }

          if (isMatchDataExists(outputDir)) {
            skippedMatches.push({ matchSerial, round, homeInfo, awayInfo });
            continue;
          }

          pendingMatches.push({
            matchSerial, round, homeTeamId, awayTeamId,
            homeInfo, awayInfo, fullScore, folderName, outputDir,
          });
        }
      }
    } else {
      // 联赛格式：扁平数组
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
        const outputDir = path.join(BASE_OUTPUT_DIR, roundDir, folderName);

        if (stateCode !== -1 || !fullScore) {
          notFinishedMatches.push({ matchSerial, round, homeInfo, awayInfo });
          continue;
        }

        if (isMatchDataExists(outputDir)) {
          skippedMatches.push({ matchSerial, round, homeInfo, awayInfo });
          continue;
        }

        pendingMatches.push({
          matchSerial, round, homeTeamId, awayTeamId,
          homeInfo, awayInfo, fullScore, folderName, outputDir,
        });
      }
    }
  }

  // 4. 输出统计摘要
  console.log(`\n[统计]`);
  console.log(`  已完赛且已保存(跳过): ${skippedMatches.length} 场`);
  console.log(`  未完赛(跳过):         ${notFinishedMatches.length} 场`);
  console.log(`  待爬取:               ${pendingMatches.length} 场`);

  if (pendingMatches.length === 0) {
    console.log('\n[完成] 没有需要爬取的新数据，所有已完赛比赛数据均已保存。');
    return;
  }

  console.log(`\n[开始爬取] 共 ${pendingMatches.length} 场，每场间隔 ${CRAWL_DELAY_MS / 1000} 秒\n`);

  // 5. 逐场爬取
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < pendingMatches.length; i++) {
    const m = pendingMatches[i];
    const progress = `[${i + 1}/${pendingMatches.length}]`;
    console.log(`${progress} R${m.round} ${m.homeInfo.chineseName} vs ${m.awayInfo.chineseName} (${m.fullScore}) - ID:${m.matchSerial}`);

    try {
      const html = await crawlSingleMatch(m.matchSerial);
      const ok = await parseAndSavePostMatchData(html, m.outputDir, m.matchSerial);
      if (ok) {
        console.log(`  ✓ 保存至: round-${m.round}/${m.folderName}/`);
        successCount++;
      } else {
        console.log(`  ✗ 数据解析失败`);
        failCount++;
      }
    } catch (err) {
      console.error(`  ✗ 爬取失败: ${err.message}`);
      failCount++;
    }

    // 非最后一场时等待
    if (i < pendingMatches.length - 1) {
      await sleep(CRAWL_DELAY_MS);
    }
  }

  // 6. 最终汇总
  console.log('\n' + '='.repeat(60));
  console.log(`[爬取完成]`);
  console.log(`  成功: ${successCount} 场`);
  console.log(`  失败: ${failCount} 场`);
  console.log(`  数据目录: ${BASE_OUTPUT_DIR}`);
  console.log('='.repeat(60));
}

// 启动
main().catch(err => {
  console.error('[致命错误]', err);
  process.exit(1);
});
