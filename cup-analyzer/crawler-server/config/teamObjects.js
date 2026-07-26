const TEAM_OBJECTS = Object.freeze({
  19: Object.freeze({
    teamId: 19,
    slug: 'arsenal',
    domain: 'club',
    season: '2026-2027',
    deep: true,
  }),
  741: Object.freeze({
    teamId: 741,
    slug: 'fc-seoul',
    domain: 'club',
    season: '2026',
    deep: true,
  }),
});

function getTeamObject(teamId) {
  return TEAM_OBJECTS[Number(teamId)] || null;
}

function requireDeepTeamObject(teamId) {
  const teamObject = getTeamObject(teamId);
  if (!teamObject || !teamObject.deep) {
    throw new Error(`球队 ${teamId} 尚未注册为深度球队对象`);
  }
  return teamObject;
}

module.exports = {
  TEAM_OBJECTS,
  getTeamObject,
  requireDeepTeamObject,
};
