const { cups } = require('../config');
const { loadTeamTarget } = require('./teamAgent');

/** 指定 --config 时读取并核验球队配置；未指定时保留原 squadTarget 入口。 */
function resolveProcessorTarget(args, defaultTarget) {
  const index = args.indexOf('--config');
  if (index === -1) {
    return { target: defaultTarget, args, schedule: null };
  }
  if (!args[index + 1] || args[index + 1].startsWith('--') || args.lastIndexOf('--config') !== index) {
    throw new Error('--config 必须且只能指定一个球队 config.js。');
  }
  const loaded = loadTeamTarget(args[index + 1], cups);
  const remaining = args.slice();
  remaining.splice(index, 2);
  return { target: loaded.target, args: remaining, schedule: loaded.schedule };
}

/** 球队分析页必须对应配置球队本轮尚未开打的比赛，防止误抓其他队或已完赛场次。 */
function validateUpcomingMatch(schedule, target, id) {
  const rows = schedule.rounds[`R_${target.roundSerial}`];
  if (!Array.isArray(rows)) {
    throw new Error('球队配置的 roundSerial 在本地联赛赛程中不存在。');
  }
  const match = rows.find((row) => String(row[0]) === String(id));
  if (!match || (String(match[4]) !== target.teamSerial && String(match[5]) !== target.teamSerial)) {
    throw new Error('matchSerial 必须是本轮本队的比赛 ID。');
  }
  if (match[2] !== 0) {
    throw new Error('配置比赛已开打、已结束或状态异常，请更新本轮即将开打的比赛 ID。');
  }
}

module.exports = { resolveProcessorTarget, validateUpcomingMatch };
