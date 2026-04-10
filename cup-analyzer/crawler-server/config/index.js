const path = require('path');

/**
 * 多杯赛/联赛配置：通过环境变量 CUP_ANALYZER_CUP 切换
 * - theWorldCup（默认）
 * - championsLeague
 * - epl（英超，球探序号 36，联赛格式 s36.js）
 * - koreanKLeague（韩K联，s15_313，313 为 arrSubLeague 子联赛 ID）
 * - aLeague（澳超，s273_462，462 为 arrSubLeague 子联赛 ID）
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
};

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

  paths: {
    ...active.paths,
    /** @deprecated 请优先使用 cupScheduleData；保留为世界杯 c75 固定路径 */
    c75Data: cups.theWorldCup.paths.cupScheduleData,
    /** 国内联赛赛程 JS（s{联赛序号}.js），供 playerList + clubMatchAnalyzer；见 match_center/README.md */
    matchCenterDir: path.resolve(__dirname, '../match_center'),
  },

  crawlDelayMs: 3000,
};

module.exports = config;
