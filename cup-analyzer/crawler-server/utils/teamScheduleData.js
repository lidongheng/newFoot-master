const DATA_START = '<!-- TEAM_SCHEDULE_DATA';
const DATA_END = '-->';

function futureScheduleData(teamId, sourceTeamId, anchorTime, upcoming, formatTime) {
  return {
    teamId: String(teamId),
    source: 'dongqiudi',
    sourceTeamId: String(sourceTeamId),
    anchorTime,
    timezone: 'Asia/Shanghai',
    windowDays: 30,
    matches: upcoming.map((fixture) => {
      const raw = fixture.raw;
      let venue = 'away';
      let opponentId = raw.team_A_id;
      if (fixture.teamSide === 'A') {
        venue = 'home';
        opponentId = raw.team_B_id;
      }
      return {
        matchId: fixture.matchId,
        competitionId: raw.competition_id,
        competitionName: fixture.competitionName,
        gameweek: fixture.gameweek,
        matchTitle: fixture.matchTitle,
        homeTeamId: raw.team_A_id,
        homeTeamName: raw.team_A_name,
        awayTeamId: raw.team_B_id,
        awayTeamName: raw.team_B_name,
        opponentId,
        opponentName: fixture.opponentName,
        venue,
        startTime: formatTime(fixture.startPlay),
        status: fixture.status,
      };
    }),
  };
}

function scheduleDataComment(data) {
  // 随现有赛程区块透传结构化原值，不从展示文字反推日期、对手或比赛ID。
  return `${DATA_START}\n${JSON.stringify(data, null, 2).replace(/-->/g, '--\\u003e')}\n${DATA_END}`;
}

function readFutureSchedule(content, teamId) {
  const blocks = [...content.matchAll(/<!-- TEAM_SCHEDULE_START -->([\s\S]*?)<!-- TEAM_SCHEDULE_END -->/g)];
  if (!blocks.length) return undefined;
  if (blocks.length !== 1) throw new Error('球队画像存在多个赛程区块，无法唯一导出未来赛程。');
  const records = [...blocks[0][1].matchAll(/<!-- TEAM_SCHEDULE_DATA\s*([\s\S]*?)-->/g)];
  if (!records.length) return undefined;
  if (records.length !== 1) throw new Error('赛程区块存在多份结构化数据。');
  const data = JSON.parse(records[0][1]);
  if (data.teamId !== String(teamId) || data.source !== 'dongqiudi' || data.timezone !== 'Asia/Shanghai' || data.windowDays !== 30 || typeof data.anchorTime !== 'string' || !Array.isArray(data.matches)) throw new Error('未来赛程数据的球队、来源或结构不符。');
  return data;
}

module.exports = { futureScheduleData, scheduleDataComment, readFutureSchedule };
