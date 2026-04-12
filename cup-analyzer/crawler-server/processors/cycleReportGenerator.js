/**
 * 亚盘周期盈亏 HTML 报告：默认水位 0.9，每场投注 1000 元，ECharts 折线（全部 / 主或客场 / 同赛事）。
 *
 * 用法：在 config/squadTarget.js 设置 matchSerial、roundSerial、season；可选 matchLeagueName 与同赛事筛选一致。
 *   npm run generate:cycle-report
 */

const fs = require('fs');
const path = require('path');

const config = require('../config');
const squadTarget = require('../config/squadTarget');
const { fetchMatchStatistics } = require('../analyzers/matchStatisticsAnalyzer');
const { ensureDir } = require('../utils/fileWriter');

const DEFAULT_WATER = 0.9;
const STAKE = 1000;
const ECHARTS_CDN = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';

/**
 * @param {object} match 单场（含 handicap、isHome、score）
 * @param {number} stake
 * @returns {number} 单场盈亏（元）
 */
function simulateBet(match, stake = STAKE) {
  const odds = DEFAULT_WATER;
  const hcRaw = parseFloat(match.handicap);
  if (Number.isNaN(hcRaw)) return 0;

  const parts = String(match.score || '').split('-');
  const homeGoals = parseInt(parts[0], 10) || 0;
  const awayGoals = parseInt(parts[1], 10) || 0;
  const diff = homeGoals - awayGoals - hcRaw;
  const teamDiff = match.isHome ? diff : -diff;

  if (teamDiff === 0) return 0;
  if (teamDiff > 0 && Math.abs(teamDiff) > 0.25) return stake * odds;
  if (teamDiff > 0 && Math.abs(teamDiff) <= 0.25) return (stake * odds) / 2;
  if (teamDiff < 0 && Math.abs(teamDiff) > 0.25) return -stake;
  if (teamDiff < 0 && Math.abs(teamDiff) <= 0.25) return -stake / 2;
  return 0;
}

function matchSortKey(m) {
  const d = m && m.date;
  const p = String(d || '').split(/[-/]/);
  if (p.length >= 3) {
    let y = parseInt(p[0], 10);
    if (y < 100) y += 2000;
    const mo = parseInt(p[1], 10) - 1;
    const day = parseInt(p[2], 10);
    return new Date(y, mo, day).getTime();
  }
  return 0;
}

function sortMatchesChronological(matches) {
  return [...matches].sort((a, b) => matchSortKey(a) - matchSortKey(b));
}

function hasValidHandicap(m) {
  return m && m.handicap != null && m.handicap !== '' && !Number.isNaN(parseFloat(m.handicap));
}

/**
 * @param {object[]} matches
 * @returns {object[]}
 */
