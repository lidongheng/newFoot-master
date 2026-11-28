'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs } = require('node:util');
const { cups } = require('../../crawler-server/config');
const { parseOptions } = require('./cli/options');
const { shortSeason } = require('./sources');
const { markdown, html } = require('./renderers');

function indexTeams(rows, source) {
  if (!Array.isArray(rows) || !rows.length) throw new Error(`${source} 必须为非空数组。`);
  const teams = new Map();
  for (const row of rows) {
    if (!row || typeof row['球队'] !== 'string' || !row['球队'].trim()) throw new Error(`${source} 缺少有效球队名称。`);
    if (teams.has(row['球队'])) throw new Error(`${source} 球队重复：${row['球队']}。`);
    teams.set(row['球队'], row);
  }
  return teams;
}

function parseReportOptions(args) {
  const { values } = parseArgs({ args, strict: true, allowPositionals: false, options: {
    league: { type: 'string' }, season: { type: 'string' }, round: { type: 'string' },
    from: { type: 'string' }, to: { type: 'string' }, stage: { type: 'string' },
  } });
  // 对外使用 --round，内部沿用现有 build 的 --rounds 和范围校验。
  const buildArgs = [];
  for (const [key, value] of Object.entries(values)) {
    let flag = key;
    if (key === 'round') flag = 'rounds';
    buildArgs.push('--' + flag, value);
  }
  const options = parseOptions(buildArgs);
  let scopeLabel = '统计范围及有效场次以源榜单为准';
  if (values.stage !== undefined) scopeLabel = `统计范围：杯赛阶段 ${values.stage}`;
  if (values.round !== undefined) scopeLabel = `统计范围：第 ${values.round} 轮`;
  if (values.from !== undefined) scopeLabel = `统计范围：北京时间 ${values.from} 至 ${values.to}（含起止日）`;
  return { options, buildArgs, scopeLabel };
}

function loadReportInputs(args, ids) {
  const { options, buildArgs, scopeLabel } = parseReportOptions(args);
  if (options.scope !== 'all-matches') {
    // 汇总 JSON 无逐场时间，范围筛选必须先由现有统计流程生成对应 JSON。
    const { main } = require('../bin/cli');
    main(['build', ...buildArgs, '--metrics', ids.join(',')]);
  }
  const league = cups[options.league];
  const season = shortSeason(options.season);
  const inputs = {};
  const source = path.join(league.paths.cupAnalyzer, 'leagueRanking', season, 'teams');
  for (const id of ids) {
    inputs[id] = JSON.parse(fs.readFileSync(path.join(source, id, id + '.json'), 'utf8'));
  }
  let description = `${league.chineseName}（${options.league}） · ${options.season}；数据来源：leagueRanking/${season}/teams 下的 ${ids.join('、')} JSON。指标直接引用源值；${scopeLabel}。`;
  if (league.type === 'cup') description += '杯赛积分为所选比赛按胜3平1负0计算的比较榜，不是官方分组积分榜或晋级榜，不合并两回合总比分。';
  return { inputs, description, destination: path.join(league.paths.cupAnalyzer, 'teamAgent') };
}

function writeStory(report, title, rows, columns, decimalColumns, note) {
  const { destination } = report;
  const sharedAssets = path.resolve(__dirname, '../../../shared-assets');
  for (const file of ['vue/vue.global.prod.js', 'element-plus/index.full.min.js', 'element-plus/index.css', 'element-plus/zh-cn.min.js', 'ranking-table/useRankingTable.js', 'ranking-table/main.js', 'ranking-table/table.css']) {
    if (!fs.existsSync(path.join(sharedAssets, file))) throw new Error(`缺少共享静态资源：${file}。请在仓库根目录运行 node scripts/syncTableAssets.js。`);
  }
  const description = report.description + note;
  const options = { decimalColumns, description };
  const assetsPrefix = path.relative(destination, sharedAssets).split(path.sep).join('/') + '/';
  // 校验和渲染完成后才覆盖报告；HTML 保留数值以支持数值排序。
  const md = `# ${title}\n\n${description}\n\n` + markdown(rows, columns, options);
  const page = html(title, rows, columns, assetsPrefix, options);
  const files = [path.join(destination, title + '.md'), path.join(destination, title + '.html')];
  fs.writeFileSync(files[0], md, 'utf8');
  fs.writeFileSync(files[1], page, 'utf8');
  return { files, teams: rows.length };
}

module.exports = { indexTeams, parseReportOptions, loadReportInputs, writeStory };
