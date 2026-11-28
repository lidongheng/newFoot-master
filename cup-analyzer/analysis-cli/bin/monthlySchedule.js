#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs, isDeepStrictEqual } = require('node:util');
const { loadContext } = require('../src/sources');
const { parseReportOptions, writeStory } = require('../src/reportInputs');

const title = '球队未来一个月赛程';
const columns = ['类型', '日期时间', '赛事', '轮次或阶段', '对阵', '间隔', '等级', '备注'];
const hour = 60 * 60 * 1000;

function parseBeijingTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/.test(value)) throw new Error(`无效的北京时间：${value}`);
  const timestamp = Date.parse(value.replace(' ', 'T') + '+08:00');
  let canonical = value;
  if (value.length === 16) canonical += ':00';
  if (!Number.isFinite(timestamp) || new Date(timestamp + 8 * hour).toISOString().slice(0, 19).replace('T', ' ') !== canonical) throw new Error(`无效的北京时间：${value}`);
  return timestamp;
}

function formatTime(timestamp) {
  const time = new Date(timestamp + 8 * hour).toISOString();
  return `${Number(time.slice(5, 7))}月${Number(time.slice(8, 10))}日 ${time.slice(11, 16)}`;
}

function classifyInterval(hours) {
  if (!Number.isFinite(hours) || hours <= 0) throw new Error('比赛间隔必须大于0小时。');
  if (hours <= 66) return '危险';
  if (hours <= 92) return '警告';
  if (hours <= 120) return '良好';
  return '一周一赛';
}

function roundLabel(match) {
  const prefix = match.competitionName + ' ';
  if (match.matchTitle.startsWith(prefix) && match.matchTitle.slice(prefix.length).trim()) return match.matchTitle.slice(prefix.length).trim();
  if (match.gameweek.trim()) return `第${match.gameweek}轮`;
  throw new Error(`比赛${match.matchId}缺少轮次或阶段。`);
}

function buildRows(profile, teamId, season) {
  if (profile.teamId !== teamId || profile.season !== season) throw new Error('画像球队ID或赛季与目标不一致。');
  const schedule = profile.futureSchedule;
  if (!schedule) throw new Error('画像JSON缺少futureSchedule，请先用生成画像时的matchTime更新结构化赛程。');
  if (schedule.teamId !== teamId || schedule.source !== 'dongqiudi' || schedule.timezone !== 'Asia/Shanghai' || schedule.windowDays !== 30 ||
      typeof schedule.sourceTeamId !== 'string' || !schedule.sourceTeamId || !Array.isArray(schedule.matches)) throw new Error('画像未来赛程的球队、来源、时区或30天窗口结构无效。');
  // anchorTime由生成画像时的matchTime原值写入，不能读取当前全局配置替代各队的历史基准。
  const matchTime = schedule.anchorTime;
  const start = parseBeijingTime(matchTime);
  const end = start + 30 * 24 * hour;
  if (!Array.isArray(schedule.recentMatches) || schedule.recentMatches.length > 3 || !schedule.currentMatch) {
    throw new Error('画像赛程缺少最近3场或本场结构化数据，请重新生成球队赛程及画像。');
  }
  const unique = new Map();
  const records = [
    ...schedule.recentMatches.map((match) => ({ match, phase: '已完赛' })),
    { match: schedule.currentMatch, phase: '本场' },
    ...schedule.matches.map((match) => ({ match, phase: '未来' })),
  ];
  for (const { match, phase } of records) {
    if (!match || typeof match !== 'object' || Array.isArray(match)) throw new Error('未来赛程包含无效比赛对象。');
    for (const field of ['matchId', 'competitionName', 'homeTeamId', 'homeTeamName', 'awayTeamId', 'awayTeamName', 'status', 'venue']) {
      if (typeof match[field] !== 'string' || !match[field].trim()) throw new Error(`未来赛程比赛字段${field}缺失或无效。`);
    }
    for (const field of ['gameweek', 'matchTitle']) {
      if (typeof match[field] !== 'string') throw new Error(`比赛${match.matchId}的${field}必须为字符串。`);
    }
    const home = match.homeTeamId === schedule.sourceTeamId;
    const away = match.awayTeamId === schedule.sourceTeamId;
    if (home === away || (home && match.venue !== 'home') || (away && match.venue !== 'away')) throw new Error(`比赛${match.matchId}的目标球队或主客身份无效。`);
    const record = { ...match, phase };
    if (unique.has(match.matchId) && !isDeepStrictEqual(unique.get(match.matchId), record)) throw new Error(`比赛${match.matchId}重复且数据冲突。`);
    unique.set(match.matchId, record);
  }
  const matches = [];
  // 遍历全部比赛后按开球时间筛选；补赛和提前赛不能按轮次或输入顺序截断。
  for (const match of unique.values()) {
    const timestamp = parseBeijingTime(match.startTime);
    if (match.phase === '已完赛') {
      if (match.status.toLowerCase() !== 'played' || timestamp >= start) throw new Error(`比赛${match.matchId}不是本场之前的已完赛比赛。`);
    } else if (match.phase === '本场') {
      if (timestamp !== start) throw new Error('本场开球时间与matchTime不一致。');
    } else {
      if (!['fixture', 'uncertain'].includes(match.status.toLowerCase())) throw new Error(`比赛${match.matchId}不是未赛状态，需更新画像赛程。`);
      if (timestamp <= start || timestamp > end) continue;
    }
    matches.push({ ...match, timestamp, round: roundLabel(match) });
  }
  matches.sort((a, b) => a.timestamp - b.timestamp || a.matchId.localeCompare(b.matchId, 'en', { numeric: true }));
  const rows = [];
  const times = [];
  let currentInterval = '无上一场已完赛数据，无法计算';
  for (const match of matches) {
    let interval = '';
    let level = '';
    if (times.length) {
      const hours = (match.timestamp - times[times.length - 1]) / hour;
      level = classifyInterval(hours);
      interval = `${Number(hours.toFixed(2))}小时`;
    }
    if (match.phase === '本场' && times.length) currentInterval = interval;
    times.push(match.timestamp);
    let note = '';
    // 连续三场滑动检查，基准比赛也计入；同一窗口只标更紧密的一档。
    if (times.length >= 3) {
      const first = times[times.length - 3];
      const span = (match.timestamp - first) / hour;
      let congestion = '';
      if (span <= 144) congestion = '6天3场';
      else if (span <= 168) congestion = '7天3场';
      if (congestion) note = `${congestion}（${formatTime(first)}至${formatTime(match.timestamp)}）`;
    }
    if (match.phase === '本场') note = `本场距上一场：${currentInterval}。${note}`;
    rows.push({ '类型': match.phase, '日期时间': formatTime(match.timestamp), '赛事': match.competitionName, '轮次或阶段': match.round,
      '对阵': `${match.homeTeamName}vs${match.awayTeamName}`, '间隔': interval, '等级': level, '备注': note });
  }
  return { rows, matchTime, currentInterval, endTime: new Date(end + 8 * hour).toISOString().slice(0, 19).replace('T', ' ') };
}