function buildCumulativePoints(matches) {
  const sorted = sortMatchesChronological(matches.filter(hasValidHandicap));
  let cumulative = 0;
  const points = [];
  for (const m of sorted) {
    const profit = simulateBet(m);
    cumulative += profit;
    const xLabel = `${m.date || ''} ${m.opponent || ''}`.trim().slice(0, 28);
    points.push({
      date: m.date,
      league: m.league,
      opponent: m.opponent,
      score: m.score,
      handicap: m.handicap,
      profit: Math.round(profit * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      xLabel: xLabel || '—',
    });
  }
  return points;
}

function filterByVenue(matches, upcomingIsHome) {
  return matches.filter((m) => m.isHome === upcomingIsHome);
}

function filterSameCompetition(matches, leagueLabel) {
  if (!leagueLabel || !String(leagueLabel).trim()) return matches;
  const label = String(leagueLabel).trim();
  return matches.filter((m) => {
    const L = String(m.league || '');
    return L === label || L.includes(label);
  });
}

function sanitizeFilePart(name) {
  return String(name || 'team')
    .replace(/[/\\?*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .trim();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @returns {object} ECharts option
 */
function buildChartOption(points, titleText) {
  const xData = points.map((p) => p.xLabel);
  const yData = points.map((p) => p.cumulative);

  const lastIdx = yData.length - 1;
  const markPoint =
    lastIdx >= 0
      ? {
          data: [
            {
              name: '当前位置',
              coord: [lastIdx, yData[lastIdx]],
              value: yData[lastIdx],
            },
          ],
        }
      : undefined;

  return {
    title: {
      text: titleText,
      left: 'center',
      textStyle: { fontSize: 14 },
    },
    tooltip: {
      trigger: 'axis',
      formatter(params) {
        const p0 = Array.isArray(params) ? params[0] : params;
        const idx = p0.dataIndex;
        const pt = points[idx];
        if (!pt) return '';
        return [
          pt.xLabel,
          `联赛：${pt.league || ''}`,
          `比分：${pt.score || ''}`,
          `盘口：${pt.handicap}`,
          `单场盈亏：${pt.profit}`,
          `累计盈亏：${pt.cumulative}`,
        ].join('\n');
      },
    },
    grid: { left: 56, right: 24, top: 48, bottom: 72 },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: { rotate: 35, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: '累计盈亏(元)',
      splitLine: { show: true },
      axisLine: { onZero: true },
    },
    series: [
      {
        name: '累计盈亏',
        type: 'line',
        smooth: true,
        data: yData,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(82, 196, 26, 0.35)' },
              { offset: 0.5, color: 'rgba(200, 200, 200, 0.1)' },
              { offset: 1, color: 'rgba(245, 34, 45, 0.25)' },
            ],
          },
        },
        markLine: {
          symbol: 'none',
          data: [{ yAxis: 0, lineStyle: { color: '#999', type: 'dashed' } }],
          label: { formatter: '保本线' },
        },
        markPoint,
      },
    ],
  };
}

function renderHtmlPayload({
  matchSerial,
  season,
  roundSerial,
  pageHomeTeam,
  pageAwayTeam,
  homeBlocks,
  awayBlocks,
}) {
  const safe = escapeHtml;
  const chartConfigs = [];

  homeBlocks.forEach((b, i) => {
    chartConfigs.push({ id: `chart_home_${i}`, option: b.option });
  });
  awayBlocks.forEach((b, i) => {
    chartConfigs.push({ id: `chart_away_${i}`, option: b.option });
  });

  const chartDivsHome = homeBlocks
    .map(
      (b, i) => `
    <div class="chart-wrap">
      <div id="chart_home_${i}" class="chart"></div>
      <p class="hint">${safe(b.subtitle)}</p>
    </div>`
    )
    .join('\n');

  const chartDivsAway = awayBlocks
    .map(
      (b, i) => `
    <div class="chart-wrap">
      <div id="chart_away_${i}" class="chart"></div>
      <p class="hint">${safe(b.subtitle)}</p>
    </div>`
    )
    .join('\n');

  const optionsJson = JSON.stringify(chartConfigs.map((c) => ({ id: c.id, option: c.option })));

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>亚盘周期盈亏 — ${safe(pageHomeTeam)} vs ${safe(pageAwayTeam)}</title>
  <script src="${ECHARTS_CDN}"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0; padding: 16px 20px 40px; background: #f5f5f5; color: #222; }
    h1 { font-size: 1.25rem; margin: 0 0 8px; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 20px; }
    .section { background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .section h2 { margin: 0 0 12px; font-size: 1.05rem; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    .chart-wrap { margin-bottom: 24px; }
    .chart { width: 100%; height: 360px; }
    .hint { font-size: 12px; color: #888; margin: 6px 0 0; }
    .note { font-size: 13px; color: #555; line-height: 1.5; margin-top: 8px; }
  </style>
</head>
<body>
  <h1>霍华德·马克斯周期视角 · 亚盘模拟盈亏</h1>
  <div class="meta">
    场次序号 matchSerial：${safe(matchSerial)} ｜ 赛季 ${safe(season)} ｜ 第 ${safe(roundSerial)} 轮<br/>
    主队：${safe(pageHomeTeam)} ｜ 客队：${safe(pageAwayTeam)}<br/>
    模拟规则：每场投注 ${STAKE} 元、买己方盘、固定水位 ${DEFAULT_WATER}（港盘）、初盘盘口来自球探分析页。
  </div>

  <div class="section">
    <h2>${safe(pageHomeTeam)}（本场主场）</h2>
    <p class="note">「主或客场」图仅包含该队历史<strong>主场</strong>比赛，便于对照本场主场节奏。</p>
    ${chartDivsHome}
  </div>

  <div class="section">
    <h2>${safe(pageAwayTeam)}（本场客场）</h2>
    <p class="note">「主或客场」图仅包含该队历史<strong>客场</strong>比赛，便于对照本场客场节奏。</p>
    ${chartDivsAway}
  </div>

  <script>
    (function() {
      var configs = ${optionsJson};
      configs.forEach(function(item) {
        var el = document.getElementById(item.id);
        if (!el) return;
        var chart = echarts.init(el);
        chart.setOption(item.option);
        window.addEventListener('resize', function() { chart.resize(); });
      });
    })();
  </script>
</body>
</html>`;
}

function makeBlock(teamName, kindLabel, points, venueNote) {
  const n = points.length;
  const title = `${teamName} — ${kindLabel}（${n} 场）`;
  const option = buildChartOption(points, title);
  return {
    option,
    subtitle: `${kindLabel} · 共 ${n} 场。${venueNote || ''}`,
  };
}

async function main() {
  const matchSerial = squadTarget.matchSerial;
  if (!matchSerial) {
    console.error('请在 config/squadTarget.js 中设置 matchSerial');
    process.exit(1);
  }

  const leagueLabel =
    (squadTarget.matchLeagueName && String(squadTarget.matchLeagueName).trim()) ||
    config.chineseName ||
    '';

  console.log(`抓取分析页 matchSerial=${matchSerial} …`);
  const data = await fetchMatchStatistics(String(matchSerial));

  const pageHomeTeam = data.pageHomeTeam;
  const pageAwayTeam = data.pageAwayTeam;

  const homeMatches = data.homeTeamMatches || [];
  const awayMatches = data.awayTeamMatches || [];

  const homeAll = buildCumulativePoints(homeMatches);
  const homeVenue = buildCumulativePoints(filterByVenue(homeMatches, true));
  const homeSame = buildCumulativePoints(filterSameCompetition(homeMatches, leagueLabel));

  const awayAll = buildCumulativePoints(awayMatches);
  const awayVenue = buildCumulativePoints(filterByVenue(awayMatches, false));
  const awaySame = buildCumulativePoints(filterSameCompetition(awayMatches, leagueLabel));

  const homeBlocks = [
    makeBlock(pageHomeTeam, '全部近期', homeAll, ''),
    makeBlock(pageHomeTeam, '仅主场', homeVenue, ''),
    makeBlock(pageHomeTeam, `同赛事（${leagueLabel || '未配置'}）`, homeSame, ''),
  ];

  const awayBlocks = [
    makeBlock(pageAwayTeam, '全部近期', awayAll, ''),
    makeBlock(pageAwayTeam, '仅客场', awayVenue, ''),
    makeBlock(pageAwayTeam, `同赛事（${leagueLabel || '未配置'}）`, awaySame, ''),
  ];

  const outName = `${sanitizeFilePart(pageHomeTeam)}_vs_${sanitizeFilePart(pageAwayTeam)}_cycle.html`;
  const outDir = path.join(
    config.paths.cupAnalyzer,
    'report',
    squadTarget.season,
    `round-${squadTarget.roundSerial}`
  );
  const outPath = path.join(outDir, outName);

  ensureDir(outDir);
  const html = renderHtmlPayload({
    matchSerial: String(matchSerial),
    season: squadTarget.season,
    roundSerial: squadTarget.roundSerial,
    pageHomeTeam,
    pageAwayTeam,
    homeBlocks,
    awayBlocks,
  });

  fs.writeFileSync(outPath, html, 'utf-8');
  console.log(`已生成：${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
