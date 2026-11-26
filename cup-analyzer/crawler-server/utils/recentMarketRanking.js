const fs = require('fs');
const path = require('path');
const vm = require('vm');
const config = require('../config');

function parseRound(args) {
  if (args.length === 0) {
    return 6;
  }
  if (args.length !== 2 || args[0] !== '--round' || !/^[1-9]\d*$/.test(args[1])) {
    throw new Error('参数格式：--round N，N 必须为正整数');
  }
  const round = Number(args[1]);
  if (!Number.isSafeInteger(round)) {
    throw new Error('--round 必须为安全范围内的正整数');
  }
  return round;
}

function parseOptions(args) {
  const trendFlags = args.filter((arg) => arg === '--trend');
  if (trendFlags.length > 1) {
    throw new Error('--trend 不能重复指定');
  }
  return {
    round: parseRound(args.filter((arg) => arg !== '--trend')),
    showTrend: trendFlags.length === 1,
  };
}

function matchError(row, field) {
  return new Error(`比赛 ${row[0]}：${field} 缺失或格式非法`);
}

function parseTime(row) {
  if (typeof row[3] !== 'string') {
    throw matchError(row, '开赛时间[3]');
  }
  const match = row[3].match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    throw matchError(row, '开赛时间[3]');
  }
  const [year, month, day, hour, minute] = match.slice(1, 6).map(Number);
  let second = 0;
  if (match[6] !== undefined) {
    second = Number(match[6]);
  }
  // 使用统一的 UTC 构造值比较北京时间，避免运行机器时区影响取样顺序。
  const time = Date.UTC(year, month - 1, day, hour, minute, second);
  const date = new Date(time);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day || date.getUTCHours() !== hour ||
      date.getUTCMinutes() !== minute || date.getUTCSeconds() !== second) {
    throw matchError(row, '开赛时间[3]');
  }
  return time;
}

function parseScore(row) {
  if (typeof row[6] !== 'string' || !/^\d+-\d+$/.test(row[6])) {
    throw matchError(row, '全场比分[6]');
  }
  const goals = row[6].split('-').map(Number);
  if (goals.some((goal) => !Number.isSafeInteger(goal))) {
    throw matchError(row, '全场比分[6]');
  }
  return goals;
}

function splitQuarterLine(value) {
  if (Number.isInteger(value * 2)) {
    return [value];
  }
  return [Math.floor(value * 2) / 2, Math.ceil(value * 2) / 2];
}

function parseHandicap(row) {
  const line = row[10];
  if (typeof line !== 'number' || !Number.isFinite(line) || !Number.isSafeInteger(line * 4)) {
    throw matchError(row, '全场亚盘初盘[10]');
  }
  return splitQuarterLine(line);
}

function parseTotal(row) {
  const value = row[12];
  if (typeof value !== 'string' || !/^\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?$/.test(value)) {
    throw matchError(row, '全场大小球盘口[12]');
  }
  const lines = value.split('/').map(Number);
  if (lines.some((line) => !Number.isFinite(line) || !Number.isSafeInteger(line * 4))) {
    throw matchError(row, '全场大小球盘口[12]');
  }
  if (lines.length === 2) {
    if (lines[1] - lines[0] !== 0.5 || lines.some((line) => !Number.isInteger(line * 2))) {
      throw matchError(row, '全场大小球盘口[12]');
    }
    return lines;
  }
  return splitQuarterLine(lines[0]);
}

function settle(row, market, teamId) {
  const [homeGoals, awayGoals] = parseScore(row);
  let results;
  if (market === 'asianHandicap') {
    results = parseHandicap(row).map((line) => Math.sign(homeGoals - awayGoals - line));
    if (teamId === row[5]) {
      results = results.map((result) => -result);
    }
  } else {
    results = parseTotal(row).map((line) => Math.sign(homeGoals + awayGoals - line));
  }
  // 两半盘口先独立结算；半赢归赢、半输归输，只有全走才归走。
  const result = Math.sign(results.reduce((sum, item) => sum + item, 0));
  if (result === 0) {
    return 0;
  }
  return result;
}

