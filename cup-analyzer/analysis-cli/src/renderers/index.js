const { STANDINGS, PROFILES } = require('../aggregators/teamIndicators');
const { missingMarkdown } = require('../../../crawler-server/utils/teamProfileData');
const fs = require('fs');
const path = require('path');

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function tableRows(entity, ranking) {
  if (STANDINGS.includes(ranking.metric.id)) {
    return ranking.items.map((item) => ({ '名次': item.rank, '球队': item.name, '赛': item.played, '胜': item.wins, '平': item.draws, '负': item.losses, '进': item.goalsFor, '失': item.goalsAgainst, '净': item.goalDifference, '积分': item.points }));
  }
  if (PROFILES.includes(ranking.metric.id)) {
    return ranking.items.map((item) => {
      let value = null;
      if (item.value !== undefined) value = Number(item.value.toFixed(2));
      let status = '完整';
      if (item.incomplete) status = '不完整';
      return { '排名': item.rank ?? null, '球队': item.name, '球队ID': item.id, [ranking.metric.label + '（' + ranking.metric.unit + '）']: value, '选取人数': item.selectedPlayers, '有效人数': item.validPlayers, '缺失人数': item.missingPlayers, '数据状态': status };
    });
  }
  return ranking.items.map((item) => {
    let rank = null;
    let value = null;
    if (item.rank !== undefined) rank = item.rank;
    if (item.value !== undefined) value = item.value;
    if (ranking.metric.id === 'averagePossession' && value !== null) value = Number(value.toFixed(2));
    let row;
    if (entity === 'teams') {
      row = { '排名': rank, '球队': item.name, '球队ID': item.id };
    } else {
      row = { '排名': rank, '球员': item.name, '球员ID': item.id, '球队ID': item.teamIds.join(',') };
    }
    if (entity === 'teams' && ranking.metric.id === 'goalsMinusXg') {
      row['实际进球'] = null;
      row['预期进球 xG'] = null;
      if (item.goals !== undefined) row['实际进球'] = item.goals;
      if (item.xg !== undefined) row['预期进球 xG'] = item.xg;
    }
    row[ranking.metric.label] = value;
    row['有效场次'] = item.validSamples;
    row['缺失场次'] = item.missingSamples;
    if (ranking.metric.id === 'averagePossession') {
      row['数据状态'] = '完整';
      if (item.missingSamples) row['数据状态'] = '不完整';
    }
    return row;
  });
}

function markdown(rows, columns) {
  const cell = (value, column) => {
    if (value === null) return '缺失';
    if (['平均年龄（岁）', '平均身高（cm）', '总身价（万）', '平均控球率'].includes(column) && typeof value === 'number') return value.toFixed(2);
    return String(value).replace(/\|/g, '\\|').replace(/[\r\n]/g, ' ');
  };
  const lines = [
    '| ' + columns.join(' | ') + ' |',
    '| ' + columns.map(() => '---').join(' | ') + ' |',
    ...rows.map((row) => '| ' + columns.map((column) => cell(row[column], column)).join(' | ') + ' |'),
  ];
  return lines.join('\n') + '\n';
}

