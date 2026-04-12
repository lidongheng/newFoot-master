const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const targets = require('../config/targets');
const config = require('../config');
const { fetchZqBuffer } = require('./http');
const { evalJsData, loadHtml } = require('./parser');
const { sleep } = require('./fileWriter');

/**
 * 从阵容页 HTML 解析 球员姓名 -> 球探 playerSerial（用于拉取 player{serial}.js）
 * @returns {Map<string, string>}
 */
function parsePlayerLinksFromLineupHtml(html) {
  const $ = loadHtml(html);
  const map = new Map();
  $('a[href*="/cn/team/player/"]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    if (!href || href.includes('/coach/')) return;
    const m = href.match(/\/cn\/team\/player\/\d+\/(\d+)\.html/i);
    if (!m) return;
    const name = $(el).text().trim();
    if (!name) return;
    map.set(name, m[1]);
  });
  return map;
}

/** 球探 transferInfo 单行类型码（经验映射，未知则省略） */
const TRANSFER_TYPE_HINT = {
  1: '完全所有',
  2: '租借',
  3: '自由转会',
  4: '租借结束',
};

function formatFeeCell(cell) {
  if (cell === '' || cell === null || cell === undefined) return '';
  const s = String(cell).trim();
  if (!s) return '';
  if (/^-+$/.test(s)) return s;
  if (/^\d+(\.\d+)?$/.test(s)) return `${s}万欧元`;
  return s;
}

/**
 * transferInfo 子项为 13 列：赛季、转出 id、转入 id、转会日、合同到期、来自(简)、来自(繁)、去向(简)、去向(繁)、转会费、类型码、英文名…
 */
function mapTransferRow(row) {
  if (!Array.isArray(row) || row.length < 11) return null;
  const typeCode = row[10];
  return {
    season: String(row[0] || '').trim(),
    date: String(row[3] || '').trim(),
    from: String(row[5] || '').trim(),
    to: String(row[7] || '').trim(),
    fee: formatFeeCell(row[9]),
    type:
      typeof typeCode === 'number' && TRANSFER_TYPE_HINT[typeCode]
        ? TRANSFER_TYPE_HINT[typeCode]
        : String(typeCode ?? ''),
  };
}

function extractCurrentClub(nowTeamInfo) {
  if (!Array.isArray(nowTeamInfo) || nowTeamInfo.length === 0) return null;
  const first = nowTeamInfo[0];
  if (!Array.isArray(first) || first.length === 0) return null;
  const name = String(first[0] || '').trim();
  return name || null;
}

/**
 * 从 player{serial}.js 的 sandbox 解析现俱乐部与转会列表
 */
function parsePlayerClubFromSandbox(sandbox) {
  const currentClub = extractCurrentClub(sandbox.nowTeamInfo);
  const raw = sandbox.transferInfo;
  const recentTransfers = [];
  if (Array.isArray(raw)) {
    for (const row of raw) {
      if (!Array.isArray(row)) continue;
      const mapped = mapTransferRow(row);
      if (mapped) recentTransfers.push(mapped);
    }
  }
  return { currentClub, recentTransfers };
}

async function fetchText(url, headers = {}) {
  const res = await fetchZqBuffer(url, {
    headers: { ...targets.titan007.headers.desktop, ...headers },
    responseType: 'arraybuffer',
  });
  return iconv.decode(res.data, 'utf-8');
}

/**
 * GET 阵容页并解析 name -> playerSerial
 */
async function fetchPlayerLinks(teamSerial) {
  const url = targets.titan007.teamLineupUrl(teamSerial);
  const referer = url;
  const html = await fetchText(url, { Referer: referer });
  return parsePlayerLinksFromLineupHtml(html);
}

/**
 * GET player{serial}.js 并解析俱乐部信息
 */
