/**
 * 球探分析页抓取与结构化解析（由 backend-server/crawlerStatistics.js 迁入）
 * - 对赛往绩 / 主客队近期战绩：最多 30 场，初盘盘口来自 Vs_hOdds
 * - 未来赛程、伤病
 */

const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const { service } = require('../utils/http');
const targets = require('../config/targets');

/** 近期/对赛最多取赛场次 */
const MAX_MATCHES = 30;

// ========== 亚盘盘口中文 → 数字映射 ==========
const HANDICAP_MAP = {
  平手: '0',
  '平/半': '0/0.5',
  半球: '0.5',
  '半/一': '0.5/1',
  一球: '1',
  '一/球半': '1/1.5',
  球半: '1.5',
  '球半/两': '1.5/2',
  '球半/二': '1.5/2',
  两球: '2',
  '两/两球半': '2/2.5',
  两球半: '2.5',
  '两球半/三': '2.5/3',
  三球: '3',
  '三/三球半': '3/3.5',
  三球半: '3.5',
  '受平/半': '0/0.5',
  受半球: '0.5',
  '受半/一': '0.5/1',
  受一球: '1',
  '受一/球半': '1/1.5',
  受球半: '1.5',
  '受球半/两': '1.5/2',
  '受球半/二': '1.5/2',
  受两球: '2',
  受两球半: '2.5',
  受三球: '3',
};

function formatOULine(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '';
  if (num === Math.floor(num)) return String(num);
  if (num * 2 === Math.floor(num * 2)) return String(num);
  const lower = num - 0.25;
  const upper = num + 0.25;
  return `${lower}/${upper}`;
}

function cleanTeamName(text) {
  return text.replace(/^\d+/, '').replace(/\d+$/, '').trim();
}

function handicapToNumeric(text) {
  text = text.replace(/\*/g, '').trim();
  return HANDICAP_MAP[text] || text;
}

function normalizeHandicapResult(text) {
  text = text.trim();
  if (text === '贏' || text === '赢') return '赢';
  if (text === '輸' || text === '输') return '输';
  if (text === '走') return '走';
  return text;
}

function normalizeTotalResult(text) {
  text = text.trim();
  if (text === '大') return '大';
  if (text === '小') return '小';
  if (text === '走') return '走';
  return text;
}

function extractJSArray(html, varName) {
  const regex = new RegExp(`var\\s+${varName}\\s*=\\s*(\\[.+?\\]);`, 's');
  const match = html.match(regex);
  if (!match) return null;
  try {
    const fn = new Function(`return ${match[1]};`);
    return fn();
  } catch (e) {
    console.error(`解析 ${varName} 失败:`, e.message);
    return null;
  }
}

function extractTeamNameFromHtml(htmlStr) {
  const $ = cheerio.load(htmlStr, null, false);
  let text = $.text().trim();
  text = text.replace(/^\d+/, '').replace(/\d+$/, '').trim();
  return text;
}

function parseMatchRow($, row) {
  const cells = $(row).find('td');
  if (cells.length < 15) return null;

  const league = $(cells[0]).text().trim();
  const date = $(cells[1]).text().trim();
  const homeTeam = cleanTeamName($(cells[2]).text());
  const scoreRaw = $(cells[3]).find('a').text().trim();
  const score = scoreRaw.split('(')[0].trim();
  const awayTeam = cleanTeamName($(cells[5]).text());

  const handicapRaw = $(cells[7]).find('a').text().replace(/\*/g, '').trim();
  const isReceiving = handicapRaw.startsWith('受');
  const handicapNum = handicapToNumeric(handicapRaw);

  const resultHandicap = normalizeHandicapResult($(cells[13]).text());
  const resultTotal = normalizeTotalResult($(cells[14]).text());

  const sign = isReceiving ? '+' : '-';
  const handicapDisplay = handicapNum ? `${sign}${handicapNum}${resultHandicap}` : '';
  const totalDisplay = resultTotal;

  return { date, league, homeTeam, score, awayTeam, handicapDisplay, totalDisplay };
}

