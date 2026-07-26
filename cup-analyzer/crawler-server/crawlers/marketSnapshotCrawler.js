const OddsCrawler = require('./oddsCrawler');
const targets = require('../config/targets');
const { appendMarketSnapshot, validateCheckpoint } = require('../domain/matchStore');
const { fileExists } = require('../utils/fileWriter');
const { getMatchFactPaths } = require('../domain/teamPaths');

class MarketSnapshotCrawler extends OddsCrawler {
  constructor() {
    super();
    this.name = 'MarketSnapshotCrawler';
  }

  async crawlSnapshot(matchId, checkpoint) {
    validateCheckpoint(checkpoint);
    const matchPath = getMatchFactPaths(matchId).match;
    if (!fileExists(matchPath)) {
      throw new Error(`请先创建比赛对象: ${matchPath}`);
    }

    const html = await this.fetchText(
      targets.titan007.matchStatisticsUrl(matchId),
      targets.titan007.headers.desktop
    );
    const snapshot = {
      schemaVersion: 1,
      matchId: String(matchId),
      checkpoint,
      capturedAt: new Date().toISOString(),
      source: 'titan007',
      handicapPerspective: 'home',
      handicapSignConvention: 'home-gives-negative-home-receives-positive',
      asianHandicap: this.parseAsianHandicap(html),
      europeanOdds: this.parseEuropeanOdds(html),
    };
    const outputPath = appendMarketSnapshot(snapshot);
    this.log(`盘口快照已追加: ${outputPath}`);
    return snapshot;
  }
}

function readArg(args, name) {
  const index = args.indexOf(name);
  if (index === -1 || !args[index + 1]) return null;
  return args[index + 1];
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const matchId = readArg(args, '--match');
  const checkpoint = readArg(args, '--checkpoint');
  if (!matchId || !checkpoint) {
    console.error('用法: node crawlers/marketSnapshotCrawler.js --match <matchId> --checkpoint <opening|analysis|lineup|closing>');
    process.exitCode = 1;
  } else {
    new MarketSnapshotCrawler().crawlSnapshot(matchId, checkpoint).catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    });
  }
}

module.exports = MarketSnapshotCrawler;