async function fetchPlayerClubInfo(playerSerial, teamSerialForReferer) {
  const url = targets.titan007.playerDataUrl(playerSerial);
  const refererTeam = teamSerialForReferer || '';
  // 与浏览器加载 player*.js 一致：Referer 为球员资料页（非阵容页）
  const referer = refererTeam
    ? `https://zq.titan007.com/cn/team/player/${refererTeam}/${playerSerial}.html`
    : targets.titan007.cupMatchReferer('75');
  const text = await fetchText(url, { Referer: referer });
  const sandbox = evalJsData(text);
  if (!sandbox) return { currentClub: null, recentTransfers: [] };
  return parsePlayerClubFromSandbox(sandbox);
}

/**
 * 阵容页链接文字与 tdl 里 lineupDetail 的姓名可能混用「·」「.」等分隔符，需统一后再比。
 * 注意：不可先删 · 再把 . 转成 ·（否则「里斯.詹姆斯」与「里斯·詹姆斯」规范后仍不一致）。
 */
function normalizePlayerKey(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[·.\u00B7\u2022\uFF0E\u3002]/g, '');
}

function findSerialForName(nameMap, name) {
  const raw = String(name || '').trim();
  if (nameMap.has(raw)) return nameMap.get(raw);
  const norm = normalizePlayerKey(raw);
  for (const [k, v] of nameMap.entries()) {
    if (normalizePlayerKey(k) === norm) return v;
  }
  return null;
}

/**
 * 直接用 tdl{team}.js 里的 lineupDetail 建「姓名 → playerSerial」，与爬虫解析的 name 同源，
 * 不依赖阵容页 HTML（避免反爬/空页面/标点不一致）。
 * row[0] 为球员序号，row[2] 为简体名，row[8] 为位置（跳过主教练）。
 */
function buildNameToSerialFromLineupDetail(lineupDetail) {
  const map = new Map();
  if (!Array.isArray(lineupDetail)) return map;
  for (const row of lineupDetail) {
    if (!row || row.length < 9) continue;
    if (row[8] === '主教练') continue;
    const serial = row[0];
    const name = String(row[2] || '').trim();
    if (name == null || name === '' || serial == null || serial === '') continue;
    map.set(name, String(serial));
  }
  return map;
}

/**
 * 上一版 player_center JSON 中按姓名查找同一人（与 findSerialForName 同源规则）
 * @param {object[]|null|undefined} previousPlayers
 * @param {string} name
 * @returns {object|null}
 */
function findPreviousPlayerRecord(previousPlayers, name) {
  if (!Array.isArray(previousPlayers)) return null;
  const raw = String(name || '').trim();
  for (const p of previousPlayers) {
    if (p && String(p.name || '').trim() === raw) return p;
  }
  const norm = normalizePlayerKey(raw);
  for (const p of previousPlayers) {
    if (!p || p.name == null) continue;
    if (normalizePlayerKey(p.name) === norm) return p;
  }
  return null;
}

/** 本地优先：非空转会列表视为可用，可跳过网络 */
function isUsableClubCache(record) {
  return (
    record &&
    Array.isArray(record.recentTransfers) &&
    record.recentTransfers.length > 0
  );
}

function isNetClubResultUsable(info) {
  return (
    info &&
    Array.isArray(info.recentTransfers) &&
    info.recentTransfers.length > 0
  );
}

/** 网络失败或为空时回退：有转会记录，或至少有现俱乐部名 */
function hasClubFallbackRecord(prev) {
  if (!prev) return false;
  if (Array.isArray(prev.recentTransfers) && prev.recentTransfers.length > 0) return true;
  const c = prev.currentClub;
  return typeof c === 'string' && c.trim() !== '';
}

function applyClubFields(target, source) {
  target.currentClub = source.currentClub != null ? source.currentClub : null;
  target.recentTransfers = Array.isArray(source.recentTransfers)
    ? source.recentTransfers.map((t) => ({ ...t }))
    : [];
}

/**
 * 读取上一版 output/player_center/{teamSerial}.json（供 enrich 匹配，不参与名单构成）
 * @param {string} teamSerial
 * @returns {object[]}
 */
