const fs = require('fs');
const path = require('path');
const vm = require('vm');

const NATIONAL_COMPETITIONS = new Set(['theWorldCup', 'europeanNationalLeague', 'InternationalFriendship']);

function isClubCompetition(slug) {
  return !NATIONAL_COMPETITIONS.has(slug);
}

function seasonFolder(season) {
  if (typeof season !== 'string' || !/^(\d{4}|\d{4}-\d{4})$/.test(season)) {
    throw new Error(`无效的赛程赛季：${season}`);
  }
  if (season.includes('-')) {
    return season.split('-').map((year) => year.slice(2)).join('-');
  }
  return season;
}

function readSchedule(league) {
  const file = league.paths.cupScheduleData;
  if (!fs.existsSync(file)) {
    throw new Error(`缺少赛程：${file}`);
  }
  const source = fs.readFileSync(file, 'utf8');
  if (/^\s*</.test(source)) {
    throw new Error(`赛程文件实际为 HTML：${file}`);
  }
  const context = { jh: {} };
  vm.runInNewContext(source, context, { filename: file, timeout: 5000 });
  let metadata;
  let season;
  if (league.type === 'league') {
    metadata = context.arrLeague;
    season = metadata?.[4];
  } else if (league.type === 'cup') {
    metadata = context.arrCup;
    season = metadata?.[7];
  }
  if (!metadata || String(metadata[0]) !== String(league.cupSerial)) {
    throw new Error(`赛程赛事序号不一致：${file}`);
  }
  seasonFolder(season);
  if (!Array.isArray(context.arrTeam) || context.arrTeam.length === 0) {
    throw new Error(`赛程缺少 arrTeam：${file}`);
  }
  const ids = new Set();
  for (const team of context.arrTeam) {
    if (!Number.isInteger(team[0]) || team[0] <= 0 || ids.has(team[0]) ||
        typeof team[1] !== 'string' || !team[1].trim() || typeof team[3] !== 'string' || !team[3].trim()) {
      throw new Error(`赛程球队 ID 或名称无效：${file}`);
    }
    ids.add(team[0]);
  }
  return { season, arrTeam: context.arrTeam, rounds: context.jh };
}

function safeTeamDirectory(name) {
  const result = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[ .]+$/, '').replace(/\s+/g, '_');
  if (!result || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(result)) {
    throw new Error(`球队英文名无法作为 Windows 目录：${name}`);
  }
  return result;
}

function collectTeamMatches(schedule, type, teamSerial) {
  const matches = new Map();
  function visit(rows) {
    for (const row of rows) {
      if (!Array.isArray(row)) {
        continue;
      }
      // 普通比赛的第 4、5 项是球队 ID；两回合对阵中的相同位置则是比赛数组。
      if (row.length >= 7 && Number.isInteger(row[0]) && Number.isInteger(row[4]) && Number.isInteger(row[5])) {
        if ((String(row[4]) === String(teamSerial) || String(row[5]) === String(teamSerial)) &&
            row[2] === -1 && typeof row[6] === 'string' && /^\d+-\d+$/.test(row[6])) {
          matches.set(String(row[0]), row);
        }
      } else {
        visit(row.filter(Array.isArray));
      }
    }
  }
  for (const [key, rows] of Object.entries(schedule.rounds)) {
    if ((type === 'league' && key.startsWith('R_')) || (type === 'cup' && key.startsWith('G'))) {
      visit(rows);
    }
  }
  return [...matches.values()];
}

function loadTeamTarget(configFile, leagues) {
  const file = path.resolve(configFile);
  const target = require(file);
  const league = leagues[target.leagueSlug];
  if (!league || !isClubCompetition(target.leagueSlug) || String(league.cupSerial) !== target.leagueSerial) {
    throw new Error('球队配置的 leagueSlug、leagueSerial 必须对应已登记的俱乐部赛事。');
  }
  const root = path.join(league.paths.cupAnalyzer, 'teamAgent');
  if (path.dirname(path.dirname(file)) !== root || path.basename(file) !== 'config.js') {
    throw new Error('请指定该赛事 teamAgent/{球队}/config.js。');
  }
  const schedule = readSchedule(league);
  if (target.season !== schedule.season) {
    throw new Error(`球队配置赛季 ${target.season} 与赛程赛季 ${schedule.season} 不一致。`);
  }
  const team = schedule.arrTeam.find((row) => String(row[0]) === target.teamSerial);
  if (!team || team[1] !== target.teamChineseName || team[3] !== target.teamEnglishName) {
    throw new Error('球队配置的 ID、中英文名与赛程不一致。');
  }
  return { target, league, schedule, outputDir: path.join(path.dirname(file), 'basicData', seasonFolder(target.season)) };
}

module.exports = { isClubCompetition, seasonFolder, readSchedule, safeTeamDirectory, collectTeamMatches, loadTeamTarget };
