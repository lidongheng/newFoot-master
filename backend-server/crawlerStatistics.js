/**
 * crawlerStatistics.js
 * 解析球探体育分析页面HTML，提取：
 * - 对赛往绩（近10场）
 * - 主队近期战绩（近10场）
 * - 客队近期战绩（近10场）
 * - 主队未来5场比赛
 * - 客队未来5场比赛
 * - 主队伤病信息
 * - 客队伤病信息
 */

const fs = require('fs');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const { service } = require('./utils/utils');
const staticData = require('./config/wudaconfig');
const { qiutanHeaders } = require('./config/league');

// ========== 亚盘盘口中文 → 数字映射 ==========
const HANDICAP_MAP = {
  '平手': '0',
  '平/半': '0/0.5',
  '半球': '0.5',
  '半/一': '0.5/1',
  '一球': '1',
  '一/球半': '1/1.5',
  '球半': '1.5',
  '球半/两': '1.5/2',
  '球半/二': '1.5/2',
  '两球': '2',
  '两/两球半': '2/2.5',
  '两球半': '2.5',
  '两球半/三': '2.5/3',
  '三球': '3',
  '三/三球半': '3/3.5',
  '三球半': '3.5',
  // 受让
  '受平/半': '0/0.5',
  '受半球': '0.5',
  '受半/一': '0.5/1',
  '受一球': '1',
  '受一/球半': '1/1.5',
  '受球半': '1.5',
  '受球半/两': '1.5/2',
  '受球半/二': '1.5/2',
  '受两球': '2',
  '受两球半': '2.5',
  '受三球': '3',
};

// ========== 大小球数字 → 显示映射 ==========
function formatOULine(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '';
  // 如果是整数或.5结尾，直接显示
  if (num === Math.floor(num)) return String(num);
  if (num * 2 === Math.floor(num * 2)) return String(num);
  // 0.25 → 0/0.5, 0.75 → 0.5/1, etc.
  const lower = num - 0.25;
  const upper = num + 0.25;
  return `${lower}/${upper}`;
}

/**
 * 清理队名（去除排名数字、红牌标记等）
 */
function cleanTeamName(text) {
  return text.replace(/^\d+/, '').replace(/\d+$/, '').trim();
}

/**
 * 盘口中文文本 → 数字显示
 */
function handicapToNumeric(text) {
  text = text.replace(/\*/g, '').trim();
  return HANDICAP_MAP[text] || text;
}

/**
 * 统一让球结果（繁→简）
 */
function normalizeHandicapResult(text) {
  text = text.trim();
  if (text === '贏' || text === '赢') return '赢';
  if (text === '輸' || text === '输') return '输';
  if (text === '走') return '走';
  return text;
}

/**
 * 统一大小球结果
 */
function normalizeTotalResult(text) {
  text = text.trim();
  if (text === '大') return '大';
  if (text === '小') return '小';
  if (text === '走') return '走';
  return text;
}

/**
 * 从 <script> 中提取嵌入的 JavaScript 数组数据
 */
function extractJSArray(html, varName) {
  // 匹配 var xxx = [...];
  const regex = new RegExp(`var\\s+${varName}\\s*=\\s*(\\[.+?\\]);`, 's');
  const match = html.match(regex);
  if (!match) return null;
  try {
    // 安全解析：替换单引号为双引号，处理HTML内容
    // 因为数组中包含 HTML 片段，不能直接 JSON.parse
    // 使用 Function 构造函数来安全 eval
    const fn = new Function(`return ${match[1]};`);
    return fn();
  } catch (e) {
    console.error(`解析 ${varName} 失败:`, e.message);
    return null;
  }
}

/**
 * 从 span HTML 中提取纯文本队名
 */
function extractTeamNameFromHtml(htmlStr) {
  const $ = cheerio.load(htmlStr, null, false);
  let text = $.text().trim();
  // 去除排名数字（如 1布里斯班狮吼 → 布里斯班狮吼）
  text = text.replace(/^\d+/, '').replace(/\d+$/, '').trim();
  return text;
}

/**
 * 从 HTML 表格中解析单场比赛数据
 * @param {CheerioAPI} $ cheerio 实例
 * @param {Element} row 表格行元素
 * @returns {Object|null} 比赛数据
 */