function parseJSMatchEntry(entry) {
  if (!entry || entry.length < 19) return null;

  const date = entry[0];
  const league = entry[2];
  const homeTeam = extractTeamNameFromHtml(String(entry[5]));
  const awayTeam = extractTeamNameFromHtml(String(entry[7]));
  const homeScore = entry[8];
  const awayScore = entry[9];
  const score = `${homeScore}-${awayScore}`;

  return { date, league, homeTeam, awayTeam, score, homeScore, awayScore, entryHandicap: entry[11] };
}

function buildInitialOddsMap(html, $) {
  const vsHOdds = extractJSArray(html, 'Vs_hOdds');
  if (!vsHOdds) return {};

  let preferredBookmaker = 3;
  if ($) {
    const selectedVal =
      $('#hSelect_v option[selected]').attr('value') || $('#hSelect_hn option[selected]').attr('value');
    if (selectedVal) preferredBookmaker = parseInt(selectedVal, 10);
  }

  const oddsMap = {};
  for (const entry of vsHOdds) {
    const matchId = entry[0];
    const bookmaker = entry[1];

    if (oddsMap[matchId] === undefined) {
      oddsMap[matchId] = {
        handicap: entry[3],
        ouLine: entry[8],
        bookmaker,
      };
    } else if (bookmaker === preferredBookmaker && oddsMap[matchId].bookmaker !== preferredBookmaker) {
      oddsMap[matchId] = {
        handicap: entry[3],
        ouLine: entry[8],
        bookmaker,
      };
    }
  }
  return oddsMap;
}

function getOUDisplay(oddsMap, matchId, score) {
  const odds = oddsMap[matchId];
  if (!odds || odds.ouLine === undefined || odds.ouLine === '') return '';
  const ouLine = formatOULine(odds.ouLine);
  if (!ouLine) return '';
  const result = calcTotalResult(odds.ouLine, score);
  return `${ouLine}${result}`;
}

function getHandicapDisplay(oddsMap, matchId, score, perspective = 'home') {
  const odds = oddsMap[matchId];
  if (!odds || odds.handicap === undefined || odds.handicap === '') return '';
  const hcRaw = parseFloat(odds.handicap);
  if (isNaN(hcRaw)) return '';

  const hcDisplay = handicapValueToDisplay(odds.handicap);

  const parts = score.split('-');
  const homeGoals = parseInt(parts[0], 10) || 0;
  const awayGoals = parseInt(parts[1], 10) || 0;
  const diff = homeGoals - awayGoals - hcRaw;

  let result;
  if (perspective === 'home') {
    if (diff > 0) result = '赢';
    else if (diff < 0) result = '输';
    else result = '走';
  } else {
    if (diff > 0) result = '输';
    else if (diff < 0) result = '赢';
    else result = '走';
  }

  return `${hcDisplay}${result}`;
}

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

function handicapValueToDisplay(val) {
  if (val === '' || val === undefined || val === null) return '';
  const num = parseFloat(val);
  if (isNaN(num)) return '';
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum === 0) return '0';
  if (absNum === Math.floor(absNum)) return `${sign}${absNum}`;
  if (absNum * 2 === Math.floor(absNum * 2)) return `${sign}${absNum}`;

  const lower = absNum - 0.25;
  const upper = absNum + 0.25;
  return `${sign}${lower}/${upper}`;
}

/**
 * 从球队视角计算亚盘结果类型（与 cycleReportGenerator 一致）
 */
function computeHandicapResultType(handicap, score, isAnalyzedTeamHome) {
  const hcRaw = parseFloat(handicap);
  if (isNaN(hcRaw)) return null;
  const parts = String(score).split('-');
  const homeGoals = parseInt(parts[0], 10) || 0;
  const awayGoals = parseInt(parts[1], 10) || 0;
  const diff = homeGoals - awayGoals - hcRaw;
  const teamDiff = isAnalyzedTeamHome ? diff : -diff;

  if (teamDiff === 0) return 'push';
  const ad = Math.abs(teamDiff);
  if (ad > 0.25) return teamDiff > 0 ? 'win' : 'lose';
  return teamDiff > 0 ? 'halfWin' : 'halfLoss';
}

