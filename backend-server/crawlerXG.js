/**
 * xG 排行榜统计脚本
 *
 * 从 basicData 中读取所有已爬取的比赛数据，统计每支球队的：
 * 1. 预期进球数 (xG)
 * 2. 实际进球数 (Goals)
 * 3. 实际进球 - 预期进球 差值 (Goals - xG)
 *
 * 使用方式:
 *   node crawlerXG.js                 # 统计全部轮次
 *   node crawlerXG.js --rounds 19-26  # 统计第19~26轮
 *   node crawlerXG.js --rounds 26     # 仅统计第26轮
 * 配置来源: config/wudaconfig.js (leagueSlug, season)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ============ 配置 ============
const config = require('./config/wudaconfig');
const LEAGUE_SLUG = config.leagueSlug;
const LEAGUE_SERIAL = config.leagueSerial;
const SEASON = config.season;
const BASE_DIR = path.join(__dirname, 'basicData', LEAGUE_SLUG, SEASON);

// ============ match_center 解析 ============

/**
 * 解析 match_center 文件，获取球队信息和赛程数据
 */
function parseMatchCenterFile(leagueSerial) {
  const filePath = path.join(__dirname, 'match_center', `s${leagueSerial}.js`);
  if (!fs.existsSync(filePath)) {
    console.warn(`[警告] match_center 文件不存在: ${filePath}，将使用中文队名聚合`);
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const sandbox = { jh: {} };
  vm.createContext(sandbox);
  try {
    vm.runInContext(content, sandbox);
  } catch (e) {
    console.warn(`[警告] 解析 match_center 文件失败: ${e.message}，将使用中文队名聚合`);
    return null;
  }
  return {
    arrTeam: sandbox.arrTeam,
    rounds: sandbox.jh,
  };
}

/**
 * 从 arrTeam 构建 teamId -> { chineseName, englishName } 映射
 * arrTeam 格式: [[id, 中文名, 繁体名, 英文名, ...], ...]
 */
function buildTeamIdMap(arrTeam) {
  const map = {};
  if (!Array.isArray(arrTeam)) return map;
  for (const t of arrTeam) {
    map[t[0]] = { chineseName: t[1], englishName: t[3] };
  }
  return map;
}

/**
 * 从 jh 赛程数据构建 matchId -> { homeTeamId, awayTeamId, round } 映射
 * jh[R_N] 格式: [[matchId, leagueId, stateCode, datetime, homeTeamId, awayTeamId, ...], ...]
 */
function buildMatchIdMap(rounds) {
  const map = {};
  for (const roundKey of Object.keys(rounds)) {
    const round = roundKey.replace('R_', '');
    for (const m of rounds[roundKey]) {
      map[m[0]] = { homeTeamId: m[4], awayTeamId: m[5], round };
    }
  }
  return map;
}

// ============ 工具函数 ============

/**
 * 安全读取 JSON 文件，失败返回 null
 */
function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * 从 matchEvents.json 统计主客队进球数
 * 只统计 type === 'goal' 的事件（不含乌龙球 ownGoal 等）
 */
function countGoals(events) {
  let homeGoals = 0;
  let awayGoals = 0;

  if (!Array.isArray(events)) return { homeGoals, awayGoals };

  for (const evt of events) {
    if (evt.type === 'goal') {
      if (evt.kind === 'HOME') homeGoals++;
      else if (evt.kind === 'AWAY') awayGoals++;
    }
  }

  return { homeGoals, awayGoals };
}

/**
 * 从 techStats.json 的 fullMatch 中提取 xG
 * 兼容两种键名: 19~22轮为 "预期进球"，23轮起为 "预期进球(xG)"
 */
function extractXG(techStats) {
  if (!techStats || !techStats.fullMatch) return null;

  const xgEntry = techStats.fullMatch['预期进球(xG)'] || techStats.fullMatch['预期进球'];
  if (!xgEntry) return null;

  return {
    homeXG: parseFloat(xgEntry.home) || 0,
    awayXG: parseFloat(xgEntry.away) || 0,
  };
}

/**
 * 从 techStats.json 的 fullMatch 中提取射门和射正
 */
function extractShots(techStats) {
  if (!techStats || !techStats.fullMatch) return null;

  const shootEntry = techStats.fullMatch['射门'];
  const targetEntry = techStats.fullMatch['射正'];
  if (!shootEntry) return null;

  return {
    homeShots: parseInt(shootEntry.home) || 0,
    awayShots: parseInt(shootEntry.away) || 0,
    homeShotsOnTarget: targetEntry ? (parseInt(targetEntry.home) || 0) : 0,
    awayShotsOnTarget: targetEntry ? (parseInt(targetEntry.away) || 0) : 0,
  };
}

/**
 * 从 techStats.json 的 fullMatch 中提取控球率
 */
function extractPossession(techStats) {
  if (!techStats || !techStats.fullMatch) return null;

  const entry = techStats.fullMatch['控球率'];
  if (!entry) return null;

  return {
    homePoss: parseFloat(entry.home) || 0,
    awayPoss: parseFloat(entry.away) || 0,
  };
}

/**
 * 格式化数字，保留两位小数，正数前面加 +
 */
function fmt(num) {
  return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
}

/**
 * 在控制台输出表格，自动对齐
 */
function printTable(title, rows, columns) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(70));

  // 计算每列最大宽度
  const widths = columns.map((col, i) => {
    const headerLen = getDisplayWidth(col.header);
    const maxDataLen = rows.reduce((max, row) => {
      const val = col.format ? col.format(row[col.key]) : String(row[col.key]);
      return Math.max(max, getDisplayWidth(val));
    }, 0);
    return Math.max(headerLen, maxDataLen);
  });

  // 打印表头
  const headerLine = columns.map((col, i) => {
    return padRight(col.header, widths[i]);
  }).join('  ');
  console.log(`  ${headerLine}`);
  console.log(`  ${widths.map(w => '-'.repeat(w)).join('  ')}`);

  // 打印数据行
  rows.forEach((row, idx) => {
    const line = columns.map((col, i) => {
      const val = col.format ? col.format(row[col.key]) : String(row[col.key]);
      return col.alignRight ? padLeft(val, widths[i]) : padRight(val, widths[i]);
    }).join('  ');
    console.log(`  ${line}`);
  });
}