function parseMatchRow($, row) {
  const cells = $(row).find('td');
  if (cells.length < 15) return null;

  const league = $(cells[0]).text().trim();
  const date = $(cells[1]).text().trim();
  const homeTeam = cleanTeamName($(cells[2]).text());
  const scoreRaw = $(cells[3]).find('a').text().trim();
  const score = scoreRaw.split('(')[0].trim();
  const awayTeam = cleanTeamName($(cells[5]).text());

  // 亚盘盘口
  const handicapRaw = $(cells[7]).find('a').text().replace(/\*/g, '').trim();
  const isReceiving = handicapRaw.startsWith('受');
  const handicapNum = handicapToNumeric(handicapRaw);

  // 让球结果、大小球结果
  const resultHandicap = normalizeHandicapResult($(cells[13]).text());
  const resultTotal = normalizeTotalResult($(cells[14]).text());

  // 符号: - 表示主队让球, + 表示主队受让
  const sign = isReceiving ? '+' : '-';
  const handicapDisplay = handicapNum ? `${sign}${handicapNum}${resultHandicap}` : '';
  const totalDisplay = resultTotal;

  return { date, league, homeTeam, score, awayTeam, handicapDisplay, totalDisplay };
}

/**
 * 从嵌入 JS 数据解析单场比赛
 * JS 数组结构:
 *  [0] date, [1] leagueId, [2] leagueName, [3] color,
 *  [4] homeTeamId, [5] homeTeamHtml, [6] awayTeamId, [7] awayTeamHtml,
 *  [8] homeScore, [9] awayScore, [10] halfScore, [11] handicap,
 *  [12] handicapResult(1=home,-1=away,0=draw), [13] ??, [14] totalResult(1=over,-1=under,0=draw),
 *  [15] matchId, [16] homeCorners, [17] awayCorners, [18] leagueUrl, [19] ??
 */
function parseJSMatchEntry(entry) {
  if (!entry || entry.length < 19) return null;

  const date = entry[0];
  const league = entry[2];
  const homeTeam = extractTeamNameFromHtml(String(entry[5]));
  const awayTeam = extractTeamNameFromHtml(String(entry[7]));
  const homeScore = entry[8];
  const awayScore = entry[9];
  const score = `${homeScore}-${awayScore}`;

  return { date, league, homeTeam, awayTeam, score, homeScore, awayScore };
}

/**
 * 解析 Vs_hOdds，构建 matchId → { handicap, ouLine } 的初盘映射
 * Vs_hOdds 结构:
 *  [0] matchId, [1] bookmakerID,
 *  [2] 初盘主odds, [3] 初盘亚盘盘口, [4] 初盘客odds,
 *  [5] 终盘主odds, [6] 终盘亚盘盘口, [7] 终盘客odds,
 *  [8] 初盘大小球线, [9] 终盘大小球线,
 *  ...
 * 返回: { matchId: { handicap, ouLine } } 的映射 (使用第一个庄家的初盘数据)
 */
function buildInitialOddsMap(html, $) {
  const vsHOdds = extractJSArray(html, 'Vs_hOdds');
  if (!vsHOdds) return {};

  // 从页面 select 获取默认选中的庄家 ID（对赛往绩和近期战绩共用同一套 Vs_hOdds）
  // 默认取 hSelect_v 的 selected option value（通常是 3 = Crowns）
  let preferredBookmaker = 3; // 默认 Crowns
  if ($) {
    const selectedVal = $('#hSelect_v option[selected]').attr('value') ||
                        $('#hSelect_hn option[selected]').attr('value');
    if (selectedVal) preferredBookmaker = parseInt(selectedVal, 10);
  }

  const oddsMap = {};
  for (const entry of vsHOdds) {
    const matchId = entry[0];
    const bookmaker = entry[1];

    if (oddsMap[matchId] === undefined) {
      // 初次遇到该比赛，先存入
      oddsMap[matchId] = {
        handicap: entry[3],
        ouLine: entry[8],
        bookmaker: bookmaker,
      };
    } else if (bookmaker === preferredBookmaker && oddsMap[matchId].bookmaker !== preferredBookmaker) {
      // 如果当前庄家是首选庄家，覆盖之前的非首选庄家数据
      oddsMap[matchId] = {
        handicap: entry[3],
        ouLine: entry[8],
        bookmaker: bookmaker,
      };
    }
  }
  return oddsMap;
}