/**
 * @param {object} params
 * @returns {object} 单场比赛结构化记录
 */
function buildStructuredMatch(params) {
  const {
    date,
    league,
    homeTeam,
    awayTeam,
    score,
    homeTeamId,
    awayTeamId,
    matchId,
    handicap,
    ouLine,
    analyzedTeamId,
    handicapDisplay,
    totalDisplay,
  } = params;

  const isHome = analyzedTeamId === homeTeamId;
  const opponent = isHome ? awayTeam : homeTeam;
  const handicapResult = computeHandicapResultType(handicap, score, isHome);

  return {
    date,
    league,
    homeTeam,
    awayTeam,
    score,
    homeTeamId,
    awayTeamId,
    matchId,
    handicap,
    ouLine: ouLine != null ? ouLine : '',
    isHome,
    opponent,
    analyzedTeamId,
    handicapResult,
    handicapDisplay: handicapDisplay || '',
    totalDisplay: totalDisplay || '',
  };
}

/**
 * 从战绩数组中用队名反查球探 teamId（h_data / v_data / a_data 结构一致）
 */
function inferTeamIdFromDataRows(dataRows, teamChineseName, sliceN) {
  if (!dataRows || !dataRows.length || !teamChineseName) return null;
  const n = Math.min(dataRows.length, sliceN);
  for (let i = 0; i < n; i++) {
    const e = dataRows[i];
    const ht = extractTeamNameFromHtml(String(e[5]));
    const at = extractTeamNameFromHtml(String(e[7]));
    if (ht === teamChineseName) return e[4];
    if (at === teamChineseName) return e[6];
  }
  return null;
}