/**
 * 获取字符串显示宽度（中文字符算2个宽度）
 */
function getDisplayWidth(str) {
  let width = 0;
  for (const ch of str) {
    width += (ch.charCodeAt(0) > 0x7F) ? 2 : 1;
  }
  return width;
}

/**
 * 右填充至指定显示宽度
 */
function padRight(str, targetWidth) {
  const diff = targetWidth - getDisplayWidth(str);
  return str + ' '.repeat(Math.max(0, diff));
}

/**
 * 左填充至指定显示宽度
 */
function padLeft(str, targetWidth) {
  const diff = targetWidth - getDisplayWidth(str);
  return ' '.repeat(Math.max(0, diff)) + str;
}

// ============ 主逻辑 ============

/**
 * 解析 --rounds 参数，支持格式: 19-26 (范围) 或 19 (单轮)
 * 不传则返回 null 表示使用全部轮次
 */
function parseRoundsArg() {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--rounds');
  if (idx === -1 || !args[idx + 1]) return null;

  const val = args[idx + 1];
  const rangeMatch = val.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    if (start > end) {
      console.error(`[错误] --rounds 范围无效: ${val}，起始轮次不能大于结束轮次`);
      process.exit(1);
    }
    return { start, end };
  }

  const single = parseInt(val);
  if (!isNaN(single)) {
    return { start: single, end: single };
  }

  console.error(`[错误] --rounds 参数格式无效: ${val}，正确格式: --rounds 19-26 或 --rounds 19`);
  process.exit(1);
}