function html(title, rows, columns, assetsPrefix, note = '') {
  // 内嵌与 MD/JSON 相同的表格数据，file:// 打开时也不需要请求 JSON。
  const data = JSON.stringify({ title, rows, columns }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${assetsPrefix}element-plus/index.css"><link rel="stylesheet" href="${assetsPrefix}ranking-table/table.css"></head>
<body><main id="app" class="ranking-page" v-cloak>
<header class="ranking-header"><h1>{{ title }}</h1><div class="ranking-tools"><el-input v-model="query" placeholder="搜索名称、ID 或表格内容" clearable aria-label="搜索排行榜"></el-input><el-text type="info">共 {{ total }} 条，当前显示 {{ filteredRows.length }} 条</el-text></div></header>
<el-table class="ranking-table" :data="filteredRows" stripe border height="calc(100vh - 230px)" style="width: 100%" empty-text="暂无数据">
<el-table-column v-for="column in columns" :key="column" :prop="column" :label="column" min-width="120" sortable show-overflow-tooltip>
<template #default="scope"><span>{{ formatCell(scope.row[column], column) }}</span></template>
</el-table-column></el-table><p class="ranking-note">点击表头可排序。缺失值保持缺失，不作为 0；排名采用原统计结果。</p><pre class="ranking-missing" style="white-space:pre-wrap">${escapeHtml(note)}</pre></main>
<script id="ranking-data" type="application/json">${data}</script>
<script src="${assetsPrefix}vue/vue.global.prod.js"></script><script src="${assetsPrefix}element-plus/index.full.min.js"></script><script src="${assetsPrefix}element-plus/zh-cn.min.js"></script>
<script src="${assetsPrefix}ranking-table/useRankingTable.js"></script><script src="${assetsPrefix}ranking-table/main.js"></script></body></html>\n`;
}

function metricName(id) {
  if (id === 'xg') return 'xG';
  return id;
}

function writeReport(context, report) {
  const directory = path.join(context.directory, 'leagueRanking', context.shortSeason);
  const sharedAssets = path.resolve(__dirname, '../../../../shared-assets');
  for (const file of ['vue/vue.global.prod.js', 'element-plus/index.full.min.js', 'element-plus/index.css', 'element-plus/zh-cn.min.js', 'ranking-table/useRankingTable.js', 'ranking-table/main.js', 'ranking-table/table.css']) {
    if (!fs.existsSync(path.join(sharedAssets, file))) throw new Error(`缺少共享静态资源 ${file}，请在 workspace 根目录运行 node scripts/syncTableAssets.js。`);
  }
  for (const entity of ['teams', 'players']) {
    fs.mkdirSync(path.join(directory, entity), { recursive: true });
    for (const ranking of Object.values(report[entity].rankings)) {
      const name = metricName(ranking.metric.id);
      const destination = path.join(directory, entity, name);
      fs.mkdirSync(destination, { recursive: true });
      const rows = tableRows(entity, ranking);
      let columns;
      if (entity === 'teams') {
        columns = ['排名', '球队', '球队ID'];
        if (ranking.metric.id === 'goalsMinusXg') columns.push('实际进球', '预期进球 xG');
        columns.push(ranking.metric.label, '有效场次', '缺失场次');
        if (ranking.metric.id === 'averagePossession') columns.push('数据状态');
      } else columns = ['排名', '球员', '球员ID', '球队ID', ranking.metric.label, '有效场次', '缺失场次'];
      if (STANDINGS.includes(ranking.metric.id) || PROFILES.includes(ranking.metric.id)) columns = Object.keys(rows[0]);
      let note = '';
      if (STANDINGS.includes(ranking.metric.id)) note = '比分计算榜：胜3分、平1分、负0分；按积分、净胜球、进球排序，不含纪律扣分。\n\n';
      if (ranking.missing) note += missingMarkdown(ranking.missing);
      // MD 与 JSON 使用同一批表格行，不加入逐场数据、报告元信息或其他指标。
      fs.writeFileSync(path.join(destination, name + '.md'), markdown(rows, columns) + '\n' + note, 'utf8');
      fs.writeFileSync(path.join(destination, name + '.json'), JSON.stringify(rows, null, 2) + '\n', 'utf8');
      const assetsPrefix = path.relative(destination, sharedAssets).split(path.sep).join('/') + '/';
      fs.writeFileSync(path.join(destination, name + '.html'), html(context.league + ' ' + context.season + ' · ' + entity + ' · ' + ranking.metric.label, rows, columns, assetsPrefix, note), 'utf8');
    }
  }
  const teamsRoot = path.join(directory, 'teams');
  const metricLinks = fs.readdirSync(teamsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory() && fs.existsSync(path.join(teamsRoot, entry.name, entry.name + '.md'))).map((entry) => {
    let label = entry.name;
    const ranking = Object.values(report.teams.rankings).find((item) => metricName(item.metric.id) === entry.name);
    if (ranking) label = ranking.metric.label;
    else {
      const { catalog } = require('../metrics');
      const definition = catalog.find((item) => item.entity === 'teams' && metricName(item.id) === entry.name);
      if (definition) label = definition.label;
    }
    return `| [${entry.name}](${entry.name}/${entry.name}.md) | ${label} |`;
  });
  const missingFile = path.join(teamsRoot, 'missingData.json');
  const updatedIds = new Set(Object.keys(report.teams.rankings));
  let missing = report.missingData || [];
  if (fs.existsSync(missingFile)) {
    const previous = JSON.parse(fs.readFileSync(missingFile, 'utf8'));
    missing = previous.filter((item) => !updatedIds.has(item.metric)).concat(missing);
  }
  fs.writeFileSync(path.join(teamsRoot, 'README.md'), '# 球队榜指标目录\n\n每项输出 MD、HTML、JSON。阵容指标为画像赛季快照；缺失不补零。\n\n| 指标目录 | 中文指标 |\n|---|---|\n' + metricLinks.join('\n') + '\n\n' + missingMarkdown(missing), 'utf8');
  fs.writeFileSync(missingFile, JSON.stringify(missing, null, 2) + '\n', 'utf8');
  return directory;
}

module.exports = { escapeHtml, tableRows, markdown, html, metricName, writeReport };