function loadPreviousPlayerCenter(teamSerial) {
  const cachePath = path.join(config.paths.playerCenter, `${teamSerial}.json`);
  if (!fs.existsSync(cachePath)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/**
 * @param {string} teamSerial
 * @param {object[]} players
 * @param {{ nameKey?: string, delayMs?: number, logger?: (s:string)=>void, lineupDetail?: unknown[], forceClubFetch?: boolean }} options
 *        若传入 lineupDetail（与 tdl 同源），优先用它建姓名→序号映射，不再请求阵容 HTML。
 *        forceClubFetch：为 true 时不读本地缓存、不跳过网络、不回退本地。
 */
async function enrichPlayers(teamSerial, players, options = {}) {
  const nameKey = options.nameKey || 'name';
  const delayMs = options.delayMs ?? 3000;
  const log = options.logger || (() => {});
  const forceClubFetch = options.forceClubFetch === true;

  let previousPlayers = [];
  if (!forceClubFetch) {
    previousPlayers = loadPreviousPlayerCenter(teamSerial);
    if (previousPlayers.length) {
      log(`[enricher] 已加载本地缓存 ${previousPlayers.length} 人（${teamSerial}.json）`);
    }
  }

  let nameMap;
  if (options.lineupDetail && Array.isArray(options.lineupDetail)) {
    nameMap = buildNameToSerialFromLineupDetail(options.lineupDetail);
    log(`[enricher] 使用 lineupDetail 映射 ${nameMap.size} 人（不请求阵容页）`);
  } else {
    try {
      nameMap = await fetchPlayerLinks(teamSerial);
      log(`[enricher] 阵容页解析到 ${nameMap.size} 条球员链接`);
    } catch (e) {
      log(`[enricher] 阵容页失败: ${e.message}`);
      for (const p of players) {
        p.currentClub = null;
        p.recentTransfers = [];
      }
      return players;
    }
  }

  if (!nameMap.size) {
    log('[enricher] 姓名映射为空，跳过俱乐部补充');
    for (const p of players) {
      p.currentClub = null;
      p.recentTransfers = [];
    }
    return players;
  }

  const total = players.length;
  for (let i = 0; i < total; i++) {
    const p = players[i];
    const nm = p[nameKey];
    const serial = findSerialForName(nameMap, nm);
    if (!serial) {
      p.currentClub = null;
      p.recentTransfers = [];
      log(`[enricher] 未匹配链接: ${nm}`);
      continue;
    }

    const prev = !forceClubFetch ? findPreviousPlayerRecord(previousPlayers, nm) : null;

    if (!forceClubFetch && prev && isUsableClubCache(prev)) {
      applyClubFields(p, prev);
      log(`[enricher] [${i + 1}/${total}] ${nm} 使用本地缓存，跳过网络`);
      continue;
    }

    log(`[enricher] [${i + 1}/${total}] ${nm} → player${serial}.js`);
    let requested = false;
    try {
      const info = await fetchPlayerClubInfo(serial, teamSerial);
      requested = true;
      if (isNetClubResultUsable(info)) {
        p.currentClub = info.currentClub;
        p.recentTransfers = Array.isArray(info.recentTransfers) ? [...info.recentTransfers] : [];
      } else if (!forceClubFetch && hasClubFallbackRecord(prev)) {
        applyClubFields(p, prev);
        log(`[enricher] 网络返回为空，回退本地: ${nm}`);
      } else {
        p.currentClub = info.currentClub;
        p.recentTransfers = Array.isArray(info.recentTransfers) ? [...info.recentTransfers] : [];
      }
    } catch (e) {
      requested = true;
      log(`[enricher] 球员 ${nm} (${serial}) 详情失败: ${e.message}`);
      if (!forceClubFetch && hasClubFallbackRecord(prev)) {
        applyClubFields(p, prev);
        log(`[enricher] 网络失败，回退本地: ${nm}`);
      } else {
        p.currentClub = null;
        p.recentTransfers = [];
      }
    }

    if (requested && i < players.length - 1 && delayMs > 0) await sleep(delayMs);
  }
  return players;
}

function abbrevSeason(seasonStr) {
  const m = String(seasonStr || '').match(/(\d{4})\s*-\s*(\d{4})/);
  if (!m) return seasonStr || '';
  return `${m[1].slice(2)}-${m[2].slice(2)}`;
}

function parseTransferTime(dateStr) {
  const t = new Date(String(dateStr || '').trim());
  return Number.isNaN(t.getTime()) ? 0 : t.getTime();
}

function clubsMatch(a, b) {
  const x = String(a || '').trim();
  const y = String(b || '').trim();
  if (!x || !y) return false;
  if (x === y) return true;
  const nx = normalizePlayerKey(x);
  const ny = normalizePlayerKey(y);
  return nx === ny;
}

function isWinterTransferDate(dateStr) {
  const s = String(dateStr || '').trim();
  const sub = s.length >= 10 ? s.slice(5, 7) : '';
  const mon = parseInt(sub, 10);
  return mon === 1 || mon === 2;
}

/** 欧洲赛季 `YYYY-YYYY`，7 月起算（与球探赛季字段一致） */
function normalizeSeasonKey(seasonStr) {
  const m = String(seasonStr || '').match(/(\d{4})\s*-\s*(\d{4})/);
  return m ? `${m[1]}-${m[2]}` : '';
}

/** 当前日所在的欧洲足球赛季，如 2026 年 4 月 → `2025-2026` */
function getCurrentFootballSeasonKey(d = new Date()) {
  const y = d.getFullYear();
  const month = d.getMonth() + 1;
  const startYear = month >= 7 ? y : y - 1;
  return `${startYear}-${startYear + 1}`;
}

/**
 * 大名单「转会记录」列：
 * - 默认只写一段：最近一次加盟当前俱乐部的转会。
 * - 仅当「本赛季」且为冬窗（1–2 月）加盟当前队时，才在前面再拼一段「如何来到冬窗前所在俱乐部」（如格伊）。
 * - 历史赛季的冬窗（如沃顿早年）只显示一段。
 */
function formatTransferColumn(player) {
  const currentClub = player.currentClub;
  const transfers = player.recentTransfers;
  if (!currentClub || !Array.isArray(transfers) || transfers.length === 0) return '-';

  const toCurrent = transfers
    .filter((t) => clubsMatch(t.to, currentClub))
    .sort((a, b) => parseTransferTime(b.date) - parseTransferTime(a.date))[0];

  if (!toCurrent) return '-';

  const parts = [];
  const currentSeasonKey = getCurrentFootballSeasonKey();
  const toCurrentSeasonKey = normalizeSeasonKey(toCurrent.season);
  const isThisSeasonToCurrent =
    toCurrentSeasonKey !== '' && toCurrentSeasonKey === currentSeasonKey;

  if (isThisSeasonToCurrent && isWinterTransferDate(toCurrent.date)) {
    const winterFrom = toCurrent.from;
    const prevJoin = transfers
      .filter(
        (t) =>
          clubsMatch(t.to, winterFrom) && parseTransferTime(t.date) < parseTransferTime(toCurrent.date)
      )
      .sort((a, b) => parseTransferTime(b.date) - parseTransferTime(a.date))[0];
    if (prevJoin) {
      parts.push(`${abbrevSeason(prevJoin.season)} ${prevJoin.from}->${prevJoin.to}`);
    }
  }
  parts.push(`${abbrevSeason(toCurrent.season)} ${toCurrent.from}->${toCurrent.to}`);
  return parts.join(' ');
}

module.exports = {
  parsePlayerLinksFromLineupHtml,
  fetchPlayerLinks,
  fetchPlayerClubInfo,
  enrichPlayers,
  formatTransferColumn,
  parsePlayerClubFromSandbox,
  buildNameToSerialFromLineupDetail,
  normalizePlayerKey,
  getCurrentFootballSeasonKey,
  normalizeSeasonKey,
  findPreviousPlayerRecord,
  loadPreviousPlayerCenter,
  isUsableClubCache,
};
