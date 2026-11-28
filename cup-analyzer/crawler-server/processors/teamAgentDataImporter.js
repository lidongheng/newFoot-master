'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs } = require('node:util');
const { cups } = require('../config');
const { loadContext, FILES } = require('../../analysis-cli/src/sources');
const { readSchedule, isClubCompetition } = require('../utils/teamAgent');

function importData(slug, registry = cups) {
  const league = registry[slug];
  if (!league || !isClubCompetition(slug)) throw new Error('请指定已登记的俱乐部赛事。');
  const context = loadContext({ league: slug, season: readSchedule(league).season }, registry);
  const root = path.join(context.directory, 'basicData', context.shortSeason);
  const result = { league: slug, imported: [], skipped: [], blocked: [] };
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const source = path.join(directory, entry.name);
      if (!fs.existsSync(path.join(source, 'matchInfo.json'))) { visit(source); continue; }
      try {
        const info = JSON.parse(fs.readFileSync(path.join(source, 'matchInfo.json'), 'utf8'));
        const match = context.matches.get(String(info.matchId));
        if (!match || match.status !== -1) throw new Error('比赛不在本赛季已完赛赛程中。');
        // 源目录只读，先校验整场的身份、核心文件和终场比分，不拼接不同副本。
        const files = {};
        for (const name of FILES) {
          const file = path.join(source, name);
          if (!fs.existsSync(file)) continue;
          const data = JSON.parse(fs.readFileSync(file, 'utf8'));
          if (String(data.matchId) !== match.id) throw new Error(`${name}比赛ID不符。`);
          for (const [field, id] of [['homeName', match.homeId], ['awayName', match.awayId]]) {
            const team = context.teams.find((item) => item.id === id);
            if (data[field] !== undefined && data[field] !== team.name && !team.aliases.includes(data[field])) throw new Error(`${name}球队身份不符。`);
          }
          files[name] = file;
        }
        for (const name of ['matchInfo.json', 'matchEvents.json', 'techStats.json']) if (!files[name]) throw new Error(`缺少核心文件${name}。`);
        const events = JSON.parse(fs.readFileSync(files['matchEvents.json'], 'utf8')).events;
        const final = events.find((event) => event.process === 'FullTime' && event.score);
        const stats = JSON.parse(fs.readFileSync(files['techStats.json'], 'utf8'));
        if (info.stateCode !== -1 || !final || `${final.score.home}-${final.score.away}` !== match.score || !stats.fullMatch || !Object.keys(stats.fullMatch).length) throw new Error('完赛状态、终场比分或技术统计不完整。');
        const teamDirectory = context.directories.get(match.homeId);
        if (!teamDirectory) throw new Error('请先初始化主队teamAgent配置。');
        const destination = path.join(teamDirectory, 'basicData', context.shortSeason, match.id);
        // 任意目标文件已存在时整场跳过，保留目标副本供人工核对，不覆盖或混拼。
        if (FILES.some((name) => fs.existsSync(path.join(destination, name)))) { result.skipped.push(match.id); continue; }
        fs.mkdirSync(destination, { recursive: true });
        for (const [name, file] of Object.entries(files)) fs.copyFileSync(file, path.join(destination, name), fs.constants.COPYFILE_EXCL);
        result.imported.push(match.id);
      } catch (error) { result.blocked.push({ source, reason: error.message }); }
    }
  }
  if (!fs.existsSync(root)) throw new Error(`缺少旧赛事级数据目录：${root}`);
  visit(root);
  return result;
}

if (require.main === module) {
  try {
    const { values } = parseArgs({ options: { league: { type: 'string' } }, strict: true, allowPositionals: false });
    const result = importData(values.league);
    console.log(JSON.stringify(result, null, 2));
    if (result.blocked.length) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { importData };