/**
 * 根据 matchId 获取初盘大小球盘口线并格式化显示（含自行计算结果）
 * @param {Object} oddsMap matchId → { handicap, ouLine } 的映射
 * @param {number|string} matchId 比赛ID
 * @param {string} score 比分（如 '1-2'）
 * @returns {string} 格式化的大小球显示（如 '3大'、'2.5小'）
 */
function getOUDisplay(oddsMap, matchId, score) {
  const odds = oddsMap[matchId];
  if (!odds || odds.ouLine === undefined || odds.ouLine === '') return '';
  const ouLine = formatOULine(odds.ouLine);
  if (!ouLine) return '';
  const result = calcTotalResult(odds.ouLine, score);
  return `${ouLine}${result}`;
}

/**
 * 根据 matchId 获取初盘亚盘盘口并格式化显示（含自行计算结果）
 * @param {Object} oddsMap matchId → { handicap, ouLine } 的映射
 * @param {number|string} matchId 比赛ID
 * @param {string} score 比分（如 '1-2'）
 * @param {string} perspective 从谁的视角判断结果：'home'=比赛主队视角, 'away'=比赛客队视角
 * @returns {string} 格式化的亚盘显示（如 '-0/0.5赢'、'0输'）
 */
function getHandicapDisplay(oddsMap, matchId, score, perspective = 'home') {
  const odds = oddsMap[matchId];
  if (!odds || odds.handicap === undefined || odds.handicap === '') return '';
  const hcRaw = parseFloat(odds.handicap);
  if (isNaN(hcRaw)) return '';

  // handicap 是比赛主队让球值（正=主让，负=主受让）
  const hcDisplay = handicapValueToDisplay(odds.handicap);

  // 计算盘口结果（从比赛主队视角）
  // handicap 正数 = 主队让球，所以主队净胜 = 实际净胜 - 让球数
  const parts = score.split('-');
  const homeGoals = parseInt(parts[0], 10) || 0;
  const awayGoals = parseInt(parts[1], 10) || 0;
  // diff > 0 表示比赛主队赢盘，diff < 0 表示比赛主队输盘
  const diff = homeGoals - awayGoals - hcRaw;

  let result;
  if (perspective === 'home') {
    // 从比赛主队视角
    if (diff > 0) result = '赢';
    else if (diff < 0) result = '输';
    else result = '走';
  } else {
    // 从比赛客队视角（结果反转）
    if (diff > 0) result = '输';
    else if (diff < 0) result = '赢';
    else result = '走';
  }

  return `${hcDisplay}${result}`;
}

/**
 * 根据大小球盘口线和比分，自行计算大小球结果
 * 当有明确的盘口线时，应使用此函数计算结果（而非 HTML 表格中基于终盘的结果）
 * @param {string|number} ouLine 大小球盘口线（如 '2.5', '3', '2.75'）
 * @param {string} score 比分（如 '1-2'）
 * @returns {string} '大'|'小'|'走'
 */
function calcTotalResult(ouLine, score) {
  const line = parseFloat(ouLine);
  if (isNaN(line)) return '';
  const parts = score.split('-');
  const totalGoals = (parseInt(parts[0], 10) || 0) + (parseInt(parts[1], 10) || 0);
  const diff = totalGoals - line;
  if (diff > 0) return '大';
  if (diff < 0) return '小';
  return '走';
}

/**
 * 将 JS 数据中的盘口数值转换为显示格式
 * 如 0.5 → '0.5', -0.25 → '-0/0.5', 1.25 → '1/1.5'
 */
function handicapValueToDisplay(val) {
  if (val === '' || val === undefined || val === null) return '';
  const num = parseFloat(val);
  if (isNaN(num)) return '';
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  // 整数或 .5 结尾，直接显示
  if (absNum === 0) return '0';
  if (absNum === Math.floor(absNum)) return `${sign}${absNum}`;
  if (absNum * 2 === Math.floor(absNum * 2)) return `${sign}${absNum}`;

  // .25 结尾 → x/x.5 格式, .75 结尾 → x.5/x+1 格式
  const lower = absNum - 0.25;
  const upper = absNum + 0.25;
  return `${sign}${lower}/${upper}`;
}

