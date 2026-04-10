const path = require('path');
const BaseCrawler = require('../crawlers/base');
const config = require('../config');
const { readJSON, readFile, saveMarkdown, fileExists } = require('../utils/fileWriter');

/** 英超/澳超/韩K联及欧冠模块：联赛式档位与俱乐部备注 */
function useLeagueStyleAnalysis() {
  const k = config.activeCupKey || '';
  return config.type === 'league' || k === 'championsLeague';
}

/** 当前为世界杯国家队画像流程（需在按位置大名单中保留「所属俱乐部」列） */
function isWorldCupNationalContext() {
  return (config.activeCupKey || '') === 'theWorldCup';
}

/** 俱乐部/联赛画像：名单与预测首发用「球衣号-姓名」；国家队仍只显示姓名 */
function formatClubJerseyLabel(p) {
  if (isWorldCupNationalContext()) return p.name;
  const raw = p.number;
  if (raw == null || raw === '') return p.name;
  const s = String(raw).trim();
  if (s === '' || s === '-') return p.name;
  return `${s}-${p.name}`;
}

/** 身价列（万）或 JSON socialStatus → 展示用，如 6500万 */
function getMarketValueRaw(p) {
  const mv = p.marketValue;
  const s = String(mv ?? '').trim();
  if (s && s !== '-') return mv;
  const ss = p.socialStatus;
  const t = String(ss ?? '').trim();
  return t && t !== '-' ? ss : null;
}

function formatMarketValueForDisplay(p) {
  const raw = getMarketValueRaw(p);
  const s = String(raw ?? '').trim();
  if (!s || s === '-') return null;
  if (/[万亿]/.test(s)) return s;
  const n = s.replace(/,/g, '');
  if (/^\d+(\.\d+)?$/.test(n)) return `${n}万`;
  return s;
}

/** 例：33岁；无效则省略 */
function formatAgeForDisplay(p) {
  const a = p.age;
  if (a == null || a === '') return null;
  const n = parseInt(String(a), 10);
  if (Number.isNaN(n) || n < 14 || n > 55) return null;
  return `${n}岁`;
}

/**
 * 大名单行展示：俱乐部括号规则
 * - 俱乐部/联赛画像：无俱乐部或占位「-」时不输出（-）；若全员有效俱乐部相同则只写姓名，不重复括号
 * - 世界杯国家队：姓名（俱乐部，位置，年龄，身价）；全员同俱乐部时省略俱乐部，为（位置，年龄，身价）；无俱乐部时首段为「-」
 */
function formatPlayerNameWithClub(p, allSameNonEmptyClub, normalizePositionCode) {
  const national = isWorldCupNationalContext();
  const displayName = national ? p.name : formatClubJerseyLabel(p);
  const club = String(p.currentClub || '').trim();
  const missing = !club || club === '-';
  const posCode =
    typeof normalizePositionCode === 'function' ? normalizePositionCode(p.position) : null;
  const ageSeg = formatAgeForDisplay(p);
  const mv = formatMarketValueForDisplay(p);

  if (!national) {
    if (missing) return displayName;
    if (allSameNonEmptyClub) return displayName;
    return `${displayName}（${club}）`;
  }

  if (allSameNonEmptyClub && !missing) {
    const parts = [];
    if (posCode) parts.push(posCode);
    if (ageSeg) parts.push(ageSeg);
    if (mv) parts.push(mv);
    if (parts.length === 0) return p.name;
    return `${p.name}（${parts.join('，')}）`;
  }

  const parts = [];
  parts.push(missing ? '-' : club);
  if (posCode) parts.push(posCode);
  if (ageSeg) parts.push(ageSeg);
  if (mv) parts.push(mv);
  return `${p.name}（${parts.join('，')}）`;
}

function computeAllSameNonEmptyClub(players) {
  const clubs = players
    .map((p) => String(p.currentClub || '').trim())
    .filter((c) => c && c !== '-');
  if (clubs.length === 0) return false;
  return new Set(clubs).size === 1;
}

