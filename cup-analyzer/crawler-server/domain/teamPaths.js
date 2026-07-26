const path = require('path');
const { getTeamObject, requireDeepTeamObject } = require('../config/teamObjects');

const projectRoot = path.resolve(__dirname, '../..');
const clubFootballRoot = path.join(projectRoot, 'club-football');

function getTeamRoot(teamId) {
  const teamObject = requireDeepTeamObject(teamId);
  return path.join(clubFootballRoot, 'teams', teamObject.slug);
}

function getSeasonRoot(teamId) {
  const teamObject = requireDeepTeamObject(teamId);
  return path.join(getTeamRoot(teamId), 'seasons', teamObject.season);
}

function getFundamentalPaths(teamId) {
  const root = path.join(getSeasonRoot(teamId), 'fundamentals');
  return {
    draftSquad: path.join(root, 'squad', 'draft.md'),
    confirmedSquad: path.join(root, 'squad-final', 'confirmed.md'),
    teamProfile: path.join(root, 'team-profile.md'),
    historyMatchProfile: path.join(root, 'history-match-profile.md'),
  };
}

function getMatchRoot(matchId) {
  if (matchId == null || String(matchId).trim() === '') {
    throw new Error('matchId 不能为空');
  }
  return path.join(clubFootballRoot, 'matches', String(matchId));
}

function getMatchFactPaths(matchId) {
  const root = getMatchRoot(matchId);
  return {
    match: path.join(root, 'match.json'),
    marketSnapshots: path.join(root, 'facts', 'market-snapshots.jsonl'),
    heatSignals: path.join(root, 'facts', 'heat-signals.json'),
  };
}

function getTeamMatchRoot(teamId, matchId) {
  return path.join(getSeasonRoot(teamId), 'matches', String(matchId));
}

function getTeamAnalysisPaths(teamId, matchId) {
  const matchRoot = getTeamMatchRoot(teamId, matchId);
  return {
    market: path.join(matchRoot, 'market-analysis.json'),
    heat: path.join(matchRoot, 'heat-analysis.json'),
    methods: path.join(matchRoot, 'methods'),
  };
}

module.exports = {
  clubFootballRoot,
  getTeamObject,
  getTeamRoot,
  getSeasonRoot,
  getFundamentalPaths,
  getMatchRoot,
  getMatchFactPaths,
  getTeamMatchRoot,
  getTeamAnalysisPaths,
};