function main() {
  const roundsRange = parseRoundsArg();
  const rangeLabel = roundsRange
    ? (roundsRange.start === roundsRange.end
      ? `第 ${roundsRange.start} 轮`
      : `第 ${roundsRange.start} ~ ${roundsRange.end} 轮`)
    : '全部轮次';

  console.log('='.repeat(70));
  console.log(`  xG 排行榜统计`);
  console.log(`  联赛: ${LEAGUE_SLUG.toUpperCase()}  赛季: ${SEASON}`);
  console.log(`  统计范围: ${rangeLabel}`);
  console.log(`  数据目录: ${BASE_DIR}`);
  console.log('='.repeat(70));

  if (!fs.existsSync(BASE_DIR)) {
    console.error(`[错误] 数据目录不存在: ${BASE_DIR}`);
    process.exit(1);
  }

  // 遍历所有 round-N 目录，按 --rounds 过滤
  const roundDirs = fs.readdirSync(BASE_DIR)
    .filter(d => d.startsWith('round-') && fs.statSync(path.join(BASE_DIR, d)).isDirectory())
    .filter(d => {
      if (!roundsRange) return true;
      const num = parseInt(d.replace('round-', ''));
      return num >= roundsRange.start && num <= roundsRange.end;
    })
    .sort((a, b) => parseInt(a.replace('round-', '')) - parseInt(b.replace('round-', '')));

  // 解析 match_center，构建球队ID映射（解决中文队名不唯一的问题）
  const matchCenter = parseMatchCenterFile(LEAGUE_SERIAL);
  const teamIdMap = matchCenter ? buildTeamIdMap(matchCenter.arrTeam) : {};
  const matchIdMap = matchCenter ? buildMatchIdMap(matchCenter.rounds) : {};
  const useTeamId = matchCenter !== null;

  if (useTeamId) {
    console.log(`  球队标识: 使用 match_center 球队ID (共 ${Object.keys(teamIdMap).length} 支)`);
  } else {
    console.log(`  球队标识: 使用中文队名（可能存在同队不同名）`);
  }

  // 球队统计数据汇总，key 为 teamId（优先）或中文名（降级方案）
  const teamStats = {};
  let matchesWithXG = 0;
  let matchesTotal = 0;
  let matchesNoXG = 0;

  /**
   * 根据 matchId 获取主客队的唯一标识 key 和显示名
   * 优先使用 match_center 的 teamId，降级使用 techStats 中的中文名
   */
  function resolveTeamKeys(matchId, homeCnName, awayCnName) {
    if (useTeamId && matchId && matchIdMap[matchId]) {
      const { homeTeamId, awayTeamId } = matchIdMap[matchId];
      const homeInfo = teamIdMap[homeTeamId];
      const awayInfo = teamIdMap[awayTeamId];
      return {
        homeKey: String(homeTeamId),
        awayKey: String(awayTeamId),
        homeDisplayName: homeInfo ? homeInfo.chineseName : homeCnName,
        awayDisplayName: awayInfo ? awayInfo.chineseName : awayCnName,
      };
    }
    return {
      homeKey: homeCnName,
      awayKey: awayCnName,
      homeDisplayName: homeCnName,
      awayDisplayName: awayCnName,
    };
  }

  function initTeamStat(key, displayName) {
    if (!teamStats[key]) {
      teamStats[key] = {
        displayName,
        xg: 0, goals: 0, matches: 0, xgMatches: 0, xgGoals: 0,
        possession: 0, possMatches: 0, shots: 0, shotsOnTarget: 0,
      };
    }
  }

  for (const roundDir of roundDirs) {
    const roundPath = path.join(BASE_DIR, roundDir);
    const matchDirs = fs.readdirSync(roundPath)
      .filter(d => fs.statSync(path.join(roundPath, d)).isDirectory());

    for (const matchDir of matchDirs) {
      const matchPath = path.join(roundPath, matchDir);
      matchesTotal++;

      // 读取 techStats 和 matchEvents
      const techStats = readJSON(path.join(matchPath, 'techStats.json'));
      const eventsData = readJSON(path.join(matchPath, 'matchEvents.json'));

      if (!techStats || !eventsData) continue;

      const matchId = techStats.matchId || eventsData.matchId;
      const homeCnName = techStats.homeName;
      const awayCnName = techStats.awayName;

      if (!homeCnName || !awayCnName) continue;

      // 解析唯一标识
      const { homeKey, awayKey, homeDisplayName, awayDisplayName } =
        resolveTeamKeys(matchId, homeCnName, awayCnName);

      // 统计进球
      const { homeGoals, awayGoals } = countGoals(eventsData.events);

      // 提取 xG
      const xgData = extractXG(techStats);

      // 初始化球队记录
      initTeamStat(homeKey, homeDisplayName);
      initTeamStat(awayKey, awayDisplayName);

      // 累计进球数（所有比赛都统计）
      teamStats[homeKey].goals += homeGoals;
      teamStats[homeKey].matches++;
      teamStats[awayKey].goals += awayGoals;
      teamStats[awayKey].matches++;

      // 累计 xG（仅有 xG 数据时），同时记录这些比赛的进球数用于差值计算
      if (xgData) {
        teamStats[homeKey].xg += xgData.homeXG;
        teamStats[homeKey].xgMatches++;
        teamStats[homeKey].xgGoals += homeGoals;
        teamStats[awayKey].xg += xgData.awayXG;
        teamStats[awayKey].xgMatches++;
        teamStats[awayKey].xgGoals += awayGoals;
        matchesWithXG++;
      } else {
        matchesNoXG++;
      }

      // 累计控球率
      const possData = extractPossession(techStats);
      if (possData) {
        teamStats[homeKey].possession += possData.homePoss;
        teamStats[homeKey].possMatches++;
        teamStats[awayKey].possession += possData.awayPoss;
        teamStats[awayKey].possMatches++;
      }

      // 累计射门和射正
      const shotsData = extractShots(techStats);
      if (shotsData) {
        teamStats[homeKey].shots += shotsData.homeShots;
        teamStats[homeKey].shotsOnTarget += shotsData.homeShotsOnTarget;
        teamStats[awayKey].shots += shotsData.awayShots;
        teamStats[awayKey].shotsOnTarget += shotsData.awayShotsOnTarget;
      }
    }
  }

  // 输出统计概览
  console.log(`\n[数据概览]`);
  console.log(`  扫描轮次: ${roundDirs.length} 轮 (${roundDirs[0]} ~ ${roundDirs[roundDirs.length - 1]})`);
  console.log(`  比赛总数: ${matchesTotal} 场`);
  console.log(`  含 xG 数据: ${matchesWithXG} 场`);
  console.log(`  无 xG 数据: ${matchesNoXG} 场`);
  console.log(`  球队总数: ${Object.keys(teamStats).length} 支`);

  if (matchesNoXG > 0) {
    console.log(`\n  ⚠ 注意: 有 ${matchesNoXG} 场比赛缺少 xG 数据，xG 排行仅基于有数据的比赛`);
  }

  // 构造排行榜数据（使用 displayName 作为展示名）
  const teams = Object.entries(teamStats).map(([key, s]) => ({
    name: s.displayName,
    xg: s.xg,
    goals: s.goals,
    xgGoals: s.xgGoals,         // 仅有 xG 数据的比赛中的进球数
    diff: s.xgGoals - s.xg,     // 差值基于同一组比赛（有 xG 数据的比赛）
    matches: s.matches,
    xgMatches: s.xgMatches,
    goalsPerMatch: s.matches > 0 ? s.goals / s.matches : 0,
    xgPerMatch: s.xgMatches > 0 ? s.xg / s.xgMatches : 0,
    avgPoss: s.possMatches > 0 ? s.possession / s.possMatches : 0,
    possMatches: s.possMatches,
    shots: s.shots,
    shotsOnTarget: s.shotsOnTarget,
    shotConversion: s.shots > 0 ? s.goals / s.shots : 0,
    sotConversion: s.shotsOnTarget > 0 ? s.goals / s.shotsOnTarget : 0,
  }));

  // 定义表格列
  const rankCol = { header: '#', key: '_rank', alignRight: true };
  const nameCol = { header: '球队', key: 'name' };
  const matchesCol = { header: '场次', key: 'matches', alignRight: true };
  const xgMatchesCol = { header: 'xG场次', key: 'xgMatches', alignRight: true };

  // ========== 排行榜1: xG 排行（降序） ==========
  const xgRanking = [...teams]
    .sort((a, b) => b.xg - a.xg)
    .map((t, i) => ({ ...t, _rank: i + 1 }));

  printTable('预期进球数 (xG) 排行榜', xgRanking, [
    rankCol,
    nameCol,
    { header: 'xG', key: 'xg', format: v => v.toFixed(2), alignRight: true },
    xgMatchesCol,
    { header: '场均xG', key: 'xgPerMatch', format: v => v.toFixed(2), alignRight: true },
    matchesCol,
  ]);

  // ========== 排行榜2: 实际进球排行（降序） ==========
  const goalRanking = [...teams]
    .sort((a, b) => b.goals - a.goals)
    .map((t, i) => ({ ...t, _rank: i + 1 }));

  printTable('实际进球数 (Goals) 排行榜', goalRanking, [
    rankCol,
    nameCol,
    { header: '进球', key: 'goals', alignRight: true },
    matchesCol,
    { header: '场均进球', key: 'goalsPerMatch', format: v => v.toFixed(2), alignRight: true },
  ]);

  // ========== 排行榜3: Goals - xG 差值排行（降序） ==========
  const diffRanking = [...teams]
    .sort((a, b) => b.diff - a.diff)
    .map((t, i) => ({ ...t, _rank: i + 1 }));

  printTable('实际进球 - 预期进球 (Goals - xG) 差值排行榜  (仅含xG数据的比赛)', diffRanking, [
    rankCol,
    nameCol,
    { header: '进球', key: 'xgGoals', alignRight: true },
    { header: 'xG', key: 'xg', format: v => v.toFixed(2), alignRight: true },
    { header: '差值', key: 'diff', format: v => fmt(v), alignRight: true },
    xgMatchesCol,
    { header: '射门', key: 'shots', alignRight: true },
    { header: '射正', key: 'shotsOnTarget', alignRight: true },
    { header: '射门转化率', key: 'shotConversion', format: v => (v * 100).toFixed(1) + '%', alignRight: true },
    { header: '射正转化率', key: 'sotConversion', format: v => (v * 100).toFixed(1) + '%', alignRight: true },
  ]);

  // ========== 排行榜4: 平均控球率排行（降序） ==========
  const possRanking = [...teams]
    .sort((a, b) => b.avgPoss - a.avgPoss)
    .map((t, i) => ({ ...t, _rank: i + 1 }));

  printTable('平均控球率排行榜', possRanking, [
    rankCol,
    nameCol,
    { header: '平均控球率', key: 'avgPoss', format: v => v.toFixed(1) + '%', alignRight: true },
    { header: '场次', key: 'possMatches', alignRight: true },
  ]);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  说明: xG 和差值统计仅基于含 xG 数据的 ${matchesWithXG} 场比赛`);
  console.log(`        进球数和控球率统计基于全部 ${matchesTotal} 场比赛的数据`);
  console.log('='.repeat(70));
}

main();