/** 表格/JSON 单元格转非负整数，无效则 null */
function parseStatIntCell(v) {
  const s = String(v ?? '').trim();
  if (s === '' || s === '-') return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * 赛季统计：联赛 squad-final 为 appearances/starts/goals/assists；player_center 回退 caps/lineups
 * @returns {{ apps: number, starts: number, goals: number, assists: number } | null}
 */
function getPlayerSeasonStatsQuad(p) {
  let apps = p.appearances ?? p.caps;
  let starts = p.starts ?? p.lineups;
  let goals = p.goals;
  let assists = p.assists;
  apps = parseStatIntCell(apps);
  starts = parseStatIntCell(starts);
  goals = parseStatIntCell(goals);
  assists = parseStatIntCell(assists);
  if (apps === null || starts === null || goals === null || assists === null) return null;
  return { apps, starts, goals, assists };
}

/**
 * 联赛统计半角括号：出场始终保留；首发、进球、助攻为 0 时不输出该段（国家队名单无此块，不变）
 * 例：拉亚(31场31首发，GK，31岁，3500万)、约克雷斯(29场23首发11球，ST，28岁，6500万)
 */
function formatStatsParen(p, positionCode) {
  const q = getPlayerSeasonStatsQuad(p);
  if (!q) return null;
  let core = `${q.apps}场`;
  if (q.starts > 0) core += `${q.starts}首发`;
  if (q.goals > 0) core += `${q.goals}球`;
  if (q.assists > 0) core += `${q.assists}助`;
  const posSuffix = positionCode ? `，${positionCode}` : '';
  const ageSeg = formatAgeForDisplay(p);
  const ageSuffix = ageSeg ? `，${ageSeg}` : '';
  const mv = formatMarketValueForDisplay(p);
  const mvSuffix = mv ? `，${mv}` : '';
  return `(${core}${posSuffix}${ageSuffix}${mvSuffix})`;
}

/**
 * 按位置大名单单行展示：非世界杯或全员同俱乐部时优先联赛统计行（0 首发/球/助可省略）；否则用国家队全角括号规则
 * @param {(raw: string) => string|null} normalizePositionCode 与阵型一致的英文位置缩写
 */
function formatPlayerSquadLine(p, allSameNonEmptyClub, normalizePositionCode) {
  const national = isWorldCupNationalContext();
  const useStats = !national || allSameNonEmptyClub;
  const posCode =
    typeof normalizePositionCode === 'function' ? normalizePositionCode(p.position) : null;
  const statParen = formatStatsParen(p, posCode);
  const base = national ? p.name : formatClubJerseyLabel(p);
  if (useStats && statParen) return `${base}${statParen}`;
  return formatPlayerNameWithClub(p, allSameNonEmptyClub, normalizePositionCode);
}

/**
 * 球队画像生成器 - 从大名单数据自动分析球队特征
 *
 * 分析维度：主教练与阵型（元数据）、按位置 26 人名单、预测首发、年龄结构、身高、身价、位置深度、打法推断、球队目标
 * 输入（优先）: cup-analyzer/.../squad-final/group-X/{队名}.md（最终26人，含 **主教练** / **阵型** 元数据）
 * 回退: output/player_center/{teamSerial}.json + c75.js + 冠军赔率.md（无主教练/阵型时相应章节为提示）
 * 输出: cup-analyzer/theWorldCup/teamProfile/{队名}.md
 *
 * 当数据来源为 squad-final 时，生成画像后会根据当前解析的球员列表**回写**该 md 末尾的「## 统计摘要」（总人数、平均年龄、平均身高、位置分布）。
 *
 * CLI: node processors/teamProfileGenerator.js [--source final|raw] [--team 序号]
 */

/** 画像「按位置大名单」固定逻辑分组（合并相近位置），顺序从后到前 */
const POSITION_GROUPS_FOR_PROFILE = [
  { label: '门将', codes: ['GK'] },
  { label: '右后卫', codes: ['RB', 'RWB'] },
  { label: '中后卫', codes: ['CB', 'LCB', 'RCB'] },
  { label: '左后卫', codes: ['LB', 'LWB'] },
  { label: '后腰', codes: ['CDM', 'RDM', 'LDM'] },
  { label: '前腰', codes: ['CAM', 'CM'] },
  { label: '右边锋', codes: ['RM', 'RW'] },
  { label: '左边锋', codes: ['LM', 'LW'] },
  { label: '中锋', codes: ['ST', 'CF'] },
];

const KNOWN_POSITION_CODES = new Set([
  'GK',
  'LB',
  'CB',
  'RB',
  'LCB',
  'RCB',
  'LWB',
  'RWB',
  'CDM',
  'LDM',
  'RDM',
  'CM',
  'CAM',
  'LM',
  'RM',
  'LW',
  'RW',
  'ST',
  'CF',
]);

class TeamProfileGenerator extends BaseCrawler {
  constructor() {
    super('TeamProfileGenerator');
    this.championOdds = this.loadChampionOdds();
  }

  /**
   * 加载冠军赔率数据
   */
  loadChampionOdds() {
    const oddsPath = path.join(config.paths.cupAnalyzer, 'data', '冠军赔率.md');
    const content = readFile(oddsPath);
    if (!content) return {};

    const odds = {};
    content.split('\n').forEach((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2 && !isNaN(parseFloat(parts[parts.length - 1]))) {
        const teamName = parts.slice(0, -1).join('');
        odds[teamName] = parseFloat(parts[parts.length - 1]);
      }
    });
    return odds;
  }

  /**
   * 查找球队所在小组字母（与 SquadProcessor 一致）
   */
  findGroupLetterForTeam(teamId, scheduleData) {
    const groupMap = this.buildGroupMap(scheduleData);
    const id = Number(teamId);
    for (const [letter, group] of Object.entries(groupMap)) {
      if (group.teams.some((t) => Number(t.teamId) === id)) return letter;
    }
    return null;
  }

  /**
   * 将「位置」列标准化为与阵型、POSITION_GROUPS 一致的英文缩写（与 squadProcessor 对齐并扩展）
   * @returns {string|null}
   */
  normalizePositionCode(raw) {
    const s = String(raw || '').trim();
    if (!s || s === '-') return null;
    const upper = s.toUpperCase();
    if (KNOWN_POSITION_CODES.has(upper)) return upper;
    const zhMap = {
      门将: 'GK',
      守门员: 'GK',
      右后卫: 'RB',
      左后卫: 'LB',
      中后卫: 'CB',
      中卫: 'CB',
      右中后卫: 'RCB',
      左中后卫: 'LCB',
      右翼卫: 'RWB',
      左翼卫: 'LWB',
      后腰: 'CDM',
      左边后腰: 'LDM',
      右边后腰: 'RDM',
      前腰: 'CAM',
      右前腰: 'RAM',
      左前腰: 'LAM',
      右中场: 'RM',
      左中场: 'LM',
      中前卫: 'CM',
      中锋: 'ST',
      左边锋: 'LW',
      右边锋: 'RW',
      影锋: 'CF',
      前锋: 'ST',
      中场: 'CM',
    };
    if (zhMap[s]) return zhMap[s];
    return null;
  }

  /**
   * 阵型对应 11 人位置列表（与 clubMatchAnalyzer.getPositionsForFormation 一致）
   * @param {string} formation 如 4-2-3-1 或 4231
   * @returns {string[]}
   */
  getPositionsForFormation(formation) {
    const formationMappings = {
      4213: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'CAM', 'LW', 'ST', 'RW'],
      4231: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'LM', 'CAM', 'RM', 'ST'],
      3421: ['GK', 'LCB', 'CB', 'RCB', 'LB', 'CDM', 'CDM', 'RB', 'LM', 'RM', 'ST'],
      433: ['GK', 'LB', 'CB', 'CB', 'RB', 'LDM', 'CDM', 'RDM', 'LW', 'ST', 'RW'],
      352: ['GK', 'LCB', 'CB', 'RCB', 'LB', 'CM', 'CDM', 'CM', 'RB', 'ST', 'ST'],
      343: ['GK', 'LCB', 'CB', 'RCB', 'LB', 'CDM', 'CDM', 'RB', 'LW', 'ST', 'RW'],
      442: ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CDM', 'CDM', 'RM', 'ST', 'ST'],
      3322: ['GK', 'LCB', 'CB', 'RCB', 'CDM', 'CDM', 'CDM', 'LM', 'RM', 'ST', 'ST'],
      541: ['GK', 'LB', 'LCB', 'CB', 'RCB', 'RB', 'LM', 'CDM', 'CDM', 'RM', 'ST'],
      4132: ['GK', 'LB', 'LCB', 'CB', 'RCB', 'CDM', 'LM', 'CAM', 'RM', 'ST', 'ST'],
      4123: ['GK', 'LB', 'LCB', 'CB', 'RCB', 'CDM', 'LM', 'RM', 'LW', 'ST', 'RW'],
      451: ['GK', 'LB', 'LCB', 'CB', 'RCB', 'LM', 'CM', 'CDM', 'CM', 'RM', 'ST'],
      3412: ['GK', 'LCB', 'CB', 'RCB', 'LB', 'CDM', 'CDM', 'RB', 'CAM', 'ST', 'ST'],
      532: ['GK', 'LB', 'LCB', 'CB', 'RCB', 'RB', 'LM', 'CDM', 'RM', 'ST', 'ST'],
      4411: ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CDM', 'CDM', 'RM', 'CF', 'ST'],
      4141: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'LM', 'CAM', 'CAM', 'RM', 'ST'],
      3142: ['GK', 'LCB', 'CB', 'RCB', 'CDM', 'LM', 'CAM', 'CAM', 'RM', 'ST', 'ST'],
      4312: ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CDM', 'RM', 'CAM', 'ST', 'ST'],
      3511: ['GK', 'LCB', 'CB', 'RCB', 'LB', 'CM', 'CDM', 'CM', 'RB', 'CF', 'ST'],
      4321: ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CDM', 'RM', 'LW', 'RW', 'ST'],
      3241: ['GK', 'LCB', 'CB', 'RCB', 'CDM', 'CDM', 'LM', 'CM', 'CM', 'RM', 'ST'],
      3313: ['GK', 'LCB', 'CB', 'RCB', 'LM', 'CDM', 'RM', 'CAM', 'LW', 'ST', 'RW'],
    };
    const normalizedFormation = String(formation || '').replace(/[^0-9]/g, '');
    return formationMappings[normalizedFormation] || formationMappings['442'];
  }

  /**
   * 按固定逻辑位置分组生成大名单行（球员名（俱乐部）以顿号连接）
   * @param {any[]} players
   * @returns {string}
   */
  buildPositionSquadList(players) {
    if (!players || players.length === 0) return '';
    const allSameNonEmptyClub = computeAllSameNonEmptyClub(players);
    const normPos = (raw) => this.normalizePositionCode(raw);
    const codeToPlayers = new Map();
    for (const p of players) {
      const code = this.normalizePositionCode(p.position);
      if (!code) continue;
      if (!codeToPlayers.has(code)) codeToPlayers.set(code, []);
      codeToPlayers.get(code).push(p);
    }
    const lines = [];
    const usedNames = new Set();
    for (const g of POSITION_GROUPS_FOR_PROFILE) {
      const bucket = [];
      for (const c of g.codes) {
        const list = codeToPlayers.get(c);
        if (list) bucket.push(...list);
      }
      const seen = new Set();
      const uniq = bucket.filter((p) => {
        if (seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
      });
      uniq.forEach((p) => usedNames.add(p.name));
      if (uniq.length === 0) continue;
      const codesStr = g.codes.join('、');
      const playersStr = uniq.map((p) => formatPlayerSquadLine(p, allSameNonEmptyClub, normPos)).join('、');
      lines.push(`${g.label}(${codesStr})：${playersStr}`);
    }
    const rest = players.filter((p) => !usedNames.has(p.name));
    if (rest.length > 0) {
      lines.push(
        `其他：${rest.map((p) => formatPlayerSquadLine(p, allSameNonEmptyClub, normPos)).join('、')}`
      );
    }
    return lines.join('\n');
  }

  /**
   * 预测首发：按阵型分层，组内逗号、组间斜杠；每组内位置从右到左（与 getPositionsForFormation 切片反转一致）
   * @param {any[]} players
   * @param {string} formation 如 4-2-3-1
   * @returns {string}
   */
  buildPredictedStartingLineup(players, formation) {
    if (!formation || !players || players.length === 0) return '';
    const digitStr = String(formation).replace(/[^0-9]/g, '');
    if (digitStr.length < 2) return '';
    const digits = digitStr.split('').map(Number);
    const positions = this.getPositionsForFormation(formation);
    if (!positions || positions.length !== 11) return '';
    const sumLines = digits.reduce((a, b) => a + b, 0);
    if (sumLines !== 10) return '';

    const displayOrder = [];
    let idx = 0;
    displayOrder.push(positions[idx++]);
    for (const d of digits) {
      const slice = positions.slice(idx, idx + d);
      idx += d;
      displayOrder.push(...slice.reverse());
    }
    if (displayOrder.length !== 11) return '';

    const queues = {};
    for (const p of players) {
      const code = this.normalizePositionCode(p.position);
      if (!code) continue;
      if (!queues[code]) queues[code] = [];
      queues[code].push(p);
    }

    /** 首发槽位与可顶替的相近位置（先主码、后替补码） */
    const slotTryOrder = (pos) => {
      const alias = {
        CDM: ['CM'],
        CAM: ['CM'],
        LM: ['LW'],
        RM: ['RW'],
        LB: ['LWB'],
        RB: ['RWB'],
        LCB: ['CB'],
        RCB: ['CB'],
      };
      return [pos, ...(alias[pos] || [])];
    };

    const starters = [];
    for (const pos of displayOrder) {
      let picked = null;
      for (const code of slotTryOrder(pos)) {
        const q = queues[code];
        if (q && q.length > 0) {
          picked = q.shift();
          break;
        }
      }
      starters.push(picked ? formatClubJerseyLabel(picked) : '（待定）');
    }

    const groups = [];
    groups.push(starters[0]);
    let sidx = 1;
    for (const d of digits) {
      groups.push(starters.slice(sidx, sidx + d).join('，'));
      sidx += d;
    }
    return `${groups.join('/')}`;
  }

  /**
   * 联赛表：球衣号|姓名|年龄|身高|位置|身价|国籍|出场|首发|进球|助攻（无俱乐部列）
   */
  isLeagueSquadTableRow(parts) {
    if (parts.length < 13) return false;
    const ageCol = parts[3];
    const heightCol = parts[4] || '';
    const n = parseInt(String(ageCol).trim(), 10);
    if (Number.isNaN(n) || n < 15 || n > 50) return false;
    return /cm/i.test(heightCol) || /^\d+$/.test(String(heightCol).replace(/cm/gi, '').trim());
  }

  /**
   * 解析 squad-final 下 Markdown：元数据（主教练、阵型）+ 大名单表格
   * @returns {{ players: any[], coach: string|null, formation: string|null }}
   */
  parseFinalSquadMarkdown(content) {
    const empty = { players: [], coach: null, formation: null };
    if (!content || !content.trim()) return empty;

    let coach = null;
    let formation = null;
    const sectionRe = /^##\s+(门将|后卫|中场|前锋)/;
    const labelToGroup = { 门将: 'GK', 后卫: 'DF', 中场: 'MF', 前锋: 'FW' };
    let currentGroup = null;
    const players = [];

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const coachMatch = trimmed.match(/\*\*主教练\*\*[:：]\s*(.+)/);
      if (coachMatch) {
        coach = coachMatch[1].trim();
        continue;
      }
      const formationMatch = trimmed.match(/\*\*阵型\*\*[:：]\s*(.+)/);
      if (formationMatch) {
        formation = formationMatch[1].trim();
        continue;
      }

      const sec = trimmed.match(sectionRe);
      if (sec) {
        currentGroup = labelToGroup[sec[1]] || 'MF';
        continue;
      }
      if (!currentGroup || !trimmed.startsWith('|')) continue;
      if (trimmed.includes('球衣号') && trimmed.includes('姓名')) continue;
      const parts = trimmed.split('|').map((s) => s.trim());
      if (parts.length < 10) continue;
      const jersey = parts[1];
      const name = parts[2];
      if (!name || name.includes('---') || name === '姓名') continue;
      if (jersey && /^[\-:|]+$/.test(jersey.replace(/\s/g, '')) && name.includes('---')) continue;

      if (this.isLeagueSquadTableRow(parts)) {
        const ageL = parseInt(parts[3], 10);
        const heightL = parseInt(String(parts[4] || '').replace(/cm/gi, '').trim(), 10);
        let numL = null;
        if (jersey && jersey !== '-') {
          numL = /^[0-9]+$/.test(jersey) ? parseInt(jersey, 10) : jersey;
        }
        players.push({
          number: numL,
          name,
          currentClub: '-',
          age: Number.isNaN(ageL) ? null : ageL,
          height: Number.isNaN(heightL) ? null : heightL,
          position: parts[5] || '-',
          nationality: parts[7] || '-',
          marketValue: parts[6] || '-',
          positionGroup: currentGroup,
          appearances: parseStatIntCell(parts[8]),
          starts: parseStatIntCell(parts[9]),
          goals: parseStatIntCell(parts[10]),
          assists: parseStatIntCell(parts[11]),
        });
        continue;
      }

      if (parts.length < 10) continue;
      const ageW = parseInt(parts[4], 10);
      const heightW = parseInt(String(parts[5] || '').replace(/cm/gi, '').trim(), 10);
      let numW = null;
      if (jersey && jersey !== '-') {
        numW = /^[0-9]+$/.test(jersey) ? parseInt(jersey, 10) : jersey;
      }

      players.push({
        number: numW,
        name,
        currentClub: parts[3] || '-',
        age: Number.isNaN(ageW) ? null : ageW,
        height: Number.isNaN(heightW) ? null : heightW,
        position: parts[6] || '-',
        nationality: parts[8] || '-',
        marketValue: parts[7] || '-',
        positionGroup: currentGroup,
      });
    }
    return { players, coach, formation };
  }

  /**
   * 与 squadProcessor 一致：根据球员数组生成「## 统计摘要」Markdown 块（不含前文）
   */
  buildSquadFinalStatsMarkdown(players) {
    const gk = players.filter((p) => p.positionGroup === 'GK').length;
    const df = players.filter((p) => p.positionGroup === 'DF').length;
    const mf = players.filter((p) => p.positionGroup === 'MF').length;
    const fw = players.filter((p) => p.positionGroup === 'FW').length;
    const validAges = players.filter((p) => p.age).map((p) => p.age);
    const validHeights = players.filter((p) => p.height).map((p) => p.height);
    const avgAge = validAges.length
      ? (validAges.reduce((a, b) => a + b, 0) / validAges.length).toFixed(1)
      : '-';
    const avgHeight = validHeights.length
      ? (validHeights.reduce((a, b) => a + b, 0) / validHeights.length).toFixed(1)
      : '-';

    const lines = [];
    lines.push('## 统计摘要\n');
    lines.push(`- **总人数**: ${players.length}`);
    lines.push(`- **平均年龄**: ${avgAge}岁`);
    lines.push(`- **平均身高**: ${avgHeight}cm`);
    lines.push(`- **位置分布**: 门将${gk} / 后卫${df} / 中场${mf} / 前锋${fw}`);
    return lines.join('\n');
  }

  /**
   * 将 squad-final 文件中「## 统计摘要」及之后替换为根据 players 重算的内容；若无该标题则追加到文末
   */
  updateSquadFinalStatsFile(finalPath, players) {
    const content = readFile(finalPath);
    if (!content) return false;
    const statsBlock = this.buildSquadFinalStatsMarkdown(players);
    const marker = '## 统计摘要';
    const idx = content.indexOf(marker);
    const newContent =
      idx !== -1
        ? `${content.slice(0, idx).trimEnd()}\n\n${statsBlock}\n`
        : `${content.trimEnd()}\n\n${statsBlock}\n`;
    saveMarkdown(finalPath, newContent);
    return true;
  }

  /**
   * 若画像数据来自 squad-final，则回写该文件的统计摘要
   */
  syncSquadFinalStatsAfterProfile(finalPath, players, dataSource) {
    if (dataSource !== 'final' || !finalPath || !players || players.length === 0) return;
    this.updateSquadFinalStatsFile(finalPath, players);
    this.log(`已同步 squad-final 统计摘要: ${finalPath}`);
  }

  /**
   * 按 --source 解析球员列表：final 优先读 squad-final，否则读 player_center JSON；raw 仅 JSON
   * @returns {{ players: any[]|null, dataSource: 'final'|'raw'|null, finalPath: string|null, coach: string|null, formation: string|null }}
   */
  resolvePlayers(teamInfo, scheduleData, source = 'final') {
    const squadFinalRoot =
      config.paths.squadFinal || path.join(config.paths.cupAnalyzer, 'squad-final');
    const flatPath = path.join(squadFinalRoot, `${teamInfo.chineseName}.md`);

    if (source !== 'raw') {
      if (fileExists(flatPath)) {
        const mdContent = readFile(flatPath);
        const parsed = this.parseFinalSquadMarkdown(mdContent);
        if (parsed && parsed.players && parsed.players.length > 0) {
          return {
            players: parsed.players,
            dataSource: 'final',
            finalPath: flatPath,
            coach: parsed.coach,
            formation: parsed.formation,
          };
        }
      }

      const letter = this.findGroupLetterForTeam(teamInfo.id, scheduleData);
      const groupFolder = letter ? `group-${letter}` : 'misc';
      const finalPath = path.join(squadFinalRoot, groupFolder, `${teamInfo.chineseName}.md`);

      if (fileExists(finalPath)) {
        const mdContent = readFile(finalPath);
        const parsed = this.parseFinalSquadMarkdown(mdContent);
        if (parsed && parsed.players && parsed.players.length > 0) {
          return {
            players: parsed.players,
            dataSource: 'final',
            finalPath,
            coach: parsed.coach,
            formation: parsed.formation,
          };
        }
      }
    }

    const jsonPath = path.join(config.paths.playerCenter, `${teamInfo.id}.json`);
    if (source === 'raw') {
      if (fileExists(jsonPath)) {
        return {
          players: readJSON(jsonPath),
          dataSource: 'raw',
          finalPath: null,
          coach: null,
          formation: null,
        };
      }
      return { players: null, dataSource: null, finalPath: null, coach: null, formation: null };
    }

    if (fileExists(jsonPath)) {
      return {
        players: readJSON(jsonPath),
        dataSource: 'raw',
        finalPath: null,
        coach: null,
        formation: null,
      };
    }
    return { players: null, dataSource: null, finalPath: null, coach: null, formation: null };
  }

  /**
   * 分析年龄结构
   */
  analyzeAge(players) {
    const ages = players.filter((p) => p.age).map((p) => p.age);
    if (ages.length === 0) return { avg: 0, min: 0, max: 0, young: 0, prime: 0, veteran: 0 };

    const avg = (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1);
    const young = ages.filter((a) => a <= 23).length;
    const prime = ages.filter((a) => a >= 24 && a <= 29).length;
    const veteran = ages.filter((a) => a >= 30).length;

    return {
      avg: parseFloat(avg),
      min: Math.min(...ages),
      max: Math.max(...ages),
      young,
      prime,
      veteran,
      distribution: { '≤23岁': young, '24-29岁': prime, '≥30岁': veteran },
    };
  }

  /**
   * 分析身高
   */
  analyzeHeight(players) {
    const heights = players.filter((p) => p.height && p.height > 0).map((p) => p.height);
    if (heights.length === 0) return { avg: 0, tallCount: 0 };

    return {
      avg: parseFloat((heights.reduce((a, b) => a + b, 0) / heights.length).toFixed(1)),
      min: Math.min(...heights),
      max: Math.max(...heights),
      tallCount: heights.filter((h) => h >= 185).length,
      shortCount: heights.filter((h) => h < 175).length,
    };
  }

  /**
   * 分析身价
   */
  analyzeMarketValue(players) {
    const values = players
      .map((p) => {
        if (!p.marketValue) return 0;
        const str = String(p.marketValue).replace(/,/g, '');
        const match = str.match(/([\d.]+)/);
        if (!match) return 0;
        const num = parseFloat(match[1]);
        if (str.includes('亿')) return num * 10000;
        return num;
      })
      .filter((v) => v > 0);

    if (values.length === 0) return { total: 0, avg: 0, top5: [] };

    const sorted = [...values].sort((a, b) => b - a);
    const total = values.reduce((a, b) => a + b, 0);

    const top5Players = players
      .map((p) => {
        let val = 0;
        if (p.marketValue) {
          const str = String(p.marketValue).replace(/,/g, '');
          const match = str.match(/([\d.]+)/);
          if (match) {
            val = parseFloat(match[1]);
            if (str.includes('亿')) val *= 10000;
          }
        }
        return { name: p.name, value: val, position: p.position };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      total: Math.round(total),
      avg: Math.round(total / values.length),
      max: sorted[0],
      top5: top5Players,
    };
  }

  /**
   * 分析位置深度
   */
  analyzePositionDepth(players) {
    const depth = { GK: [], DF: [], MF: [], FW: [] };
    players.forEach((p) => {
      const group = depth[p.positionGroup] || depth.MF;
      group.push(p.name);
    });

    const warnings = [];
    if (depth.GK.length < 2) warnings.push('门将深度不足');
    if (depth.DF.length < 6) warnings.push('后卫深度偏薄');
    if (depth.MF.length < 6) warnings.push('中场深度偏薄');
    if (depth.FW.length < 4) warnings.push('前锋深度偏薄');

    return {
      GK: depth.GK.length,
      DF: depth.DF.length,
      MF: depth.MF.length,
      FW: depth.FW.length,
      warnings,
    };
  }

  /**
   * 推断打法风格
   */
  inferTacticalStyle(players, ageAnalysis, heightAnalysis, valueAnalysis) {
    const styles = [];

    if (heightAnalysis.avg >= 182 && heightAnalysis.tallCount >= 8) {
      styles.push('身体对抗型，定位球有空中优势');
    }
    if (heightAnalysis.avg < 178) {
      styles.push('技术型，地面配合为主');
    }
    if (ageAnalysis.avg >= 28) {
      styles.push('经验丰富，比赛阅读能力强，体能可能是隐患');
    }
    if (ageAnalysis.avg <= 25) {
      styles.push('年轻有冲劲，体能充沛，但经验不足');
    }
    if (ageAnalysis.prime >= 15) {
      styles.push('当打之年球员占主体，整体实力最强区间');
    }

    const fwCount = players.filter((p) => p.positionGroup === 'FW').length;
    const mfCount = players.filter((p) => p.positionGroup === 'MF').length;
    if (fwCount >= 8) styles.push('进攻配置充足，可能偏重攻势足球');
    if (mfCount >= 10) styles.push('中场配置厚实，可能偏重控球体系');

    return styles.length > 0 ? styles : ['需要更多比赛数据确认打法'];
  }

  /**
   * 推断球队目标
   */
  inferTeamGoal(teamName, valueAnalysis) {
    const odds = this.championOdds[teamName];

    if (useLeagueStyleAnalysis()) {
      let oddsGoal = '中游';
      if (odds) {
        if (odds <= 10) oddsGoal = '争冠热门';
        else if (odds <= 20) oddsGoal = '争四/争冠';
        else if (odds <= 40) oddsGoal = '欧战区';
        else if (odds <= 80) oddsGoal = '中游';
        else oddsGoal = '保级区';
      }

      let valueGoal = '中游';
      if (valueAnalysis.total >= 80000) valueGoal = '争冠热门';
      else if (valueAnalysis.total >= 50000) valueGoal = '争四/争冠';
      else if (valueAnalysis.total >= 25000) valueGoal = '欧战区';
      else if (valueAnalysis.total >= 10000) valueGoal = '中游';
      else valueGoal = '保级/陪跑';

      return { oddsGoal, valueGoal, odds: odds || '未知' };
    }

    let oddsGoal = '小组出线';

    if (odds) {
      if (odds <= 10) oddsGoal = '夺冠热门';
      else if (odds <= 20) oddsGoal = '四强候选';
      else if (odds <= 40) oddsGoal = '八强目标';
      else if (odds <= 80) oddsGoal = '小组出线';
      else oddsGoal = '陪跑/黑马';
    }

    let valueGoal = '小组出线';
    if (valueAnalysis.total >= 80000) valueGoal = '夺冠热门';
    else if (valueAnalysis.total >= 50000) valueGoal = '四强候选';
    else if (valueAnalysis.total >= 25000) valueGoal = '八强目标';
    else if (valueAnalysis.total >= 10000) valueGoal = '小组出线';
    else valueGoal = '陪跑/黑马';

    return { oddsGoal, valueGoal, odds: odds || '未知' };
  }

  /**
   * 生成单个球队画像 Markdown
   */
  generateProfileMarkdown(teamInfo, players, meta = {}) {
    const ageAnalysis = this.analyzeAge(players);
    const heightAnalysis = this.analyzeHeight(players);
    const valueAnalysis = this.analyzeMarketValue(players);
    const positionDepth = this.analyzePositionDepth(players);
    const tacticalStyle = this.inferTacticalStyle(players, ageAnalysis, heightAnalysis, valueAnalysis);
    const teamGoal = this.inferTeamGoal(teamInfo.chineseName, valueAnalysis);
    const leagueStyle = useLeagueStyleAnalysis();

    const dataTag =
      meta.dataSource === 'final' ? 'squad-final 确认名单' : 'player_center 数据（全量或回退）';
    const coach = meta.coach || null;
    const formation = meta.formation || null;

    const lines = [];
    lines.push(`# ${teamInfo.chineseName}（${teamInfo.englishName}）球队画像\n`);
    lines.push(`> 自动生成 | 基于${dataTag}分析`);
    if (coach) lines.push(`> **主教练**：${coach}`);
    lines.push('');

    // 球队目标
    lines.push(`## 一、球队定位\n`);
    lines.push(`- **冠军赔率**: ${teamGoal.odds}`);
    lines.push(`- **赔率定位**: ${teamGoal.oddsGoal}`);
    lines.push(`- **身价定位**: ${teamGoal.valueGoal}`);
    lines.push(`- **综合目标**: ${teamGoal.oddsGoal}\n`);

    // 球队阵容（按位置大名单 + 预测首发）
    lines.push(`## 二、球队阵容\n`);
    if (formation) {
      lines.push(`### 阵型：${formation}\n`);
    } else {
      lines.push(`### 阵型：未设置\n`);
      lines.push(
        `> 请在 \`squad-final\` 对应文件中于表头增加 \`- **阵型**: 如 4-2-3-1\`，并将球员「位置」列规范为英文缩写（与阵型一致）。\n`
      );
    }
    const squadList = this.buildPositionSquadList(players);
    if (squadList) {
      lines.push(squadList);
      lines.push('');
    }
    if (formation) {
      const predLine = this.buildPredictedStartingLineup(players, formation);
      lines.push(`### 预测首发(${formation})：`);
      lines.push(predLine);
      lines.push('');
    } else {
      lines.push(`### 预测首发`);
      lines.push(`> 需先填写 **阵型** 元数据后方可自动生成。\n`);
    }

    // 年龄结构
    lines.push(`## 三、年龄结构\n`);
    lines.push(`- **平均年龄**: ${ageAnalysis.avg}岁`);
    lines.push(`- **年龄范围**: ${ageAnalysis.min} - ${ageAnalysis.max}岁`);
    lines.push(`- **年轻球员(≤23岁)**: ${ageAnalysis.young}人`);
    lines.push(`- **当打之年(24-29岁)**: ${ageAnalysis.prime}人`);
    lines.push(`- **老将(≥30岁)**: ${ageAnalysis.veteran}人`);
    if (ageAnalysis.avg >= 28) lines.push(`- **⚠️ 平均年龄偏大，体能和连续作战能力需关注**`);
    if (ageAnalysis.young >= 10) lines.push(`- **⚠️ 年轻球员多，大赛经验可能不足**`);
    lines.push('');

    // 身高分析
    lines.push(`## 四、身高分析\n`);
    lines.push(`- **平均身高**: ${heightAnalysis.avg}cm`);
    lines.push(`- **身高范围**: ${heightAnalysis.min} - ${heightAnalysis.max}cm`);
    lines.push(`- **高点(≥185cm)**: ${heightAnalysis.tallCount}人`);
    lines.push(`- **矮个(< 175cm)**: ${heightAnalysis.shortCount}人`);
    if (heightAnalysis.tallCount >= 8) lines.push(`- **定位球空中优势明显**`);
    if (heightAnalysis.avg < 178) lines.push(`- **球队偏矮，定位球防守需注意**`);
    lines.push('');

    // 身价分析
    lines.push(`## 五、身价分析\n`);
    lines.push(`- **总身价**: ${valueAnalysis.total}万`);
    lines.push(`- **平均身价**: ${valueAnalysis.avg}万`);
    lines.push(`- **最高身价**: ${valueAnalysis.max}万`);
    lines.push(`\n**身价TOP 5**:\n`);
    lines.push('| 排名 | 球员 | 位置 | 身价(万) |');
    lines.push('|------|------|------|----------|');
    valueAnalysis.top5.forEach((p, i) => {
      lines.push(`| ${i + 1} | ${p.name} | ${p.position || '-'} | ${p.value} |`);
    });
    lines.push('');

    // 位置深度
    lines.push(`## 六、位置深度\n`);
    lines.push(`- **门将**: ${positionDepth.GK}人`);
    lines.push(`- **后卫**: ${positionDepth.DF}人`);
    lines.push(`- **中场**: ${positionDepth.MF}人`);
    lines.push(`- **前锋**: ${positionDepth.FW}人`);
    if (positionDepth.warnings.length > 0) {
      lines.push(`\n**⚠️ 警告**:`);
      positionDepth.warnings.forEach((w) => lines.push(`- ${w}`));
    }
    lines.push('');

    // 打法推断
    lines.push(`## 七、打法推断\n`);
    tacticalStyle.forEach((s) => lines.push(`- ${s}`));
    lines.push('');

    // AI分析备注
    lines.push(`## 八、AI分析备注\n`);
    lines.push(`> 以上为基于大名单数据的自动分析，实际打法需结合：`);
    if (leagueStyle) {
      lines.push(`> 1. 主教练战术偏好`);
      lines.push(`> 2. 转会窗引援效果`);
      lines.push(`> 3. 多线作战（欧冠/欧联 + 联赛 + 国内杯赛）能力`);
      lines.push(`> 4. 联赛赛程与战意（争冠/保级/欧战资格）`);
    } else {
      lines.push(`> 1. 主教练战术偏好`);
      lines.push(`> 2. 预选赛/友谊赛的阵型和比赛方式`);
      lines.push(`> 3. 核心球员的俱乐部赛季表现`);
      lines.push(`> 4. 球队历史大赛表现`);
    }

    return lines.join('\n');
  }

  /**
   * 获取单个球队画像
   */
  async getProfile(teamName) {
    const profilePath = path.join(config.paths.cupAnalyzer, 'teamProfile', `${teamName}.md`);
    if (fileExists(profilePath)) {
      return readFile(profilePath);
    }
    return null;
  }

  /**
   * 批量生成所有球队画像
   * @param {{ source?: 'final'|'raw' }} options source 默认 final（优先 squad-final，否则 JSON）
   */
  async generateAll(options = {}) {
    const source = options.source || 'final';
    const scheduleData = this.parseScheduleData();
    if (!scheduleData) {
      this.error('无法读取赛程数据');
      return null;
    }

    const teamMap = this.buildTeamMap(scheduleData.arrTeam);
    const realTeams = Object.values(teamMap).filter((t) => t.id < 36185);
    const results = { success: [], noData: [], failed: [] };

    for (const team of realTeams) {
      const { players, dataSource, finalPath, coach, formation } = this.resolvePlayers(
        team,
        scheduleData,
        source
      );
      if (!players || players.length === 0) {
        results.noData.push(team.chineseName);
        continue;
      }

      try {
        const md = this.generateProfileMarkdown(team, players, { dataSource, coach, formation });
        const mdPath = path.join(config.paths.cupAnalyzer, 'teamProfile', `${team.chineseName}.md`);
        saveMarkdown(mdPath, md);
        this.syncSquadFinalStatsAfterProfile(finalPath, players, dataSource);
        results.success.push(team.chineseName);
      } catch (err) {
        this.error(`${team.chineseName} 画像生成失败: ${err.message}`);
        results.failed.push(team.chineseName);
      }
    }

    this.log(`\n画像生成完成: 成功${results.success.length} 无数据${results.noData.length} 失败${results.failed.length}`);
    return results;
  }

  /**
   * 生成单支球队画像
   * @param {string|number} teamSerial 球队序号
   * @param {{ source?: 'final'|'raw' }} options
   */
  async generateOne(teamSerial, options = {}) {
    const source = options.source || 'final';
    const scheduleData = this.parseScheduleData();
    if (!scheduleData) {
      this.error('无法读取赛程数据');
      return null;
    }

    const id = Number(teamSerial);
    if (Number.isNaN(id)) {
      this.error(`无效的球队序号: ${teamSerial}`);
      return null;
    }

    const teamMap = this.buildTeamMap(scheduleData.arrTeam);
    const team = teamMap[id];
    if (!team) {
      this.error(
        `球队序号 ${id} 不在当前赛程 arrTeam 中。请确认已设置正确的 CUP_ANALYZER_CUP，且 cupScheduleData 与球队一致。`
      );
      return null;
    }

    const { players, dataSource, finalPath, coach, formation } = this.resolvePlayers(
      team,
      scheduleData,
      source
    );
    if (!players || players.length === 0) {
      this.error(
        `无可用球员数据（序号 ${id}）。请确认存在 squad-final 名单或 output/player_center/${id}.json`
      );
      return null;
    }

    try {
      const md = this.generateProfileMarkdown(team, players, { dataSource, coach, formation });
      const mdPath = path.join(config.paths.cupAnalyzer, 'teamProfile', `${team.chineseName}.md`);
      saveMarkdown(mdPath, md);
      this.syncSquadFinalStatsAfterProfile(finalPath, players, dataSource);
      this.log(`单队画像完成: ${team.chineseName} → ${mdPath}（来源: ${dataSource}）`);
      return { team, mdPath, dataSource };
    } catch (err) {
      this.error(`画像生成失败: ${err.message}`);
      return null;
    }
  }
}

