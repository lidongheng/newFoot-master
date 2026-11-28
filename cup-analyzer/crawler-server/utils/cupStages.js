'use strict';

// 只从本地阶段元数据确定正赛起点，保留其后的联赛/分组阶段和淘汰赛。
function mainStageSchedule(schedule) {
  if (!Array.isArray(schedule.stageKinds)) throw new Error('杯赛缺少arrCupKind，无法确定正赛起点。');
  const start = schedule.stageKinds.findIndex((row) => row[1] === 1);
  if (start < 0) throw new Error('杯赛尚无已确认的联赛或分组阶段。');
  const stages = new Set(schedule.stageKinds.slice(start).map((row) => String(row[0])));
  const rounds = {};
  const teams = new Set();
  function visit(rows) {
    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      if (row.length >= 7 && Number.isInteger(row[0]) && Number.isInteger(row[4]) && Number.isInteger(row[5])) {
        teams.add(row[4]);
        teams.add(row[5]);
      } else visit(row.filter(Array.isArray));
    }
  }
  for (const [key, rows] of Object.entries(schedule.rounds)) {
    const match = key.match(/^[GS](\d+)[A-Z]*$/);
    if (!match || !stages.has(match[1])) continue;
    rounds[key] = rows;
    if (key.startsWith('G')) visit(rows);
  }
  if (!teams.size) throw new Error('杯赛正赛阶段没有已确认的比赛球队。');
  return { ...schedule, arrTeam: schedule.arrTeam.filter((row) => teams.has(row[0])), rounds };
}

module.exports = { mainStageSchedule };