function buildRanking(data, { market, venue, round }) {
  if (!['asianHandicap', 'overUnder'].includes(market) || !['all', 'home', 'away'].includes(venue) ||
      !Number.isSafeInteger(round) || round < 1) {
    throw new Error('榜单类型、主客场范围或场数无效');
  }
  if (!Array.isArray(data.arrTeam) || !data.jh || typeof data.jh !== 'object') {
    throw new Error('赛程必须包含 arrTeam 数组及 jh 轮次数据');
  }
  const teams = new Map();
  for (const team of data.arrTeam) {
    if (!Array.isArray(team) || !Number.isSafeInteger(team[0]) || team[0] <= 0 ||
        typeof team[1] !== 'string' || team[1].trim() === '' || teams.has(team[0])) {
      throw new Error('arrTeam 球队序号或中文名称无效或重复');
    }
    teams.set(team[0], { teamId: team[0], teamName: team[1], matches: [] });
  }
  const rounds = Object.keys(data.jh).filter((key) => /^R_\d+$/.test(key));
  if (rounds.length === 0) {
    throw new Error('jh 中没有 R_N 轮次数据');
  }
  for (const key of rounds) {
    if (!Array.isArray(data.jh[key])) {
      throw new Error(`${key} 必须为比赛数组`);
    }
    for (const row of data.jh[key]) {
      if (!Array.isArray(row)) {
        throw new Error(`${key} 中的比赛必须为数组`);
      }
      if (row[2] !== -1) {
        continue;
      }
      if (!Number.isSafeInteger(row[0]) || row[0] <= 0) {
        throw matchError(row, '比赛 ID[0]');
      }
      if (!teams.has(row[4]) || !teams.has(row[5]) || row[4] === row[5]) {
        throw matchError(row, '主客队序号[4]/[5]');
      }
      const match = { row, time: parseTime(row) };
      if (venue !== 'away') {
        teams.get(row[4]).matches.push(match);
      }
      if (venue !== 'home') {
        teams.get(row[5]).matches.push(match);
      }
    }
  }
  const ranking = [];
  const excludedTeams = [];
  for (const team of teams.values()) {
    // 轮次仅用于收集赛程；补赛以实际开赛时间排序。时间相同保留原数据顺序。
    const selected = team.matches.sort((a, b) => b.time - a.time).slice(0, round).reverse();
    if (selected.length === 0) {
      excludedTeams.push(team.teamName);
      continue;
    }
    const results = selected.map(({ row }) => settle(row, market, team.teamId));
    const wins = results.filter((result) => result === 1).length;
    const pushes = results.filter((result) => result === 0).length;
    const losses = results.filter((result) => result === -1).length;
    const points = [0];
    for (const result of results) {
      points.push(points[points.length - 1] + result);
    }
    ranking.push({
      teamId: team.teamId,
      teamName: team.teamName,
      count: selected.length,
      wins,
      pushes,
      losses,
      winRate: wins / selected.length,
      pushRate: pushes / selected.length,
      lossRate: losses / selected.length,
      matchIds: selected.map(({ row }) => row[0]),
      results,
      points,
    });
  }
  ranking.sort((a, b) => b.winRate - a.winRate);
  return { ranking, excludedTeams };
}