function printTeamProfileUsage() {
  console.log(`
球队画像生成器

用法:
  node processors/teamProfileGenerator.js [选项]

选项:
  （无参数）              批量生成全部球队（--source 默认 final）
  --source final|raw     final：优先 squad-final，否则 player_center JSON；raw：仅 JSON（final 成功时同步 squad-final 统计摘要）
  --team <序号>           只生成一队
  -t <序号>               同 --team
  --help, -h              显示本说明

示例:
  node processors/teamProfileGenerator.js
  node processors/teamProfileGenerator.js --source raw
  node processors/teamProfileGenerator.js --team 744
`);
}

function parseTeamProfileCliArgs(argv) {
  const out = { mode: 'all', teamSerial: null, source: 'final' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      out.mode = 'help';
      return out;
    }
    if (a === '--source') {
      const next = argv[i + 1];
      if (next && (next === 'final' || next === 'raw')) {
        out.source = next;
        i++;
      }
      continue;
    }
    if (a.startsWith('--source=')) {
      const v = a.slice('--source='.length).trim();
      if (v === 'final' || v === 'raw') out.source = v;
      continue;
    }
    if (a === '--team' || a === '-t') {
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        out.mode = 'one';
        out.teamSerial = String(next).trim();
        i++;
      } else {
        out.mode = 'missing_team';
      }
      continue;
    }
    if (a.startsWith('--team=')) {
      const v = a.slice('--team='.length).trim();
      if (v) {
        out.mode = 'one';
        out.teamSerial = v;
      } else {
        out.mode = 'missing_team';
      }
      continue;
    }
  }
  return out;
}

// CLI 模式
if (require.main === module) {
  const argv = process.argv.slice(2);
  const opts = parseTeamProfileCliArgs(argv);
  const generator = new TeamProfileGenerator();

  if (opts.mode === 'help') {
    printTeamProfileUsage();
    process.exit(0);
  }
  if (opts.mode === 'missing_team') {
    console.error('错误: 请提供球队序号，例如: node processors/teamProfileGenerator.js --team 744\n');
    printTeamProfileUsage();
    process.exit(1);
  }

  const runOpts = { source: opts.source };
  if (opts.mode === 'one' && opts.teamSerial) {
    generator.generateOne(opts.teamSerial, runOpts).catch(console.error);
  } else {
    generator.generateAll(runOpts).catch(console.error);
  }
}

module.exports = TeamProfileGenerator;
