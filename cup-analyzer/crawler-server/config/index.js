const path = require('path');

/**
 * 多杯赛配置：通过环境变量 CUP_ANALYZER_CUP 切换
 * - theWorldCup（默认）
 * - championsLeague
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
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../output/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../championsLeague/data/c103.js'),
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
  },

  crawlDelayMs: 3000,
};

module.exports = config;