function resolvePageTeamIds(hData, aData, sliceN) {
  let pageHomeTeamId = null;
  if (hData && hData.length > 0) {
    const teamIdCounts = {};
    hData.slice(0, sliceN).forEach((e) => {
      teamIdCounts[e[4]] = (teamIdCounts[e[4]] || 0) + 1;
      teamIdCounts[e[6]] = (teamIdCounts[e[6]] || 0) + 1;
    });
    let maxCount = 0;
    for (const [id, count] of Object.entries(teamIdCounts)) {
      if (count > maxCount) {
        maxCount = count;
        pageHomeTeamId = parseInt(id, 10);
      }
    }
  }

  let pageAwayTeamId = null;
  if (aData && aData.length > 0) {
    const teamIdCounts = {};
    aData.slice(0, sliceN).forEach((e) => {
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

  return { pageHomeTeamId, pageAwayTeamId };
}

function parseFutureMatchesData($, pageHomeTeam, pageAwayTeam) {
  const porlet = $('#porlet_20');
  const tables = porlet.find('table[bgcolor="CECECE"]');
  if (tables.length < 2) {
    return { home: [], away: [] };
  }

  const title = $('title').text();
  const seasonMatch = title.match(/(\d{4})-(\d{4})赛季/);
  const currentYear = seasonMatch ? seasonMatch[2].slice(2) : '26';

  function rowsFromTable(table) {
    const out = [];
    $(table)
      .find('tr[align="middle"]')
      .each((i, row) => {
        const cells = $(row).find('td');
        if (cells.length < 6) return;
        const dateStr = $(cells[0]).text().trim();
        const league = $(cells[1]).text().trim();
        const teamsRaw = $(cells[2]).text().trim();
        const teams = teamsRaw.replace(/\s*-\s*/g, 'vs');
        const interval = $(cells[5]).text().trim().replace(/\s+/g, '');
        out.push({
          dateLine: `${currentYear}-${dateStr}`,
          league,
          teams,
          interval,
        });
      });
    return out;
  }

  return {
    teamName: pageHomeTeam,
    home: rowsFromTable($(tables[0])),
    awayTeamName: pageAwayTeam,
    away: rowsFromTable($(tables[1])),
  };
}

function parseInjuriesData($, pageHomeTeam, pageAwayTeam) {
  const porlet = $('#porlet_21');
  if (!porlet.length) {
    return { home: [], away: [] };
  }

  const allTables = porlet.find('table').filter(function filterBg() {
    const bg = $(this).attr('bgcolor');
    return bg && bg.toLowerCase().replace('#', '') === 'cecece';
  });

  if (allTables.length < 2) {
    return { home: [], away: [] };
  }

  function extractInjuries(table) {
    const injuries = [];
    $(table)
      .find('tr[align="middle"]')
      .each((i, row) => {
        const cells = $(row).find('td');
        if (cells.length < 2) return;
        const playerText = $(cells[0]).text().trim().replace(/\s+/g, ' ');
        const reason = $(cells[1]).text().trim();
        if (!playerText || playerText === '\u00a0' || !reason || reason === '\u00a0') return;
        injuries.push({ player: playerText, reason });
      });
    return injuries;
  }

  return {
    homeTeamName: pageHomeTeam,
    home: extractInjuries(allTables[0]),
    awayTeamName: pageAwayTeam,
    away: extractInjuries(allTables[1]),
  };
}

/**
 * 解析分析页 HTML，返回结构化数据（不打印控制台）
 * @param {string} html
 * @returns {object}
 */
function parseMatchStatistics(html) {
  const $ = cheerio.load(html);

  const title = $('title').text();
  const titleMatch = title.match(/(.+?)\s*VS\s*(.+?)[\(（]/);
  const pageHomeTeam = titleMatch ? titleMatch[1].trim() : '主队';
  const pageAwayTeam = titleMatch ? titleMatch[2].trim() : '客队';

  const vData = extractJSArray(html, 'v_data');
  const hData = extractJSArray(html, 'h_data');
  const aData = extractJSArray(html, 'a_data');
  const oddsMap = buildInitialOddsMap(html, $);

  let { pageHomeTeamId, pageAwayTeamId } = resolvePageTeamIds(hData, aData, MAX_MATCHES);
  if (pageHomeTeamId == null) {
    pageHomeTeamId =
      inferTeamIdFromDataRows(hData, pageHomeTeam, MAX_MATCHES) ||
      inferTeamIdFromDataRows(vData, pageHomeTeam, MAX_MATCHES) ||
      inferTeamIdFromDataRows(aData, pageHomeTeam, MAX_MATCHES);
  }
  if (pageAwayTeamId == null) {
    pageAwayTeamId =
      inferTeamIdFromDataRows(aData, pageAwayTeam, MAX_MATCHES) ||
      inferTeamIdFromDataRows(vData, pageAwayTeam, MAX_MATCHES) ||
      inferTeamIdFromDataRows(hData, pageAwayTeam, MAX_MATCHES);
  }

  const headToHead = [];

  const vRows = $('#table_v tr[id^="trv_"]');
  if (vRows.length > 0) {
    vRows.each((i, row) => {
      if (i >= MAX_MATCHES) return false;
      const match = parseMatchRow($, row);
      if (!match) return;

      let handicapDisplay = match.handicapDisplay;
      let totalDisplay = match.totalDisplay;
      let matchId;
      let matchHomeTeamId;
      let matchAwayTeamId;

      if (vData && vData[i]) {
        matchId = vData[i][15];
        matchHomeTeamId = vData[i][4];
        matchAwayTeamId = vData[i][6];
        const perspective = matchHomeTeamId === pageHomeTeamId ? 'home' : 'away';
        const hcD = getHandicapDisplay(oddsMap, matchId, match.score, perspective);
        if (hcD) handicapDisplay = hcD;
        const ouD = getOUDisplay(oddsMap, matchId, match.score);
        if (ouD) totalDisplay = ouD;
      }

      const o = matchId != null ? oddsMap[matchId] : undefined;
      const handicap =
        o && o.handicap !== undefined && o.handicap !== ''
          ? o.handicap
          : vData && vData[i]
            ? vData[i][11]
            : null;
      const ouLine = o ? o.ouLine : '';

      headToHead.push(
        buildStructuredMatch({
          date: match.date,
          league: match.league,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          score: match.score,
          homeTeamId: matchHomeTeamId,
          awayTeamId: matchAwayTeamId,
          matchId,
          handicap,
          ouLine,
          analyzedTeamId: pageHomeTeamId,
          handicapDisplay,
          totalDisplay,
        })
      );
    });
  } else if (vData && vData.length > 0) {
    const count = Math.min(vData.length, MAX_MATCHES);
    for (let i = 0; i < count; i++) {
      const match = parseJSMatchEntry(vData[i]);
      if (!match) continue;

      const matchId = vData[i][15];
      const matchHomeTeamId = vData[i][4];
      const matchAwayTeamId = vData[i][6];
      const perspective = matchHomeTeamId === pageHomeTeamId ? 'home' : 'away';
      const handicapDisplay = getHandicapDisplay(oddsMap, matchId, match.score, perspective);
      const totalDisplay = getOUDisplay(oddsMap, matchId, match.score);

      const o = oddsMap[matchId];
      const handicap =
        o && o.handicap !== undefined && o.handicap !== '' ? o.handicap : vData[i][11];
      const ouLine = o ? o.ouLine : '';

      headToHead.push(
        buildStructuredMatch({
          date: match.date,
          league: match.league,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          score: match.score,
          homeTeamId: matchHomeTeamId,
          awayTeamId: matchAwayTeamId,
          matchId,
          handicap,
          ouLine,
          analyzedTeamId: pageHomeTeamId,
          handicapDisplay,
          totalDisplay,
        })
      );
    }
  }

  const homeTeamMatches = [];
  const hnRows = $('#table_hn tr[id^="trhn_"]');
  if (hnRows.length > 0) {
    hnRows.each((i, row) => {
      if (i >= MAX_MATCHES) return false;
      const match = parseMatchRow($, row);
      if (!match) return;

      let handicapDisplay = match.handicapDisplay;
      let totalDisplay = match.totalDisplay;
      let matchId;
      let matchHomeTeamId;
      let matchAwayTeamId;

      if (hData && hData[i]) {
        matchId = hData[i][15];
        matchHomeTeamId = hData[i][4];
        matchAwayTeamId = hData[i][6];
        const perspective = matchHomeTeamId === pageHomeTeamId ? 'home' : 'away';
        const hcD = getHandicapDisplay(oddsMap, matchId, match.score, perspective);
        if (hcD) handicapDisplay = hcD;
        const ouD = getOUDisplay(oddsMap, matchId, match.score);
        if (ouD) totalDisplay = ouD;
      }

      const o = oddsMap[matchId];
      const handicap =
        o && o.handicap !== undefined && o.handicap !== ''
          ? o.handicap
          : hData && hData[i]
            ? hData[i][11]
            : null;
      const ouLine = o ? o.ouLine : '';

      homeTeamMatches.push(
        buildStructuredMatch({
          date: match.date,
          league: match.league,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          score: match.score,
          homeTeamId: matchHomeTeamId,
          awayTeamId: matchAwayTeamId,
          matchId,
          handicap,
          ouLine,
          analyzedTeamId: pageHomeTeamId,
          handicapDisplay,
          totalDisplay,
        })
      );
    });
  } else if (hData && hData.length > 0) {
    const count = Math.min(hData.length, MAX_MATCHES);
    for (let i = 0; i < count; i++) {
      const match = parseJSMatchEntry(hData[i]);
      if (!match) continue;

      const matchId = hData[i][15];
      const matchHomeTeamId = hData[i][4];
      const matchAwayTeamId = hData[i][6];
      const perspective = matchHomeTeamId === pageHomeTeamId ? 'home' : 'away';
      const handicapDisplay = getHandicapDisplay(oddsMap, matchId, match.score, perspective);
      const totalDisplay = getOUDisplay(oddsMap, matchId, match.score);

      const o = oddsMap[matchId];
      const handicap =
        o && o.handicap !== undefined && o.handicap !== '' ? o.handicap : hData[i][11];
      const ouLine = o ? o.ouLine : '';

      homeTeamMatches.push(
        buildStructuredMatch({
          date: match.date,
          league: match.league,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          score: match.score,
          homeTeamId: matchHomeTeamId,
          awayTeamId: matchAwayTeamId,
          matchId,
          handicap,
          ouLine,
          analyzedTeamId: pageHomeTeamId,
          handicapDisplay,
          totalDisplay,
        })
      );
    }
  }

  const awayTeamMatches = [];
  const anRows = $('#table_an tr[id^="tran_"]');
  if (anRows.length > 0) {
    anRows.each((i, row) => {
      if (i >= MAX_MATCHES) return false;
      const match = parseMatchRow($, row);
      if (!match) return;

      let handicapDisplay = match.handicapDisplay;
      let totalDisplay = match.totalDisplay;
      let matchId;
      let matchHomeTeamId;
      let matchAwayTeamId;

      if (aData && aData[i]) {
        matchId = aData[i][15];
        matchHomeTeamId = aData[i][4];
        matchAwayTeamId = aData[i][6];
        const perspective = matchHomeTeamId === pageAwayTeamId ? 'home' : 'away';
        const hcD = getHandicapDisplay(oddsMap, matchId, match.score, perspective);
        if (hcD) handicapDisplay = hcD;
        const ouD = getOUDisplay(oddsMap, matchId, match.score);
        if (ouD) totalDisplay = ouD;
      }

      const o = oddsMap[matchId];
      const handicap =
        o && o.handicap !== undefined && o.handicap !== ''
          ? o.handicap
          : aData && aData[i]
            ? aData[i][11]
            : null;
      const ouLine = o ? o.ouLine : '';

      awayTeamMatches.push(
        buildStructuredMatch({
          date: match.date,
          league: match.league,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          score: match.score,
          homeTeamId: matchHomeTeamId,
          awayTeamId: matchAwayTeamId,
          matchId,
          handicap,
          ouLine,
          analyzedTeamId: pageAwayTeamId,
          handicapDisplay,
          totalDisplay,
        })
      );
    });
  } else if (aData && aData.length > 0) {
    const count = Math.min(aData.length, MAX_MATCHES);
    for (let i = 0; i < count; i++) {
      const match = parseJSMatchEntry(aData[i]);
      if (!match) continue;

      const matchId = aData[i][15];
      const matchHomeTeamId = aData[i][4];
      const matchAwayTeamId = aData[i][6];
      const perspective = matchHomeTeamId === pageAwayTeamId ? 'home' : 'away';
      const handicapDisplay = getHandicapDisplay(oddsMap, matchId, match.score, perspective);
      const totalDisplay = getOUDisplay(oddsMap, matchId, match.score);

      const o = oddsMap[matchId];
      const handicap =
        o && o.handicap !== undefined && o.handicap !== '' ? o.handicap : aData[i][11];
      const ouLine = o ? o.ouLine : '';

      awayTeamMatches.push(
        buildStructuredMatch({
          date: match.date,
          league: match.league,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          score: match.score,
          homeTeamId: matchHomeTeamId,
          awayTeamId: matchAwayTeamId,
          matchId,
          handicap,
          ouLine,
          analyzedTeamId: pageAwayTeamId,
          handicapDisplay,
          totalDisplay,
        })
      );
    }
  }

  const futureMatches = parseFutureMatchesData($, pageHomeTeam, pageAwayTeam);
  const injuries = parseInjuriesData($, pageHomeTeam, pageAwayTeam);

  return {
    pageHomeTeam,
    pageAwayTeam,
    pageHomeTeamId,
    pageAwayTeamId,
    headToHead,
    homeTeamMatches,
    awayTeamMatches,
    futureMatches,
    injuries,
  };
}

/**
 * 抓取并解析单场分析页
 * @param {string} matchSerial 球探比赛序号
 * @returns {Promise<object>}
 */
async function fetchMatchStatistics(matchSerial) {
  const url = targets.titan007.matchStatisticsUrl(matchSerial);
  const res = await service({
    method: 'GET',
    url,
    headers: {
      Referer: url,
      Host: 'zq.titan007.com',
    },
    responseType: 'arraybuffer',
  });
  const html = iconv.decode(res.data, 'utf-8');
  return parseMatchStatistics(html);
}

module.exports = {
  MAX_MATCHES,
  parseMatchStatistics,
  fetchMatchStatistics,
  computeHandicapResultType,
};
