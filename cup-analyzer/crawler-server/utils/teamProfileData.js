const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { safeTeamDirectory } = require('./teamAgent');

function teamDirectory(root, team) {
  const agentRoot = path.join(root, 'teamAgent');
  if (fs.existsSync(agentRoot)) {
    const found = fs.readdirSync(agentRoot, { withFileTypes: true }).filter((entry) => {
      const file = path.join(agentRoot, entry.name, 'config.js');
      return entry.isDirectory() && fs.existsSync(file) && String(require(file).teamSerial) === String(team.id);
    });
    if (found.length > 1) throw new Error(`球队目录不唯一：${team.id}`);
    if (found.length === 1) return safeTeamDirectory(found[0].name);
  }
  return safeTeamDirectory(team.englishName);
}

function scheduleSeason(file) {
  const data = { jh: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), data, { timeout: 5000 });
  if (data.arrLeague) return data.arrLeague[4];
  if (data.arrCup) return data.arrCup[7];
  throw new Error(`赛程缺少赛季：${file}`);
}

function profileSeason(finalPath, scheduleFile) {
  if (finalPath && fs.existsSync(finalPath)) {
    const match = fs.readFileSync(finalPath, 'utf8').match(/>\s*赛季[:：]\s*(\d{4}-\d{4}|\d{2}-\d{2}|\d{4})(?=\s|\||$)/m);
    if (match) {
      if (/^\d{2}-\d{2}$/.test(match[1])) return match[1].split('-').map((year) => `20${year}`).join('-');
      return match[1];
    }
  }
  return scheduleSeason(scheduleFile);
}

function numeric(value) {
  if (value === null || value === undefined || value === '' || value === '-') return null;
  const text = String(value).trim().replace(/,/g, '');
  if (!/^\d+(?:\.\d+)?(?:cm|万|亿)?$/i.test(text)) return null;
  let result = Number.parseFloat(text);
  if (text.endsWith('亿')) result *= 10000;
  return Number.isFinite(result) ? result : null;
}

// 原表头和单元格一并保存，新增人工列不会在 JSON 导出时丢失。
function tableColumns(content) {
  const rows = [];
  let headers = [];
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.trim().split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.includes('姓名') && cells.includes('球衣号')) {
      headers = cells;
      continue;
    }
    if (!headers.length || cells.every((cell) => /^[-:]*$/.test(cell))) continue;
    if (cells.length !== headers.length) continue;
    rows.push(Object.fromEntries(headers.map((header, index) => [header, cells[index]])));
  }
  return rows;
}

function missingMarkdown(issues) {
  const lines = ['## 待补数据', ''];
  if (!issues.length) return lines.concat('无待补数据。', '').join('\n');
  lines.push('请补充以下源数据后重新生成：', '');
  for (const issue of issues) lines.push(`- ${JSON.stringify(issue)}`);
  return lines.concat('').join('\n');
}

function readMissingMarkdown(content) {
  const section = content.split(/^## 待补数据\s*$/m)[1];
  if (section === undefined) return [];
  return section.split(/\r?\n/).filter((line) => line.startsWith('- {')).map((line) => JSON.parse(line.slice(2)));
}

function profileData(team, season, players, source, finalPath, rawPath) {
  let columns = [];
  if (finalPath && fs.existsSync(finalPath)) columns = tableColumns(fs.readFileSync(finalPath, 'utf8'));
  const issues = [];
  const exported = players.filter((player) => player.staff !== '主教练' && player.attr !== '主教练').map((player) => {
    const row = { ...player };
    const matches = columns.filter((item) => item['姓名'] === player.name && numeric(item['球衣号']) === numeric(player.number));
    if (matches.length === 1) row.sourceColumns = matches[0];
    row.appearances = numeric(player.appearances ?? player.caps);
    row.starts = numeric(player.starts ?? player.lineups);
    row.goals = numeric(player.goals);
    row.assists = numeric(player.assists);
    row.age = numeric(player.age);
    row.height = numeric(player.height);
    row.marketValue = numeric(player.marketValue ?? player.socialStatus);
    const fields = ['number', 'name', 'age', 'height', 'position', 'marketValue', 'ability', 'nationality', 'appearances', 'starts', 'goals', 'assists'];
    for (const field of fields) {
      if (row[field] === undefined) row[field] = null;
      if (row[field] === null || row[field] === undefined || row[field] === '' || row[field] === '-') {
        const issue = { teamId: String(team.id), team: team.chineseName, player: player.name, number: player.number, field, file: finalPath || rawPath };
        if (field === 'appearances') issue.reason = '无法判断是否纳入最多25人的统计样本；请核对名单及赛季分析器统计。';
        issues.push(issue);
      }
    }
    return row;
  });
  return { data: { teamId: String(team.id), chineseName: team.chineseName, englishName: team.englishName, season, dataSource: source, marketValueUnit: '万', players: exported }, issues };
}

module.exports = { teamDirectory, scheduleSeason, profileSeason, numeric, tableColumns, missingMarkdown, readMissingMarkdown, profileData };
