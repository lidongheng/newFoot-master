const { saveJSON, fileExists } = require('../utils/fileWriter');
const { getMatchFactPaths } = require('../domain/teamPaths');

function createMatchObject(input) {
  if (!input.matchId || !input.competition || !input.kickoff) {
    throw new Error('matchId、competition、kickoff 均为必填项');
  }
  if (!Number.isInteger(input.homeTeamId) || !Number.isInteger(input.awayTeamId)) {
    throw new Error('homeTeamId、awayTeamId 必须是整数');
  }
  const matchPath = getMatchFactPaths(input.matchId).match;
  if (fileExists(matchPath)) {
    throw new Error(`比赛对象已存在，拒绝覆盖: ${matchPath}`);
  }
  const match = {
    schemaVersion: 1,
    objectType: 'club-match',
    matchId: String(input.matchId),
    competition: input.competition,
    kickoff: input.kickoff,
    homeTeamId: input.homeTeamId,
    awayTeamId: input.awayTeamId,
  };
  saveJSON(matchPath, match);
  return matchPath;
}

function readArg(args, name) {
  const index = args.indexOf(name);
  if (index === -1 || !args[index + 1]) return null;
  return args[index + 1];
}

if (require.main === module) {
  const args = process.argv.slice(2);
  try {
    const matchPath = createMatchObject({
      matchId: readArg(args, '--match'),
      competition: readArg(args, '--competition'),
      kickoff: readArg(args, '--kickoff'),
      homeTeamId: Number(readArg(args, '--home')),
      awayTeamId: Number(readArg(args, '--away')),
    });
    console.log(`比赛对象已创建: ${matchPath}`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}

module.exports = { createMatchObject };