// ==========================================================
// 主解析函数
// ==========================================================
function parseStatistics(html) {
  const $ = cheerio.load(html);

  // 从标题获取主客队名称
  const title = $('title').text();
  const titleMatch = title.match(/(.+?)\s*VS\s*(.+?)[\(（]/);
  const pageHomeTeam = titleMatch ? titleMatch[1].trim() : '主队';
  const pageAwayTeam = titleMatch ? titleMatch[2].trim() : '客队';

  // 解析嵌入的 JS 数据
  const vData = extractJSArray(html, 'v_data');
  const hData = extractJSArray(html, 'h_data');
  const aData = extractJSArray(html, 'a_data');
  const oddsMap = buildInitialOddsMap(html, $);

  // 获取页面主队的 teamId（用于判断对赛往绩中的视角）
  // 页面主队是 title 中 VS 前面的队伍，对应 h_data 中的被分析队伍
  // 从 v_data 的 index 属性或 h_data 中获取 pageHomeTeamId
  let pageHomeTeamId = null;
  if (hData && hData.length > 0) {
    // h_data 是页面主队的近期战绩，页面主队的 teamId 出现在 [4] 或 [6]
    // 通过检查哪个 teamId 在所有 h_data 中持续出现来确定
    const teamIdCounts = {};
    hData.slice(0, 10).forEach(e => {
      teamIdCounts[e[4]] = (teamIdCounts[e[4]] || 0) + 1;
      teamIdCounts[e[6]] = (teamIdCounts[e[6]] || 0) + 1;
    });
    // 出现次数最多的（每场都出现的）就是页面主队
    let maxCount = 0;
    for (const [id, count] of Object.entries(teamIdCounts)) {
      if (count > maxCount) {
        maxCount = count;
        pageHomeTeamId = parseInt(id, 10);
      }
    }
  }

  // ==============================
  // 1. 对赛往绩（近10场）— 全部使用初盘数据，从页面主队视角判断亚盘结果
  // ==============================
  console.log('对赛往绩');
  const vRows = $('#table_v tr[id^="trv_"]');
  if (vRows.length > 0) {
    // 方式A：从 HTML 表格解析（本地 HTML 文件场景）
    vRows.each((i, row) => {
      if (i >= 10) return false;
      const match = parseMatchRow($, row);
      if (!match) return;

      let handicapDisplay = match.handicapDisplay;
      let totalDisplay = match.totalDisplay;

      if (vData && vData[i]) {
        const matchId = vData[i][15];
        const matchHomeTeamId = vData[i][4];
        const perspective = (matchHomeTeamId === pageHomeTeamId) ? 'home' : 'away';
        const hcD = getHandicapDisplay(oddsMap, matchId, match.score, perspective);
        if (hcD) handicapDisplay = hcD;
        const ouD = getOUDisplay(oddsMap, matchId, match.score);
        if (ouD) totalDisplay = ouD;
      }

      console.log(`${match.date} ${match.league} ${match.homeTeam} ${match.score} ${match.awayTeam} ${handicapDisplay} ${totalDisplay}`);
    });
  } else if (vData && vData.length > 0) {
    // 方式B：从 JS 数据数组直接解析（在线爬取场景，HTML 表格由前端 JS 动态渲染）
    const count = Math.min(vData.length, 10);
    for (let i = 0; i < count; i++) {
      const match = parseJSMatchEntry(vData[i]);
      if (!match) continue;

      const matchId = vData[i][15];
      const matchHomeTeamId = vData[i][4];
      const perspective = (matchHomeTeamId === pageHomeTeamId) ? 'home' : 'away';
      const handicapDisplay = getHandicapDisplay(oddsMap, matchId, match.score, perspective);
      const totalDisplay = getOUDisplay(oddsMap, matchId, match.score);

      console.log(`${match.date} ${match.league} ${match.homeTeam} ${match.score} ${match.awayTeam} ${handicapDisplay} ${totalDisplay}`);
    }
  }

  // 获取页面客队的 teamId
  let pageAwayTeamId = null;
  if (aData && aData.length > 0) {
    const teamIdCounts = {};
    aData.slice(0, 10).forEach(e => {
      teamIdCounts[e[4]] = (teamIdCounts[e[4]] || 0) + 1;
      teamIdCounts[e[6]] = (teamIdCounts[e[6]] || 0) + 1;
    });
    let maxCount = 0;
    for (const [id, count] of Object.entries(teamIdCounts)) {
      if (count > maxCount) {
        maxCount = count;
        pageAwayTeamId = parseInt(id, 10);
      }
    }
  }

  // ==============================
  // 2. 近期战绩（近10场）— 全部使用初盘数据
  // ==============================
  console.log('\n近期战绩');

  // --- 主队（从页面主队视角） ---
  console.log(pageHomeTeam);
  const hnRows = $('#table_hn tr[id^="trhn_"]');
  if (hnRows.length > 0) {
    // 方式A：从 HTML 表格解析
    hnRows.each((i, row) => {
      if (i >= 10) return false;
      const match = parseMatchRow($, row);
      if (!match) return;

      let handicapDisplay = match.handicapDisplay;
      let totalDisplay = match.totalDisplay;

      if (hData && hData[i]) {
        const matchId = hData[i][15];
        const matchHomeTeamId = hData[i][4];
        const perspective = (matchHomeTeamId === pageHomeTeamId) ? 'home' : 'away';
        const hcD = getHandicapDisplay(oddsMap, matchId, match.score, perspective);
        if (hcD) handicapDisplay = hcD;
        const ouD = getOUDisplay(oddsMap, matchId, match.score);
        if (ouD) totalDisplay = ouD;
      }

      console.log(`${match.date} ${match.league} ${match.homeTeam} ${match.score} ${match.awayTeam} ${handicapDisplay} ${totalDisplay}`);
    });
  } else if (hData && hData.length > 0) {
    // 方式B：从 JS 数据数组直接解析
    const count = Math.min(hData.length, 10);
    for (let i = 0; i < count; i++) {
      const match = parseJSMatchEntry(hData[i]);
      if (!match) continue;

      const matchId = hData[i][15];
      const matchHomeTeamId = hData[i][4];
      const perspective = (matchHomeTeamId === pageHomeTeamId) ? 'home' : 'away';
      const handicapDisplay = getHandicapDisplay(oddsMap, matchId, match.score, perspective);
      const totalDisplay = getOUDisplay(oddsMap, matchId, match.score);

      console.log(`${match.date} ${match.league} ${match.homeTeam} ${match.score} ${match.awayTeam} ${handicapDisplay} ${totalDisplay}`);
    }
  }

  // --- 客队（从页面客队视角） ---
  console.log('\n' + pageAwayTeam);
  const anRows = $('#table_an tr[id^="tran_"]');
  if (anRows.length > 0) {
    // 方式A：从 HTML 表格解析
    anRows.each((i, row) => {
      if (i >= 10) return false;
      const match = parseMatchRow($, row);
      if (!match) return;

      let handicapDisplay = match.handicapDisplay;
      let totalDisplay = match.totalDisplay;

      if (aData && aData[i]) {
        const matchId = aData[i][15];
        const matchHomeTeamId = aData[i][4];
        const perspective = (matchHomeTeamId === pageAwayTeamId) ? 'home' : 'away';
        const hcD = getHandicapDisplay(oddsMap, matchId, match.score, perspective);
        if (hcD) handicapDisplay = hcD;
        const ouD = getOUDisplay(oddsMap, matchId, match.score);
        if (ouD) totalDisplay = ouD;
      }

      console.log(`${match.date} ${match.league} ${match.homeTeam} ${match.score} ${match.awayTeam} ${handicapDisplay} ${totalDisplay}`);
    });
  } else if (aData && aData.length > 0) {
    // 方式B：从 JS 数据数组直接解析
    const count = Math.min(aData.length, 10);
    for (let i = 0; i < count; i++) {
      const match = parseJSMatchEntry(aData[i]);
      if (!match) continue;

      const matchId = aData[i][15];
      const matchHomeTeamId = aData[i][4];
      const perspective = (matchHomeTeamId === pageAwayTeamId) ? 'home' : 'away';
      const handicapDisplay = getHandicapDisplay(oddsMap, matchId, match.score, perspective);
      const totalDisplay = getOUDisplay(oddsMap, matchId, match.score);

      console.log(`${match.date} ${match.league} ${match.homeTeam} ${match.score} ${match.awayTeam} ${handicapDisplay} ${totalDisplay}`);
    }
  }

  // ==============================
  // 3. 未来比赛
  // ==============================
  console.log('\n未来比赛');
  parseFutureMatches($, pageHomeTeam, pageAwayTeam);

  // ==============================
  // 4. 伤病信息
  // ==============================
  console.log('\n伤病信息');
  parseInjuries($, pageHomeTeam, pageAwayTeam);
}

/**
 * 解析未来五场比赛
 */
function parseFutureMatches($, homeTeam, awayTeam) {
  const porlet = $('#porlet_20');
  const tables = porlet.find('table[bgcolor="CECECE"]');

  if (tables.length < 2) {
    console.log('未找到未来比赛数据');
    return;
  }

  // 获取当前比赛的年份信息，从页面标题推断
  const title = $('title').text();
  const seasonMatch = title.match(/(\d{4})-(\d{4})赛季/);
  const currentYear = seasonMatch ? seasonMatch[2].slice(2) : '26';

  // --- 主队未来5场 ---
  console.log(homeTeam);
  const homeTable = $(tables[0]);
  homeTable.find('tr[align="middle"]').each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length < 6) return;

    const dateStr = $(cells[0]).text().trim(); // 格式: 02-14
    const league = $(cells[1]).text().trim();
    const teamsRaw = $(cells[2]).text().trim();
    const teams = teamsRaw.replace(/\s*-\s*/g, 'vs');
    const interval = $(cells[5]).text().trim().replace(/\s+/g, '');

    console.log(`${currentYear}-${dateStr} ${league} ${teams} ${interval}`);
  });

  // --- 客队未来5场 ---
  console.log('\n' + awayTeam);
  const awayTable = $(tables[1]);
  awayTable.find('tr[align="middle"]').each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length < 6) return;

    const dateStr = $(cells[0]).text().trim();
    const league = $(cells[1]).text().trim();
    const teamsRaw = $(cells[2]).text().trim();
    const teams = teamsRaw.replace(/\s*-\s*/g, 'vs');
    const interval = $(cells[5]).text().trim().replace(/\s+/g, '');

    console.log(`${currentYear}-${dateStr} ${league} ${teams} ${interval}`);
  });
}

