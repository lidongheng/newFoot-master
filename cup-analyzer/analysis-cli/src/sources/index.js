const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { isDeepStrictEqual } = require('node:util');
const { cups } = require('../../../crawler-server/config');

const FILES = ['matchInfo.json', 'matchEvents.json', 'techStats.json', 'lineup.json', 'playerStats.json', 'goalProbability.json'];
const CORE = ['matchInfo.json', 'matchEvents.json', 'techStats.json'];
const hash = (content) => crypto.createHash('sha256').update(content).digest('hex');
// 来源站可能有多个中文译名，config.js 的 teamAliases 与赛程标准名同等有效。
const nameMatches = (value, team) => value === undefined || value === team.name || (Array.isArray(team.aliases) && team.aliases.includes(value));
const shortSeason = (season) => {
  if (!season.includes('-')) return season;
  return season.split('-').map((year) => year.slice(-2)).join('-');
};

function timeValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/.test(value)) throw new Error(`无效的赛程时间：${value}`);
  const time = Date.parse(`${value.replace(' ', 'T')}+08:00`);
  if (!Number.isFinite(time)) throw new Error(`无效的赛程时间：${value}`);
  return time;
}

function loadContext(options, registry = cups) {
  const league = registry[options.league];
  if (!league || league.type !== 'league') throw new Error('赛事不是已登记的联赛。');
  const scheduleFile = league.paths.cupScheduleData;
  const source = fs.readFileSync(scheduleFile, 'utf8');
  const data = { jh: {} };
  vm.runInNewContext(source, data, { filename: scheduleFile, timeout: 5000 });
  if (!data.arrLeague || String(data.arrLeague[0]) !== String(league.cupSerial) || data.arrLeague[4] !== options.season) throw new Error('请求赛事或赛季与本地赛程不一致。');
  if (!Array.isArray(data.arrTeam)) throw new Error('赛程缺少 arrTeam。');
  const teams = data.arrTeam.map((row) => ({ id: String(row[0]), name: row[1], englishName: row[3], aliases: [] }));
  if (options.team && !teams.some((team) => team.id === options.team)) throw new Error('指定球队不在该赛季赛程中。');
  const matches = new Map();
  for (const [key, rows] of Object.entries(data.jh)) {
    if (!/^R_\d+$/.test(key)) continue;
    for (const row of rows) {
      const match = { id: String(row[0]), round: Number(key.slice(2)), status: row[2], time: row[3], timestamp: timeValue(row[3]), homeId: String(row[4]), awayId: String(row[5]), score: row[6], halfScore: row[7] };
      if (matches.has(match.id) && JSON.stringify(matches.get(match.id)) !== JSON.stringify(match)) throw new Error(`赛程比赛 ${match.id} 重复且冲突。`);
      matches.set(match.id, match);
    }
  }
  const root = path.join(league.paths.cupAnalyzer, 'teamAgent');
  const directories = new Map();
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(root, entry.name, 'config.js');
    if (!fs.existsSync(file)) continue;
    const target = require(file);
    const team = teams.find((item) => item.id === target.teamSerial);
    if (!team || target.leagueSlug !== options.league || String(target.leagueSerial) !== String(league.cupSerial) || target.season !== options.season || target.teamChineseName !== team.name || target.teamEnglishName !== team.englishName) throw new Error(`球队配置与目标赛程不一致：${file}`);
    // 别名只用于数据文件里的来源站译名；赛程标准名仍以 teamChineseName 为准。
    if (Array.isArray(target.teamAliases)) {
      for (const alias of target.teamAliases) {
        if (typeof alias !== 'string' || !alias.trim() || alias.trim() === team.name) continue;
        if (!team.aliases.includes(alias.trim())) team.aliases.push(alias.trim());
      }
    }
    if (directories.has(team.id)) throw new Error(`球队配置重复：${team.id}`);
    directories.set(team.id, path.dirname(file));
  }
  return { league: options.league, season: options.season, shortSeason: shortSeason(options.season), directory: league.paths.cupAnalyzer, teams, matches, directories, scheduleFile, scheduleHash: hash(source) };
}

