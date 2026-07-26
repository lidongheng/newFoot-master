const { readJSON, saveJSON, fileExists } = require('../utils/fileWriter');
const { getMatchFactPaths, getTeamObject, getTeamAnalysisPaths } = require('../domain/teamPaths');
const { readJsonLines } = require('../domain/matchStore');

function buildCompanyChanges(snapshot) {
  return snapshot.asianHandicap.map((row) => ({
    company: row.company,
    initialHandicap: row.initialHandicap,
    currentHandicap: row.currentHandicap,
    handicapChanged: String(row.initialHandicap) !== String(row.currentHandicap),
    initialHome: row.initialHome,
    currentHome: row.currentHome,
    homePriceChanged: String(row.initialHome) !== String(row.currentHome),
    initialAway: row.initialAway,
    currentAway: row.currentAway,
    awayPriceChanged: String(row.initialAway) !== String(row.currentAway),
  }));
}

function analyzeMarket(matchId) {
  const factPaths = getMatchFactPaths(matchId);
  if (!fileExists(factPaths.match)) {
    throw new Error(`比赛对象不存在: ${factPaths.match}`);
  }
  const match = readJSON(factPaths.match);
  const snapshots = readJsonLines(factPaths.marketSnapshots);
  if (snapshots.length === 0) {
    throw new Error(`没有盘口快照: ${factPaths.marketSnapshots}`);
  }

  const latest = snapshots[snapshots.length - 1];
  const common = {
    schemaVersion: 1,
    matchId: String(matchId),
    snapshotCount: snapshots.length,
    checkpoints: snapshots.map((snapshot) => snapshot.checkpoint),
    firstCapturedAt: snapshots[0].capturedAt,
    latestCapturedAt: latest.capturedAt,
    source: latest.source,
    latestCompanyChanges: buildCompanyChanges(latest),
  };
  const participants = [
    { teamId: match.homeTeamId, role: 'home', opponentTeamId: match.awayTeamId },
    { teamId: match.awayTeamId, role: 'away', opponentTeamId: match.homeTeamId },
  ];
  const outputs = [];

  for (const participant of participants) {
    const teamObject = getTeamObject(participant.teamId);
    if (!teamObject || !teamObject.deep) continue;
    const output = {
      ...common,
      teamId: participant.teamId,
      opponentTeamId: participant.opponentTeamId,
      perspective: participant.role,
      handicapPerspectiveInSource: 'home',
    };
    const outputPath = getTeamAnalysisPaths(participant.teamId, matchId).market;
    saveJSON(outputPath, output);
    outputs.push(outputPath);
  }
  return outputs;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const matchIndex = args.indexOf('--match');
  const matchId = matchIndex === -1 ? null : args[matchIndex + 1];
  try {
    if (!matchId) throw new Error('用法: node analyzers/marketAnalyzer.js --match <matchId>');
    const outputs = analyzeMarket(matchId);
    console.log(`盘口分析完成，写入 ${outputs.length} 个深度球队视角`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}

module.exports = { analyzeMarket, buildCompanyChanges };