function generateReports(context) {
  const results = [];
  for (const team of context.teams) {
    let file;
    try {
      const destination = context.directories.get(team.id);
      if (!destination) throw new Error('缺少有效球队配置目录。');
      const directory = path.basename(destination);
      file = path.join(context.directory, 'teamProfile', directory, directory + '.json');
      const profile = JSON.parse(fs.readFileSync(file, 'utf8'));
      const report = buildRows(profile, team.id, context.season);
      const source = path.relative(destination, file).split(path.sep).join('/');
      const description = `${team.name} · ${context.league} · ${context.season}；来源：${source}。基准比赛时间（matchTime）：${report.matchTime}；截止时间：${report.endTime}，均为北京时间。本场距上一场：${report.currentInterval}。展示最近3场已完赛、本场及之后30天内（含截止时刻）的全部赛事，共${report.rows.length}场。`;
      const note = '按开球时间排序，间隔为距上一场开球的小时数；最早一场无上一场记录，间隔和等级留空。危险：≤66小时；警告：>66且≤92小时；良好：>92且≤120小时；一周一赛：>120小时。小时数最多显示两位小数。连续三场首尾≤144小时标6天3场，>144且≤168小时标7天3场，备注写在第三场，重叠窗口分别保留。';
      const output = writeStory({ destination, description }, title, report.rows, columns, [], note);
      results.push({ teamId: team.id, team: team.name, status: 'generated', matches: report.rows.length, matchTime: report.matchTime, source: file, files: output.files });
    } catch (error) {
      // 逐队隔离数据缺项，不覆盖失败球队的旧报告，也不生成空报告冒充无赛程。
      results.push({ teamId: team.id, team: team.name, status: 'blocked', source: file, reason: error.message });
    }
  }
  const generated = results.filter((result) => result.status === 'generated').length;
  let status = 'partial';
  if (generated === results.length) status = 'generated';
  if (generated === 0) status = 'blocked';
  return { league: context.league, season: context.season, status, teams: results.length, generated, blocked: results.length - generated, files: generated * 2, results };
}

function main(args) {
  // 第六步仅支持固定30天窗口，不接受其他步骤的轮次或日期筛选参数。
  parseArgs({ args, strict: true, allowPositionals: false, options: { league: { type: 'string' }, season: { type: 'string' } } });
  const { options } = parseReportOptions(args);
  return generateReports(loadContext(options));
}

if (require.main === module) {
  try {
    const result = main(process.argv.slice(2));
    console.log(JSON.stringify(result, null, 2));
    if (result.blocked) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { title, columns, parseBeijingTime, classifyInterval, buildRows, generateReports, main };
