const path = require('path');

/**
 * 多杯赛配置：通过环境变量 CUP_ANALYZER_CUP 切换
 * - theWorldCup（默认）
 * - championsLeague
 * - epl（英超，联赛序号 36；赛程 season 目录与球探一致，如 2025-2026）
 *
 * 示例：CUP_ANALYZER_CUP=championsLeague node crawlers/scheduleCrawler.js
 */
const cups = {
  theWorldCup: {
    cupSerial: '75',
    cupName: 'theWorldCup',
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
    cupSerial: '103',
    cupName: 'championsLeague',
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
    cupSerial: '36',
    cupName: 'epl',
    /** titan007 联赛赛程 JS 所在赛季目录，与 s36/c36 一致 */
    season: '2025-2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../epl'),
      squadFinal: path.resolve(__dirname, '../../epl/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../output/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../epl/data/c36.js'),
    },
  },
};

const activeKey = process.env.CUP_ANALYZER_CUP || 'theWorldCup';
const active = cups[activeKey] || cups.theWorldCup;

const config = {
  port: 5001,
  activeCupKey: activeKey,
  cups,

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
