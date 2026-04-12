/**
 * 预测首发字符串：与 teamProfileGenerator / 联赛大名单共用。
 * 按阵型分层，组间 `/`、组内 `，`（全角逗号）；槽位从左到右对应 displayOrder。
 */

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
  'LCM',
  'RCM',
  'CM',
  'CAM',
  'LAM',
  'RAM',
  'LM',
  'RM',
  'LW',
  'RW',
  'ST',
  'CF',
]);

const ZH_POSITION_MAP = {
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
  右中前卫: 'RCM',
  左中前卫: 'LCM',
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

const FORMATION_MAPPINGS = {
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

/**
 * @param {string|null|undefined} raw
 * @returns {string|null}
 */
function normalizePositionCode(raw) {
  const s = String(raw || '').trim();
  if (!s || s === '-') return null;
  const upper = s.toUpperCase();
  if (KNOWN_POSITION_CODES.has(upper)) return upper;
  if (ZH_POSITION_MAP[s]) return ZH_POSITION_MAP[s];
  return null;
}

/**
 * @param {string} formation 如 4-2-3-1、433
 * @returns {string[]|null}
 */
function getPositionsForFormation(formation) {
  const normalizedFormation = String(formation || '').replace(/[^0-9]/g, '');
  return FORMATION_MAPPINGS[normalizedFormation] || FORMATION_MAPPINGS['442'];
}

/**
 * clubMatchAnalyzer 的 player 可能仅有 positions 计数对象，补一条 position 供阵型槽位匹配
 * @param {object} p
 * @returns {object}
 */
function ensurePositionForLineupSlot(p) {
  const withPos = normalizePositionCode(p.position);
  if (withPos) return p;
  if (p.positions && typeof p.positions === 'object') {
    const entries = Object.entries(p.positions).filter(
      ([k]) => k && k !== 'Substitute' && k !== 'Unknown'
    );
    if (entries.length === 0) return p;
    entries.sort((a, b) => b[1] - a[1]);
    return { ...p, position: entries[0][0] };
  }
  return p;
}

/**
 * @param {object} p
 * @returns {string}
 */
function formatSlotJerseyName(p) {
  const raw = p.number;
  if (raw == null || raw === '') return p.name || '（待定）';
  const s = String(raw).trim();
  if (s === '' || s === '-') return p.name || '（待定）';
  return `${s}-${p.name || ''}`;
}

/**
 * @param {object[]} players
 * @param {string} formation
 * @param {(p: object) => string} formatSlotLabel
 * @returns {string}
 */
function buildPredictedStartingLineupString(players, formation, formatSlotLabel) {
  if (!formation || !players || players.length === 0) return '';
  const digitStr = String(formation).replace(/[^0-9]/g, '');
  if (digitStr.length < 2) return '';
  const digits = digitStr.split('').map(Number);
  const positions = getPositionsForFormation(formation);
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

  const enriched = players.map(ensurePositionForLineupSlot);
  const queues = {};
  for (const p of enriched) {
    const code = normalizePositionCode(p.position);
    if (!code) continue;
    if (!queues[code]) queues[code] = [];
    queues[code].push(p);
  }

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
    starters.push(picked ? formatSlotLabel(picked) : '（待定）');
  }

  const groups = [];
  groups.push(starters[0]);
  let sidx = 1;
  for (const d of digits) {
    groups.push(starters.slice(sidx, sidx + d).join('，'));
    sidx += d;
  }
  return groups.join('/');
}

/**
 * 将 mostUsedFormation（如 433）格式化为 4-3-3 展示用
 */
function formationDigitsToDisplay(mostUsedFormation) {
  const s = String(mostUsedFormation || '').replace(/[^0-9]/g, '');
  if (!s) return '';
  return s.split('').join('-');
}

/**
 * 与 `clubMatchAnalyzer` 写入 `*-new.json` 的 `recommendedLineup` 完全一致：只负责分段排版，
 * 不改变球员人选与顺序（阵线顺序即 analyze 中 formation positions 顺序）。
 *
 * @param {object[]} recommendedLineup analyze 输出的 11 人列表
 * @param {string} mostUsedFormation 如 433、4231
 * @param {(p: object) => string} formatSlotLabel 如球衣号-姓名
 * @returns {string}
 */
function formatAnalyzerRecommendedLineup(recommendedLineup, mostUsedFormation, formatSlotLabel) {
  if (!recommendedLineup || recommendedLineup.length === 0) return '';
  const slotFn = typeof formatSlotLabel === 'function' ? formatSlotLabel : formatSlotJerseyName;
  const slots = recommendedLineup.map((p) => slotFn(p));
  const digitStr = String(mostUsedFormation || '').replace(/[^0-9]/g, '');
  const digits = digitStr.split('').map(Number);
  if (digitStr.length < 2 || digits.reduce((a, b) => a + b, 0) !== 10) {
    return slots.join('，');
  }
  const groups = [];
  groups.push(slots[0]);
  let idx = 1;
  for (const d of digits) {
    groups.push(slots.slice(idx, idx + d).join('，'));
    idx += d;
  }
  return groups.join('/');
}

module.exports = {
  normalizePositionCode,
  getPositionsForFormation,
  buildPredictedStartingLineupString,
  ensurePositionForLineupSlot,
  formatSlotJerseyName,
  formationDigitsToDisplay,
  formatAnalyzerRecommendedLineup,
  KNOWN_POSITION_CODES,
};