/**
 * 解析伤病信息（阵容情况 porlet_21 中的缺阵球员）
 */
function parseInjuries($, homeTeam, awayTeam) {
  const porlet = $('#porlet_21');
  if (!porlet.length) {
    console.log('未找到伤病数据');
    return;
  }

  const allTables = porlet.find('table').filter(function() {
    const bg = $(this).attr('bgcolor');
    return bg && bg.toLowerCase().replace('#', '') === 'cecece';
  });

  if (allTables.length < 2) {
    console.log('未找到伤病数据');
    return;
  }

  function extractInjuries(table) {
    const injuries = [];
    $(table).find('tr[align="middle"]').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;
      const playerText = $(cells[0]).text().trim().replace(/\s+/g, ' ');
      const reason = $(cells[1]).text().trim();
      if (!playerText || playerText === '\u00a0' || !reason || reason === '\u00a0') return;
      injuries.push(`${playerText} | ${reason}`);
    });
    return injuries;
  }

  console.log(homeTeam);
  const homeInjuries = extractInjuries(allTables[0]);
  if (homeInjuries.length > 0) {
    homeInjuries.forEach(line => console.log(line));
  } else {
    console.log('无伤病信息');
  }

  console.log('\n' + awayTeam);
  const awayInjuries = extractInjuries(allTables[1]);
  if (awayInjuries.length > 0) {
    awayInjuries.forEach(line => console.log(line));
  } else {
    console.log('无伤病信息');
  }
}

// ==========================================================
// 入口：从 wudaconfig.js 取 matchSerial，用 service 爬取页面
// ==========================================================
const matchSerial = staticData.matchSerial;

console.log('====================================');
console.log('  球探体育数据分析页面解析');
console.log(`  matchSerial: ${matchSerial}`);
console.log('====================================\n');
console.log('对赛往绩的亚盘输赢走是以主队视角计算的');
console.log('主队近期战绩的亚盘输赢走是以主队视角计算的');
console.log('客队近期战绩的亚盘输赢走是以客队视角计算的');

service({
  method: 'GET',
  url: `https://zq.titan007.com/analysis/${matchSerial}cn.htm`,
  headers: qiutanHeaders,
  responseType: 'arraybuffer'
}).then(res => {
  const html = iconv.decode(res.data, 'utf-8');
  parseStatistics(html);
}).catch(err => {
  console.error('爬取失败:', err.message);
});

// 导出供外部使用
module.exports = { parseStatistics };
