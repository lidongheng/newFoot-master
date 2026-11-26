const { runCli } = require('../utils/recentMarketRanking');

if (require.main === module) {
  runCli('overUnder', 'away');
}
