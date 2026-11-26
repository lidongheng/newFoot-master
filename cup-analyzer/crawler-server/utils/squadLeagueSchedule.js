const fs = require('fs');
const vm = require('vm');
const config = require('../config');
const { seasonFolder } = require('./teamAgent');

/** 从 squadTarget 指定的联赛模块读取赛程，不回退旧 match_center 或旧赛季。 */
function readLeagueSchedule(target) {
  const league = config.cups[target.leagueSlug];
  if (!league || String(league.cupSerial) !== String(target.leagueSerial)) {
    throw new Error('请在 squadTarget.js 设置对应的 leagueSlug 和 leagueSerial。');
  }
  if (league.type !== 'league') {
    throw new Error('本脚本仅适用于联赛 R_* 轮次，不将杯赛阶段当作联赛轮次。');
  }
  const file = league.paths.cupScheduleData;
  const schedule = { jh: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), schedule, { filename: file, timeout: 5000 });
  if (!schedule.arrLeague || String(schedule.arrLeague[0]) !== String(target.leagueSerial) || !Array.isArray(schedule.arrTeam)) {
    throw new Error('赛程缺少联赛信息、球队列表或赛事序号不一致。');
  }
  const season = schedule.arrLeague[4];
  const shortSeason = seasonFolder(season);
  if (target.season !== season && target.season !== shortSeason) {
    throw new Error(`squadTarget.season 必须与赛程赛季 ${season}（${shortSeason}）一致。`);
  }
  const rounds = {};
  const seen = new Set();
  for (const [key, rows] of Object.entries(schedule.jh)) {
    if (!/^R_\d+$/.test(key)) {
      continue;
    }
    rounds[key] = rows.filter((row) => {
      const id = String(row[0]);
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  }
  return { ...schedule, jh: rounds, rounds, season, shortSeason };
}

function parseScore(value) {
  if (typeof value !== 'string' || !/^\d+-\d+$/.test(value)) {
    return null;
  }
  const [home, away] = value.split('-').map(Number);
  return { home, away };
}

module.exports = { readLeagueSchedule, parseScore };
