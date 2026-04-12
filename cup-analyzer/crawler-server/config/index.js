const path = require('path');

/**
 * 多杯赛/联赛配置：通过环境变量 CUP_ANALYZER_CUP 切换
 * - theWorldCup（默认）
 * - championsLeague
 * - epl（英超，球探序号 36，联赛格式 s36.js）
 * - koreanKLeague（韩K联，s15_313，313 为 arrSubLeague 子联赛 ID）
 * - aLeague（澳超，s273_462，462 为 arrSubLeague 子联赛 ID）
 * - mls（美职联，s21_165，165 为 arrSubLeague 常规赛子联赛 ID）
 * - serieA（意甲，s34_2948，2948 为 arrSubLeague 子联赛 ID）
 *
 * 示例：CUP_ANALYZER_CUP=championsLeague node crawlers/scheduleCrawler.js
 */
const cups = {
  theWorldCup: {
    fileId: 'c75',
    type: 'cup',
    cupSerial: '75',
    cupName: 'theWorldCup',
    chineseName: '世界杯',
    crossYear: false,
    season: '2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../theWorldCup'),
      squadFinal: path.resolve(__dirname, '../../theWorldCup/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../output/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../theWorldCup/data/c75.js'),
    },
  },
  championsLeague: {
    fileId: 'c103',
    type: 'cup',
    cupSerial: '103',
    cupName: 'championsLeague',
    chineseName: '欧冠',
    crossYear: true,
    season: '25-26',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../championsLeague'),
      squadFinal: path.resolve(__dirname, '../../championsLeague/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../output/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../championsLeague/data/c103.js'),
    },
  },
  epl: {
    fileId: 's36',
    type: 'league',
    cupSerial: '36',
    cupName: 'epl',
    chineseName: '英超',
    crossYear: true,
    /** titan007 联赛赛程 JS 所在赛季目录，与 s36 一致 */
    season: '2025-2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../epl'),
      squadFinal: path.resolve(__dirname, '../../epl/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../output/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../epl/data/s36.js'),
    },
  },
  koreanKLeague: {
    fileId: 's15_313',
    type: 'league',
    cupSerial: '15',
    cupName: 'koreanKLeague',
    chineseName: '韩K联',
    crossYear: false,
    /** 子联赛 ID，与 titan007 arrSubLeague 中「联赛」阶段一致 */
    subLeagueId: '313',
    season: '2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../koreanKLeague'),
      squadFinal: path.resolve(__dirname, '../../koreanKLeague/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../output/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../koreanKLeague/data/s15_313.js'),
    },
  },
  aLeague: {
    fileId: 's273_462',
    type: 'league',
    cupSerial: '273',
    cupName: 'aLeague',
    chineseName: '澳超',
    crossYear: true,
    /** 子联赛 ID，与 titan007 arrSubLeague 中「联赛」阶段一致 */
    subLeagueId: '462',
    season: '2025-2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../aLeague'),
      squadFinal: path.resolve(__dirname, '../../aLeague/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../output/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../aLeague/data/s273_462.js'),
    },
  },
  mls: {
    fileId: 's21_165',
    type: 'league',
    cupSerial: '21',
    cupName: 'mls',
    chineseName: '美职联',
    crossYear: false,
    /** 子联赛 ID，与 titan007 arrSubLeague 中「常规赛」阶段一致 */
    subLeagueId: '165',
    /** titan007 matchResult 赛季目录，与 s21_165 一致 */
    season: '2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../mls'),
      squadFinal: path.resolve(__dirname, '../../mls/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../output/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../mls/data/s21_165.js'),
    },
  },
  serieA: {
    fileId: 's34_2948',
    type: 'league',
    cupSerial: '34',
    cupName: 'serieA',
    chineseName: '意甲',
    crossYear: true,
    /** 子联赛 ID，与 titan007 arrSubLeague 中联赛阶段一致 */
    subLeagueId: '2948',
    /** titan007 matchResult 赛季目录，与 s34_2948 一致 */
    season: '2025-2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../serieA'),
      squadFinal: path.resolve(__dirname, '../../serieA/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../output/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../serieA/data/s34_2948.js'),
    },
  },
};

/** 球探联赛/杯赛序号 → 对应 cup-analyzer 赛程 JS 绝对路径（含子联赛文件名，如 s273_462.js） */
const schedulePathBySerial = {};
for (const cup of Object.values(cups)) {
  schedulePathBySerial[cup.cupSerial] = cup.paths.cupScheduleData;
}

const matchCenterDir = path.resolve(__dirname, '../match_center');

/**
 * 解析 clubMatchAnalyzer / squadTarget 使用的赛程文件路径
 * @param {string} leagueSerial 纯数字序号（无 s/c 前缀），与 squadTarget.leagueSerial 一致
 * @param {boolean} [isNation] 国家队赛事用 c 前缀
 * @returns {string} 优先使用 cups 中已配置的 cupScheduleData，否则回退 match_center/s{n}.js 或 c{n}.js
 */
function resolveScheduleData(leagueSerial, isNation) {
  if (schedulePathBySerial[leagueSerial]) {
    return schedulePathBySerial[leagueSerial];
  }
  const prefix = isNation ? 'c' : 's';
  return path.join(matchCenterDir, `${prefix}${leagueSerial}.js`);
}

const activeKey = process.env.CUP_ANALYZER_CUP || 'theWorldCup';
const active = cups[activeKey] || cups.theWorldCup;

const config = {
  port: 5001,
  activeCupKey: activeKey,
  cups,

  fileId: active.fileId,
  type: active.type,
  crossYear: active.crossYear,
  chineseName: active.chineseName,

  cupSerial: active.cupSerial,
  cupName: active.cupName,
  season: active.season,

  /** 序号 → 各模块 data/ 下赛程 JS，供 resolveScheduleData */
  schedulePathBySerial,
  resolveScheduleData,

  paths: {
    ...active.paths,
    /** @deprecated 请优先使用 cupScheduleData；保留为世界杯 c75 固定路径 */
    c75Data: cups.theWorldCup.paths.cupScheduleData,
    /** 国内联赛赛程 JS 兜底目录（未在 cups 中配置的序号）；scheduleCrawler 会同步写入；见 match_center/README.md */
    matchCenterDir,
  },

  crawlDelayMs: 3000,
};

module.exports = config;
