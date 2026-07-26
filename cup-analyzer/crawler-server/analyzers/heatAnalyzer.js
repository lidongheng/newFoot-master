const { readJSON, saveJSON, fileExists } = require('../utils/fileWriter');
const { getMatchFactPaths, getTeamObject, getTeamAnalysisPaths } = require('../domain/teamPaths');

function validateSignals(signals) {
  if (!signals || !Array.isArray(signals.observed) || !Array.isArray(signals.inferred)) {
    throw new Error('heat-signals.json 必须包含 observed 和 inferred 数组');
  }
  for (const signal of signals.observed) {
    if (!signal.id || !signal.source || !signal.capturedAt) {
      throw new Error('每条 observed 热度信号必须包含 id、source、capturedAt');
    }
  }
  for (const signal of signals.inferred) {
    if (!signal.id || !Array.isArray(signal.basedOn) || signal.basedOn.length === 0) {
      throw new Error('每条 inferred 热度信号必须包含 id 和非空 basedOn');
    }
  }
}

function analyzeHeat(matchId) {
  const factPaths = getMatchFactPaths(matchId);
  if (!fileExists(factPaths.match)) {
    throw new Error(`比赛对象不存在: ${factPaths.match}`);
  }
  const match = readJSON(factPaths.match);
  const hasSignals = fileExists(factPaths.heatSignals);
  const signals = hasSignals ? readJSON(factPaths.heatSignals) : null;
  if (signals) validateSignals(signals);

  const participants = [
    { teamId: match.homeTeamId, role: 'home', opponentTeamId: match.awayTeamId },
    { teamId: match.awayTeamId, role: 'away', opponentTeamId: match.homeTeamId },
  ];
  const outputs = [];
  for (const participant of participants) {
    const teamObject = getTeamObject(participant.teamId);
    if (!teamObject || !teamObject.deep) continue;
    const output = hasSignals
      ? {
          schemaVersion: 1,
          matchId: String(matchId),
          teamId: participant.teamId,
          opponentTeamId: participant.opponentTeamId,
          perspective: participant.role,
          status: 'analyzed',
          observed: signals.observed,
          inferred: signals.inferred,
        }
      : {
          schemaVersion: 1,
          matchId: String(matchId),
          teamId: participant.teamId,
          opponentTeamId: participant.opponentTeamId,
          perspective: participant.role,
          status: 'blocked',
          missingInputs: [factPaths.heatSignals],
        };
    const outputPath = getTeamAnalysisPaths(participant.teamId, matchId).heat;
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
    if (!matchId) throw new Error('用法: node analyzers/heatAnalyzer.js --match <matchId>');
    const outputs = analyzeHeat(matchId);
    console.log(`热度分析完成，写入 ${outputs.length} 个深度球队视角`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}

module.exports = { analyzeHeat, validateSignals };