function displayWidth(text) {
  let width = 0;
  for (const char of String(text)) {
    if (/\p{Mark}/u.test(char)) {
      continue;
    }
    const code = char.codePointAt(0);
    if ((code >= 0x1100 && code <= 0x115f) || (code >= 0x2e80 && code <= 0xa4cf) ||
        (code >= 0xac00 && code <= 0xd7a3) || (code >= 0xf900 && code <= 0xfaff) ||
        (code >= 0xfe10 && code <= 0xfe6f) || (code >= 0xff01 && code <= 0xff60) ||
        (code >= 0xffe0 && code <= 0xffe6) || (code >= 0x20000 && code <= 0x3fffd)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

function padCell(value, width) {
  const text = String(value);
  return text + ' '.repeat(width - displayWidth(text));
}

function renderTrend(points, min, max, matchCount) {
  // 一分占两个字符行，在两点之间留出一行绘制连续斜线。
  const grid = Array.from({ length: (max - min) * 2 + 1 }, () => Array(matchCount * 2 + 1).fill(' '));
  points.forEach((point, index) => {
    const y = (max - point) * 2;
    const x = index * 2;
    grid[y][x] = '●';
    if (index === points.length - 1) {
      return;
    }
    const next = points[index + 1];
    if (next > point) {
      grid[y - 1][x + 1] = '╱';
    } else if (next < point) {
      grid[y + 1][x + 1] = '╲';
    } else {
      grid[y][x + 1] = '─';
    }
  });
  const axisWidth = Math.max(String(min).length, String(max).length);
  const lines = grid.map((line, index) => {
    let label = ' '.repeat(axisWidth);
    if (index % 2 === 0) {
      label = String(max - index / 2).padStart(axisWidth);
    }
    return `${label} │${line.join('')}`;
  });
  lines.push(`累计 ${points[points.length - 1]} 分`);
  return lines;
}

function renderTable(ranking, market, showTrend = false) {
  const labels = ['赢', '走', '输', '赢盘率', '走盘率', '输盘率'];
  if (market === 'overUnder') {
    labels.splice(0, labels.length, '大', '走', '小', '大球率', '走盘率', '小球率');
  }
  const headers = ['排名', '球队序号', '球队名', '场数', ...labels];
  if (showTrend) {
    headers.push('趋势（最远 → 最近）');
  }
  let min = 0;
  let max = 0;
  let matchCount = 0;
  if (showTrend) {
    for (const team of ranking) {
      matchCount = Math.max(matchCount, team.count);
      for (const point of team.points) {
        min = Math.min(min, point);
        max = Math.max(max, point);
      }
    }
  }
  const rows = ranking.map((team, index) => {
    const row = [
      [String(index + 1)], [String(team.teamId)], [team.teamName], [String(team.count)],
      [String(team.wins)], [String(team.pushes)], [String(team.losses)],
      [`${(team.winRate * 100).toFixed(2)}%`], [`${(team.pushRate * 100).toFixed(2)}%`],
      [`${(team.lossRate * 100).toFixed(2)}%`],
    ];
    if (showTrend) {
      row.push(renderTrend(team.points, min, max, matchCount));
    }
    return row;
  });
  const widths = headers.map((header, column) => {
    let width = displayWidth(header);
    for (const row of rows) {
      for (const line of row[column]) {
        width = Math.max(width, displayWidth(line));
      }
    }
    return width;
  });
  function border(left, middle, right) {
    return left + widths.map((width) => '─'.repeat(width + 2)).join(middle) + right;
  }
  function rowLine(cells) {
    return `│ ${cells.map((cell, column) => padCell(cell, widths[column])).join(' │ ')} │`;
  }
  const output = [border('┌', '┬', '┐'), rowLine(headers), border('├', '┼', '┤')];
  rows.forEach((row, rowIndex) => {
    const height = row[row.length - 1].length;
    for (let line = 0; line < height; line += 1) {
      output.push(rowLine(row.map((cell) => {
        if (line < cell.length) {
          return cell[line];
        }
        return '';
      })));
    }
    if (rowIndex < rows.length - 1) {
      output.push(border('├', '┼', '┤'));
    }
  });
  output.push(border('└', '┴', '┘'));
  return output.join('\n');
}

function printRanking(leagueSlug, options) {
  const league = config.cups[leagueSlug];
  if (!league || league.type !== 'league') {
    throw new Error('请通过 CUP_ANALYZER_CUP 指定已配置的联赛，不支持杯赛');
  }
  const dataPath = league.paths.cupScheduleData;
  if (!/^s\d+(?:_\d+)?\.js$/.test(path.basename(dataPath))) {
    throw new Error('仅支持 s 开头的联赛赛程文件');
  }
  if (!fs.existsSync(dataPath)) {
    throw new Error(`赛程文件不存在：${dataPath}`);
  }
  const context = { jh: {} };
  vm.runInNewContext(fs.readFileSync(dataPath, 'utf8'), context, { filename: dataPath, timeout: 1000 });
  const result = buildRanking(context, options);
  const venueNames = { all: '总', home: '主场', away: '客场' };
  let marketName = '亚盘盘路榜';
  if (options.market === 'overUnder') {
    marketName = '大小球盘路榜';
  }
  console.log(`${league.chineseName} 最近 ${options.round} 场${venueNames[options.venue]}${marketName}`);
  if (options.showTrend) {
    console.log('趋势：最远 → 最近，起点 0；累计得分每格 1 分，赢/大 +1，走 0，输/小 -1（半赢归赢，半输归输）');
  }
  if (result.ranking.length > 0) {
    console.log(renderTable(result.ranking, options.market, options.showTrend));
  } else {
    console.log('暂无符合条件的已结束比赛');
  }
  if (result.excludedTeams.length > 0) {
    console.log(`未参与排名（该范围无已结束比赛）：${result.excludedTeams.join('、')}`);
  }
  return result;
}

function runCli(market, venue) {
  try {
    const options = parseOptions(process.argv.slice(2));
    return printRanking(process.env.CUP_ANALYZER_CUP, { market, venue, ...options });
  } catch (error) {
    console.error('[近 N 场盘路榜]', error.message);
    process.exitCode = 1;
  }
}

module.exports = { parseRound, parseOptions, settle, buildRanking, displayWidth, renderTrend, renderTable, printRanking, runCli };
