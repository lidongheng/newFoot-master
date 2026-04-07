const path = require('path');

const config = {
  port: 5001,

  cupSerial: '75',
  cupName: 'theWorldCup',
  season: '2026',

  paths: {
    cupAnalyzer: path.resolve(__dirname, '../../theWorldCup'),
    playerCenter: path.resolve(__dirname, '../output/player_center'),
    basicData: path.resolve(__dirname, '../output/basicData'),
    c75Data: path.resolve(__dirname, '../../theWorldCup/data/c75.js'),
  },

  crawlDelayMs: 3000,
};

module.exports = config;