function repairRecords(historyRoot) {
  if (!fs.existsSync(historyRoot)) return [];
  const records = [];
  for (const entry of fs.readdirSync(historyRoot, { withFileTypes: true })) {
    const file = path.join(historyRoot, entry.name, 'record.json');
    if (entry.isDirectory() && fs.existsSync(file)) {
      const record = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (record.status === 'applied') records.push({ file, ...record });
    }
  }
  return records;
}

function readMatches(context, historyRoot) {
  const quality = [];
  const inputs = [];
  const matches = [];
  const repairs = repairRecords(historyRoot);
  for (const match of context.matches.values()) {
    if (match.status !== -1) continue;
    const files = {};
    const sources = [];
    let conflict = false;
    for (const teamId of [match.homeId, match.awayId]) {
      const teamDirectory = context.directories.get(teamId);
      if (!teamDirectory) {
        quality.push({ code: 'missingTeamDirectory', matchId: match.id, teamId });
        continue;
      }
      for (const name of FILES) {
        const file = path.join(teamDirectory, 'basicData', context.shortSeason, match.id, name);
        if (!fs.existsSync(file)) {
          quality.push({ code: 'missingFile', matchId: match.id, teamId, file });
          continue;
        }
        const buffer = fs.readFileSync(file);
        const input = { file, hash: hash(buffer), observedModifiedAt: fs.statSync(file).mtime.toISOString(), matchId: match.id };
        inputs.push(input);
        sources.push(input);
        try {
          const value = JSON.parse(buffer.toString('utf8'));
          if (String(value.matchId) !== match.id) {
            quality.push({ code: 'identityConflict', matchId: match.id, file, actualId: value.matchId });
            conflict = true;
            continue;
          }
          const home = context.teams.find((team) => team.id === match.homeId);
          const away = context.teams.find((team) => team.id === match.awayId);
          if (!home || !away || !nameMatches(value.homeName, home) || !nameMatches(value.awayName, away)) {
            quality.push({ code: 'identityConflict', matchId: match.id, file, note: '文件主客队与本地赛程不符，需核验名称或身份。' });
            conflict = true;
            continue;
          }
          if (files[name] !== undefined) {
            // 摘要可能随采集时间改变，但不影响比赛身份或数值统计。
            let previous = files[name];
            let current = value;
            if (name === 'matchInfo.json') {
              previous = { ...previous };
              current = { ...current };
              delete previous.postMatchSummary;
              delete current.postMatchSummary;
            }
            if (!isDeepStrictEqual(previous, current)) {
              quality.push({ code: 'copyConflict', matchId: match.id, file, filename: name });
              conflict = true;
            }
          } else files[name] = value;
        } catch (error) {
          quality.push({ code: 'invalidJSON', matchId: match.id, file, message: error.message });
          conflict = true;
        }
      }
    }
    if (CORE.some((file) => files[file] === undefined)) {
      quality.push({ code: 'missingCore', matchId: match.id });
      continue;
    }
    let final;
    if (Array.isArray(files['matchEvents.json'].events)) final = files['matchEvents.json'].events.find((event) => event.process === 'FullTime' && event.score);
    if (!final || `${final.score.home}-${final.score.away}` !== match.score || files['matchInfo.json'].stateCode !== -1) {
      quality.push({ code: 'scoreOrStateConflict', matchId: match.id });
      conflict = true;
    }
    if (conflict) continue;
    const appliedRepairs = repairs.filter((record) => record.matchId === match.id && record.league === context.league && record.season === context.season).map((record) => ({ history: record.file, source: record.source, at: record.at, current: record.changes.every((change) => sources.some((source) => source.file === change.file && source.hash === change.afterHash)) }));
    matches.push({ ...match, files, sources, repairs: appliedRepairs });
  }
  return { matches, quality, inputs };
}

module.exports = { FILES, CORE, hash, shortSeason, timeValue, loadContext, readMatches, repairRecords };
