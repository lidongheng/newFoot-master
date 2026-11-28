const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseOptions } = require('../src/cli/options');
const { loadContext, readMatches, hash, shortSeason } = require('../src/sources');
const { normalize } = require('../src/normalizers');
const { selectMatches, aggregate, buildReport } = require('../src/aggregators');
const { metricsFor } = require('../src/metrics');
const { html, markdown, tableRows, writeReport } = require('../src/renderers');
const { previewRepair, applyRepair } = require('../repairs/scripts/repairLineup');

test('球队两项转化率按同样本累计相除，支持范围筛选及一致的三格式输出', (t) => {
  const f = fixture(t);
  const dataset = readMatches(f.context, f.history);
  const first = dataset.matches.find((match) => match.id === '11').files['techStats.json'].fullMatch;
  const second = dataset.matches.find((match) => match.id === '12').files['techStats.json'].fullMatch;
  Object.assign(first['射门'], { home: 10, away: 3 });
  Object.assign(second['射门'], { home: 20, away: 5 });
  Object.assign(first['射正'], { home: 4, away: 1 });
  Object.assign(second['射正'], { home: 5, away: 2 });
  const normalized = normalize(f.context, dataset);
  const options = { ...f.options, metrics: ['shotConversionRate', 'shotOnTargetConversionRate'] };
  const build = (extra = {}) => buildReport(f.context, dataset, normalized, { ...options, ...extra });
  const report = build();
  const shots = report.teams.rankings.shotConversionRate.items.find((item) => item.id === '1');
  const targets = report.teams.rankings.shotOnTargetConversionRate.items.find((item) => item.id === '1');
  assert.equal(shots.value, 4 / 15 * 100);
  assert.equal(shots.goals, 4);
  assert.equal(shots.attempts, 15);
  assert.equal(targets.value, 4 / 6 * 100);
  assert.equal(report.players.rankings.shotConversionRate, undefined);
  assert.equal(build({ team: '1', roundRange: { start: 1, end: 1 } }).teams.rankings.shotConversionRate.items[0].value, 20);
  assert.equal(build({ team: '1', last: 1 }).teams.rankings.shotConversionRate.items[0].value, 40);
  assert.equal(build({ team: '1', from: '2026-09-08', to: '2026-09-08' }).teams.rankings.shotOnTargetConversionRate.items[0].value, 100);
  const directory = writeReport(f.context, report);
  for (const id of options.metrics) {
    const ranking = report.teams.rankings[id];
    const base = path.join(directory, 'teams', id, id);
    const rows = tableRows('teams', ranking);
    assert.deepEqual(JSON.parse(fs.readFileSync(base + '.json', 'utf8')), rows);
    const md = fs.readFileSync(base + '.md', 'utf8');
    assert.ok(md.includes('转化率＝同一批有效比赛'));
    assert.ok(md.includes(ranking.items[0].value.toFixed(2)));
    const page = fs.readFileSync(base + '.html', 'utf8');
    assert.deepEqual(JSON.parse(page.match(/<script id="ranking-data" type="application\/json">(.*?)<\/script>/s)[1]).rows, rows);
    assert.ok(page.includes('零分母或无有效样本'));
    assert.equal(fs.existsSync(path.join(directory, 'players', id)), false);
  }
});

test('射门和射正转化率分别排除缺失样本，同场进球随分母共同排除并列出缺项', (t) => {
  const f = fixture(t);
  const dataset = readMatches(f.context, f.history);
  delete dataset.matches.find((match) => match.id === '11').files['techStats.json'].fullMatch['射门'].home;
  delete dataset.matches.find((match) => match.id === '12').files['techStats.json'].fullMatch['射正'].away;
  const report = buildReport(f.context, dataset, normalize(f.context, dataset), { ...f.options, metrics: ['shotConversionRate', 'shotOnTargetConversionRate'] });
  const shots = report.teams.rankings.shotConversionRate.items.find((item) => item.id === '1');
  const targets = report.teams.rankings.shotOnTargetConversionRate.items.find((item) => item.id === '1');
  assert.deepEqual([shots.goals, shots.attempts, shots.validSamples, shots.missingSamples], [2, 2, 1, 1]);
  assert.deepEqual([targets.goals, targets.attempts, targets.validSamples, targets.missingSamples], [2, 2, 1, 1]);
  assert.ok(report.missingData.some((item) => item.metric === 'shotConversionRate' && item.matchId === '11' && item.field === 'SHOOT'));
  assert.ok(report.missingData.some((item) => item.metric === 'shotOnTargetConversionRate' && item.matchId === '12' && item.field === 'TARGET'));
});

test('转化率零分母不补0、不排名；真实零进球正常计0%，按未舍入数值排名', () => {
  const metric = metricsFor('teams', ['shotConversionRate']);
  const identities = ['1', '2', '3', '4', '5', '6'].map((id) => ({ id, name: id }));
  const counts = new Map(identities.map((team) => [team.id, 1]));
  const rows = [
    ['1', 0, 0], ['2', 0, 10], ['3', 1, 3], ['4', 2, 6], ['5', 1, 3.0001],
  ].map(([teamId, goals, shots]) => ({ teamId, metrics: { goals, shots } }));
  const ranking = aggregate('teams', rows, metric, identities, counts).rankings.shotConversionRate;
  assert.deepEqual(ranking.items.map((item) => [item.id, item.rank]), [['3', 1], ['4', 1], ['5', 3], ['2', 4], ['1', undefined], ['6', undefined]]);
  const rendered = tableRows('teams', ranking);
  assert.equal(rendered.find((row) => row['球队ID'] === '2')['射门转化率（%）'], 0);
  assert.equal(rendered.find((row) => row['球队ID'] === '1')['射门转化率（%）'], null);
  assert.equal(rendered.find((row) => row['球队ID'] === '1')['射门'], 0);
  assert.equal(rendered.find((row) => row['球队ID'] === '6')['射门'], null);
});

test('0射正按本队全场零值计场，少者优先，缺失不补零并支持范围筛选', (t) => {
  const f = fixture(t);
  const data = readMatches(f.context, f.history);
  const first = data.matches.find((match) => match.id === '11').files['techStats.json'].fullMatch['射正'];
  first.home = 0;
  const options = { ...f.options, metrics: ['zeroShotsOnTarget'] };
  const build = (extra = {}) => buildReport(f.context, data, normalize(f.context, data), { ...options, ...extra });
  let report = build();
  assert.deepEqual(report.teams.rankings.zeroShotsOnTarget.items.map((item) => [item.id, item.value, item.rank]), [['2', 0, 1], ['1', 1, 2]]);
  assert.equal(report.players.rankings.zeroShotsOnTarget, undefined);
  assert.equal(build({ team: '1', roundRange: { start: 1, end: 1 } }).teams.rankings.zeroShotsOnTarget.items[0].value, 1);
  assert.equal(build({ team: '1', last: 1 }).teams.rankings.zeroShotsOnTarget.items[0].value, 0);
  assert.equal(build({ team: '1', from: '2026-09-08', to: '2026-09-08' }).teams.rankings.zeroShotsOnTarget.items[0].value, 0);
  delete first.home;
  report = build();
  assert.deepEqual(report.teams.rankings.zeroShotsOnTarget.items.map((item) => item.rank), [1, 1]);
  const missing = report.teams.rankings.zeroShotsOnTarget.items.find((item) => item.id === '1');
  assert.equal(missing.value, 0);
  assert.equal(missing.validSamples, 1);
  assert.equal(missing.missingSamples, 1);
  const absent = build({ roundRange: { start: 1, end: 1 } }).teams.rankings.zeroShotsOnTarget.items[1];
  assert.equal(absent.value, undefined);
  assert.equal(absent.rank, undefined);
  const directory = writeReport(f.context, report);
  const base = path.join(directory, 'teams/zeroShotsOnTarget/zeroShotsOnTarget');
  assert(fs.readFileSync(base + '.md', 'utf8').includes('TARGET'));
  assert.deepEqual(JSON.parse(fs.readFileSync(base + '.json', 'utf8')), tableRows('teams', report.teams.rankings.zeroShotsOnTarget));
  assert(fs.readFileSync(base + '.html', 'utf8').includes('0射正'));
});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(__dirname, '.fixture-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), __dirname);
    fs.rmSync(root, { recursive: true, force: true });
  });
  const directory = path.join(root, 'laLiga');
  fs.mkdirSync(path.join(directory, 'data'), { recursive: true });
  const scheduleFile = path.join(directory, 'data', 's31.js');
  const rows = [
    [11, 31, -1, '2026-09-01 23:00', 1, 2, '2-1', '1-0'],
    [12, 31, -1, '2026-09-08 01:00', 2, 1, '1-2', '1-1'],
    [13, 31, -12, '2026-09-15 20:00', 1, 2, '腰斩', ''],
  ];
  fs.writeFileSync(scheduleFile, `var arrLeague=[31,'测试','','','2026-2027']; var arrTeam=[[1,'甲','','Alpha'],[2,'乙','','Beta']]; jh.R_1=[${JSON.stringify(rows[0])}]; jh.R_2=[${JSON.stringify(rows[1])}]; jh.R_3=[${JSON.stringify(rows[2])}];`);
  const registry = { laLiga: { type: 'league', cupSerial: '31', paths: { cupAnalyzer: directory, cupScheduleData: scheduleFile } } };
  const dirs = [];
  for (const [id, name, englishName] of [[1, '甲', 'Alpha'], [2, '乙', 'Beta']]) {
    const teamDir = path.join(directory, 'teamAgent', englishName);
    dirs.push(teamDir);
    fs.mkdirSync(teamDir, { recursive: true });
    fs.writeFileSync(path.join(teamDir, 'config.js'), `module.exports=${JSON.stringify({ leagueSlug: 'laLiga', leagueSerial: '31', season: '2026-2027', teamSerial: String(id), teamChineseName: name, teamEnglishName: englishName })};`);
    for (const row of rows.slice(0, 2)) {
      const matchDir = path.join(teamDir, 'basicData', '26-27', String(row[0]));
      fs.mkdirSync(matchDir, { recursive: true });
      const metric = (kind, home, away) => ({ kind, home, away });
      const tech = { matchId: row[0], fullMatch: { 射门: metric('SHOOT', 3, 2), 射正: metric('TARGET', 2, 1), xG: metric('EXPECTED_GOALS', 1.2, 0.7) }, firstHalf: { 射门: metric('SHOOT', 2, 1) }, secondHalf: { 射门: metric('SHOOT', 1, 1) } };
      const player = (teamId, name, shots, events) => ({ teamId, players: [{ playerId: teamId * 100, playerName: name, playerNum: teamId, stats: { Shots: String(shots), ShotOnTarget: '1', Steal: '2', Clearances: '3', PlayingTime: '90', PassSucceeRatio: '80%', Ranking: '8.5' }, events }] });
      const names = new Map([[1, '甲'], [2, '乙']]);
      const contents = {
        'matchInfo.json': { matchId: row[0], homeName: names.get(row[4]), awayName: names.get(row[5]), stateCode: -1 },
        'matchEvents.json': { matchId: row[0], events: [{ process: 'FullTime', score: { home: Number(row[6].split('-')[0]), away: Number(row[6].split('-')[1]) } }] },
        'techStats.json': tech,
        'playerStats.json': { matchId: row[0], home: player(row[4], `球员${row[4]}`, 3, [{ kind: 'Goal', happentTime: 10 }]), away: player(row[5], `球员${row[5]}`, 2, []) },
        'lineup.json': { matchId: row[0], homeName: names.get(row[4]), awayName: names.get(row[5]), homeFormation: '4-3-3', guestFormation: '4-4-2', homeStarting: [{ id: row[4] * 100, name: `球员${row[4]}`, number: String(row[4]) }], guestStarting: [{ id: row[5] * 100, name: `球员${row[5]}`, number: String(row[5]) }], homeSubs: [], guestSubs: [], homeInjury: [{ name: '保留伤停' }] },
        'goalProbability.json': { matchId: row[0], goalProbability: [] },
      };
      for (const [file, content] of Object.entries(contents)) fs.writeFileSync(path.join(matchDir, file), JSON.stringify(content));
    }
  }
  const options = parseOptions(['--league', 'laLiga', '--season', '2026-2027']);
  const context = loadContext(options, registry);
  const history = path.join(root, 'history');
  const fileFor = (team, id, name) => path.join(dirs[team], 'basicData', '26-27', String(id), name);
  const patch = (changes) => {
    const file = path.join(root, 'patch.json');
    fs.writeFileSync(file, JSON.stringify({ league: 'laLiga', season: '2026-2027', matchId: '11', kind: 'lineup', source: '测试用户提供资料，非真实比赛', changes }));
    return file;
  };
  return { root, directory, registry, context, options, history, fileFor, patch };
}

test('参数：三个范围互斥、日期真实有效、不隐含近6场、拒绝未知指标', () => {
  const base = ['--league', 'laLiga', '--season', '2026-2027'];
  assert.equal(parseOptions(base).scope, 'all-matches');
  assert.equal(parseOptions([...base, '--rounds', '2']).scope, 'rounds-2-2');
  assert.equal(parseOptions([...base, '--last', '6']).last, 6);
  for (const extra of [['--rounds', '3-1'], ['--last', '0'], ['--last', '6', '--rounds', '1-2'], ['--from', '2026-02-30', '--to', '2026-03-01'], ['--from', '2026-01-01'], ['--metrics', 'rating'], ['--unknown', '1']]) assert.throws(() => parseOptions([...base, ...extra]));
  assert.equal(shortSeason('2026'), '2026');
  assert.equal(parseOptions(['--league', 'epl', '--season', '2026-2027']).league, 'epl');
  assert.equal(parseOptions(['--league', 'koreanKLeague', '--season', '2026']).league, 'koreanKLeague');
  assert.throws(() => parseOptions(['--league', 'unknown', '--season', '2026']), /已登记/);
  assert.throws(() => parseOptions(['--league', 'championsLeague', '--season', '2026-2027']), /杯赛/);
});

test('双方副本只归并一次，球队球员不重复累计，原始文件哈希不变', (t) => {
  const f = fixture(t);
  const file = f.fileFor(0, 11, 'techStats.json');
  const before = hash(fs.readFileSync(file));
  const data = readMatches(f.context, f.history);
  assert.equal(data.matches.length, 2);
  const normalized = normalize(f.context, data);
  assert.equal(normalized.teamMatches.length, 4);
  assert.equal(normalized.playerMatches.length, 4);
  const report = buildReport(f.context, data, normalized, f.options);
  assert.equal(report.metadata.expectedMatches, 2);
  assert.equal(report.teams.rankings.shots.items.find((item) => item.id === '1').value, 5);
  assert.equal(report.players.rankings.shots.items.find((item) => item.id === '100').value, 5);
  assert.equal(hash(fs.readFileSync(file)), before);
  assert.equal(report.teams.rankings.xg.items.find((item) => item.id === '1').value, 1.9);
  assert(!report.players.metrics.some((metric) => ['xg', 'rating', 'PassSucceeRatio'].includes(metric.id)));
});

test('轮次、日期包含边界、单队、近N场按球队而非球员出场筛选', (t) => {
  const f = fixture(t);
  const data = readMatches(f.context, f.history);
  const normalized = normalize(f.context, data);
  const opts = { ...f.options, team: '1', last: 1, scope: 'last-1' };
  const report = buildReport(f.context, data, normalized, opts);
  assert.equal(report.teamMatches.length, 1);
  assert.equal(report.teamMatches[0].matchId, '12');
  assert.equal(report.playerMatches.length, 1);
  assert.equal(report.playerMatches[0].playerId, '100');
  const round = selectMatches(f.context, { ...f.options, roundRange: { start: 1, end: 1 } });
  assert.deepEqual([...round.get('1')], ['11']);
  const dates = selectMatches(f.context, { ...f.options, from: '2026-09-08', to: '2026-09-08' });
  assert.deepEqual([...dates.get('1')], ['12']);
  const insufficient = buildReport(f.context, data, normalized, { ...f.options, last: 6 });
  assert.equal(insufficient.metadata.expectedTeamRecords, 4);
});

test('球队实际进球减 xG 按差值降序排行，支持负数且缺少 xG 不补零', (t) => {
  const f = fixture(t);
  const data = readMatches(f.context, f.history);
  const first = data.matches.find((match) => match.id === '11');
  const xg = Object.values(first.files['techStats.json'].fullMatch).find((value) => value.kind === 'EXPECTED_GOALS');
  xg.home = 5;
  const normalized = normalize(f.context, data);
  const options = { ...f.options, metrics: ['goalsMinusXg'] };
  const report = buildReport(f.context, data, normalized, options);
  const ranking = report.teams.rankings.goalsMinusXg;
  assert.equal(ranking.items[0].id, '2');
  assert.equal(ranking.items[0].value, 0.1);
  assert.equal(ranking.items[1].id, '1');
  assert.equal(ranking.items[1].value, -1.7);
  assert.equal(ranking.items[1].goals, 4);
  assert.equal(ranking.items[1].xg, 5.7);
  const table = tableRows('teams', ranking);
  assert.deepEqual(Object.keys(table[0]), ['排名', '球队', '球队ID', '实际进球', '预期进球 xG', '实际进球 − xG', '有效场次', '缺失场次']);
  assert(!Object.hasOwn(report.players.rankings, 'goalsMinusXg'));
  delete xg.home;
  const missing = buildReport(f.context, data, normalize(f.context, data), options).teams.rankings.goalsMinusXg.items.find((item) => item.id === '1');
  assert.equal(missing.value, 1.3);
  assert.equal(missing.validSamples, 1);
  assert.equal(missing.missingSamples, 1);
  assert.equal(missing.goals, 2);
  assert.equal(missing.xg, 0.7);
});

test('副本统计冲突不擅自取值；副本 JSON 键顺序不同不构成冲突', (t) => {
  const f = fixture(t);
  const file = f.fileFor(1, 11, 'techStats.json');
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, JSON.stringify(Object.fromEntries(Object.entries(value).reverse())));
  assert.equal(readMatches(f.context, f.history).matches.length, 2);
  value.fullMatch.射门.home = 999;
  fs.writeFileSync(file, JSON.stringify(value));
  const data = readMatches(f.context, f.history);
  assert.equal(data.matches.length, 1);
  assert(data.quality.some((item) => item.code === 'copyConflict'));
});

test('缺值不补零，保留异常原值，空球员数据不使球队统计丢失', (t) => {
  const f = fixture(t);
  for (let team = 0; team < 2; team++) {
    const file = f.fileFor(team, 11, 'playerStats.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data.home.players[0].stats.Shots = '77';
    data.away.players[0].stats = {};
    fs.writeFileSync(file, JSON.stringify(data));
  }
  const data = readMatches(f.context, f.history);
  const normalized = normalize(f.context, data);
  assert(normalized.quality.some((item) => item.code === 'playerTeamMismatch' && item.playerSum === 77));
  assert(normalized.quality.some((item) => item.code === 'emptyPlayerStats'));
  const report = buildReport(f.context, data, normalized, f.options);
  assert.equal(report.teams.rankings.shots.items.find((item) => item.id === '1').value, 5);
  assert.equal(report.players.rankings.shots.items.find((item) => item.id === '100').value, 79);
  const player = report.players.rankings.shots.items.find((item) => item.id === '200');
  assert.equal(player.missingSamples, 1);
});

test('球员跨队以 ID 归并并保留 teamIds，单项并列不生成综合评分', () => {
  const rows = [{ playerId: '1', teamId: '10', name: '同一球员', metrics: { shots: 2 } }, { playerId: '1', teamId: '20', name: '同一球员', metrics: { shots: 3 } }, { playerId: '2', teamId: '20', name: '另一球员', metrics: { shots: 5 } }];
  const result = aggregate('players', rows, metricsFor('players', ['shots']), [], new Map());
  assert.equal(result.rankings.shots.items[0].value, 5);
  assert.equal(result.rankings.shots.items[0].rank, 1);
  assert.equal(result.rankings.shots.items[1].rank, 1);
  assert.deepEqual(result.rankings.shots.items[0].teamIds, ['10', '20']);
});

test('单项 MD/JSON/HTML 表格行一致，本地 Element Plus 资源无 CDN 且安全转义', (t) => {
  const f = fixture(t);
  const data = readMatches(f.context, f.history);
  const normalized = normalize(f.context, data);
  const report = buildReport(f.context, data, normalized, f.options);
  const rows = tableRows('teams', report.teams.rankings.shots);
  const md = markdown(rows, Object.keys(rows[0]));
  assert(md.includes('5'));
  assert(md.startsWith('| 排名 | 球队 | 球队ID | 射门 |'));
  assert(!md.includes('逐场明细'));
  const page = html('</script><img src=x>', rows, Object.keys(rows[0]), '../../../../shared-assets/');
  assert(page.includes('&lt;img src=x&gt;'));
  assert(page.includes('\\u003c/script>'));
  assert(page.includes('<el-table'));
  assert(page.includes('../../../../shared-assets/element-plus/index.full.min.js'));
  assert(!page.includes('fetch('));
  assert(!page.includes('https://'));
  assert.deepEqual(JSON.parse(page.match(/<script id="ranking-data" type="application\/json">([\s\S]*?)<\/script>/)[1]).rows, rows);
});

test('赛季目录只有 teams 和 players，单项目录严格只有同名 MD/HTML/JSON', (t) => {
  const f = fixture(t);
  const data = readMatches(f.context, f.history);
  const normalized = normalize(f.context, data);
  const report = buildReport(f.context, data, normalized, { ...f.options, metrics: ['shots', 'shotsOnTarget', 'xg'] });
  const directory = writeReport(f.context, report);
  assert.deepEqual(fs.readdirSync(directory).sort(), ['players', 'teams']);
  assert.deepEqual(fs.readdirSync(path.join(directory, 'teams')).sort(), ['README.md', 'shots', 'shotsOnTarget', 'xG']);
  assert(!fs.existsSync(path.join(directory, 'players', 'xG')));
  for (const entity of ['teams', 'players']) {
    for (const name of fs.readdirSync(path.join(directory, entity))) {
      const metricDir = path.join(directory, entity, name);
      if (!fs.statSync(metricDir).isDirectory()) continue;
      assert.deepEqual(fs.readdirSync(metricDir).sort(), [`${name}.html`, `${name}.json`, `${name}.md`]);
      const json = JSON.parse(fs.readFileSync(path.join(metricDir, `${name}.json`), 'utf8'));
      assert(Array.isArray(json));
      assert.equal(fs.readFileSync(path.join(metricDir, `${name}.md`), 'utf8'), markdown(json, Object.keys(json[0])) + '\n');
    }
  }
});

test('阵型修正预览只读、双方同步、保留伤停、备份和重复应用幂等', (t) => {
  const f = fixture(t);
  const patchFile = f.patch([{ field: 'homeFormation', beforeExists: true, before: '4-3-3', after: '4-2-3-1', mode: 'replace' }]);
  const original = fs.readFileSync(f.fileFor(0, 11, 'lineup.json'));
  const plan = previewRepair(patchFile, f.registry);
  assert.deepEqual(fs.readFileSync(f.fileFor(0, 11, 'lineup.json')), original);
  assert(!fs.existsSync(f.history));
  const result = applyRepair(plan, f.history);
  assert.equal(result.status, 'applied');
  assert(fs.existsSync(path.join(result.history, 'before-0.json')));
  for (let team = 0; team < 2; team++) {
    const data = JSON.parse(fs.readFileSync(f.fileFor(team, 11, 'lineup.json'), 'utf8'));
    assert.equal(data.homeFormation, '4-2-3-1');
    assert.deepEqual(data.homeInjury, [{ name: '保留伤停' }]);
  }
  assert.equal(applyRepair(previewRepair(patchFile, f.registry), f.history).status, 'unchanged');
  const loaded = readMatches(f.context, f.history);
  assert(loaded.matches.find((match) => match.id === '11').repairs[0].current);
});

test('修正拒绝旧值冲突、名单部分覆盖和重复首发替补；可唯一解析本地 ID', (t) => {
  const f = fixture(t);
  assert.throws(() => previewRepair(f.patch([{ field: 'homeFormation', beforeExists: true, before: '3-5-2', after: '4-4-2', mode: 'replace' }]), f.registry), /旧值冲突/);
  assert.throws(() => previewRepair(f.patch([{ field: 'homeSubs', beforeExists: true, before: [], after: [], mode: 'replace' }]), f.registry), /complete/);
  assert.throws(() => previewRepair(f.patch([{ field: 'homeSubs', beforeExists: true, before: [], after: [{ name: '球员1', number: '1' }], mode: 'append' }]), f.registry), /重复/);
  const plan = previewRepair(f.patch([{ field: 'homeSubs', beforeExists: true, before: [], after: [{ name: '用户提供新姓名', number: '9' }], mode: 'append' }]), f.registry);
  assert.equal(plan.targets[0].diff[0].after[0].id, undefined);
});

test('缺整个阵容文件时只创建提供字段和核验身份，不生成其他空字段', (t) => {
  const f = fixture(t);
  fs.unlinkSync(f.fileFor(0, 11, 'lineup.json'));
  fs.unlinkSync(f.fileFor(1, 11, 'lineup.json'));
  const patchFile = f.patch([{ field: 'homeFormation', beforeExists: false, after: '4-4-2', mode: 'replace' }]);
  applyRepair(previewRepair(patchFile, f.registry), f.history);
  const data = JSON.parse(fs.readFileSync(f.fileFor(0, 11, 'lineup.json'), 'utf8'));
  assert.deepEqual(Object.keys(data).sort(), ['awayName', 'homeFormation', 'homeName', 'matchId'].sort());
});

test('第二份写入失败恢复双方原文件并记录 rolledBack', (t) => {
  const f = fixture(t);
  const files = [f.fileFor(0, 11, 'lineup.json'), f.fileFor(1, 11, 'lineup.json')];
  const before = files.map((file) => fs.readFileSync(file));
  const plan = previewRepair(f.patch([{ field: 'homeFormation', beforeExists: true, before: '4-3-3', after: '4-4-2', mode: 'replace' }]), f.registry);
  let writes = 0;
  assert.throws(() => applyRepair(plan, f.history, (file, content) => {
    writes++;
    if (writes === 2) throw new Error('模拟磁盘失败');
    fs.writeFileSync(file, content);
  }), /rolledBack/);
  files.forEach((file, index) => assert.deepEqual(fs.readFileSync(file), before[index]));
  const record = JSON.parse(fs.readFileSync(path.join(f.history, fs.readdirSync(f.history)[0], 'record.json'), 'utf8'));
  assert.equal(record.status, 'rolledBack');
});

test('预览后文件变化时停止，不覆盖新内容', (t) => {
  const f = fixture(t);
  const plan = previewRepair(f.patch([{ field: 'homeFormation', beforeExists: true, before: '4-3-3', after: '4-4-2', mode: 'replace' }]), f.registry);
  fs.appendFileSync(f.fileFor(0, 11, 'lineup.json'), '\n');
  assert.throws(() => applyRepair(plan, f.history), /预览后文件已变化/);
});

test('名单部分追加唯一解析球员ID；同名同号码多个ID时停止待确认', (t) => {
  const f = fixture(t);
  const file = f.fileFor(0, 12, 'playerStats.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.away.players.push({ playerId: 101, playerName: '用户资料姓名', playerNum: 9, stats: {}, events: [] });
  fs.writeFileSync(file, JSON.stringify(data));
  const patchFile = f.patch([{ field: 'homeSubs', beforeExists: true, before: [], after: [{ name: '用户资料姓名', number: '9' }], mode: 'append' }]);
  const plan = previewRepair(patchFile, f.registry);
  assert.equal(plan.decisions[0].resolvedId, 101);
  applyRepair(plan, f.history);
  const lineup = JSON.parse(fs.readFileSync(f.fileFor(0, 11, 'lineup.json'), 'utf8'));
  assert.equal(lineup.homeStarting.length, 1);
  assert.equal(lineup.homeSubs[0].id, 101);
  data.away.players.push({ playerId: 102, playerName: '用户资料姓名', playerNum: 9, stats: {}, events: [] });
  fs.writeFileSync(file, JSON.stringify(data));
  assert.throws(() => previewRepair(patchFile, f.registry), /歧义/);
});

test('无数据的单项不生成value和rank；Goal与Penalty同刻不推断进球合计', (t) => {
  const f = fixture(t);
  const data = readMatches(f.context, f.history);
  data.matches[0].files['playerStats.json'].home.players[0].events = [{ kind: 'Goal', happentTime: 10 }, { kind: 'Penalty', happentTime: 10 }];
  const normalized = normalize(f.context, data);
  const player = normalized.playerMatches.find((row) => row.matchId === '11' && row.playerId === '100');
  assert.equal(player.metrics.goals, undefined);
  assert.equal(player.metrics.goalEvents, 1);
  assert.equal(player.metrics.penaltyGoals, 1);
  assert(normalized.quality.some((item) => item.code === 'ambiguousGoalEvents'));
  const missing = aggregate('players', [{ playerId: '1', teamId: '1', name: '没有射门字段', metrics: {} }], metricsFor('players', ['shots']), [], new Map()).rankings.shots.items[0];
  assert(!Object.hasOwn(missing, 'value'));
  assert(!Object.hasOwn(missing, 'rank'));
});

test('名单匹配错误或未知修正字段拒绝写入', (t) => {
  const f = fixture(t);
  assert.throws(() => previewRepair(f.patch([{ field: '../../techStats', beforeExists: false, after: {}, mode: 'replace' }]), f.registry), /字段/);
  const file = f.fileFor(0, 11, 'lineup.json');
  const original = JSON.parse(fs.readFileSync(file, 'utf8'));
  original.homeName = '其他球队';
  fs.writeFileSync(file, JSON.stringify(original));
  assert.throws(() => previewRepair(f.patch([{ field: 'homeFormation', beforeExists: true, before: '4-3-3', after: '4-4-2', mode: 'replace' }]), f.registry), /主客队/);
});

test('其他已登记联赛也能预览阵容修正，仍按各自赛程和球队配置核验', (t) => {
  const f = fixture(t);
  for (const name of ['Alpha', 'Beta']) {
    const file = path.join(f.directory, 'teamAgent', name, 'config.js');
    const value = require(file);
    fs.writeFileSync(file, `module.exports=${JSON.stringify({ ...value, leagueSlug: 'epl' })};`);
    delete require.cache[require.resolve(file)];
  }
  const patchFile = f.patch([{ field: 'homeFormation', beforeExists: true, before: '4-3-3', after: '4-4-2', mode: 'replace' }]);
  const patch = JSON.parse(fs.readFileSync(patchFile, 'utf8'));
  patch.league = 'epl';
  fs.writeFileSync(patchFile, JSON.stringify(patch));
  const plan = previewRepair(patchFile, { epl: f.registry.laLiga });
  assert.equal(plan.context.league, 'epl');
  assert.equal(plan.targets.length, 2);
  assert(!fs.existsSync(f.history));
});


test('积分榜独立于技术文件，主客拆分、并列规则和范围有效', (t) => {
  const f = fixture(t);
  fs.unlinkSync(f.fileFor(0, 11, 'techStats.json'));
  fs.unlinkSync(f.fileFor(1, 11, 'techStats.json'));
  const data = readMatches(f.context, f.history);
  const report = buildReport(f.context, data, normalize(f.context, data), f.options);
  const first = report.teams.rankings.standings.items[0];
  assert.equal(first.id, '1');
  assert.equal(first.points, 6);
  assert.equal(first.played, 2);
  assert.equal(first.goalsFor, 4);
  assert.equal(first.goalDifference, 2);
  assert.equal(report.teams.rankings.homeStandings.items.find((item) => item.id === '1').points, 3);
  assert.equal(report.teams.rankings.awayStandings.items.find((item) => item.id === '1').points, 3);
  const rows = tableRows('teams', report.teams.rankings.standings);
  assert.deepEqual(Object.keys(rows[0]), ['名次', '球队', '赛', '胜', '平', '负', '进', '失', '净', '积分']);
  const limited = buildReport(f.context, data, normalize(f.context, data), { ...f.options, last: 1 });
  assert.equal(limited.teams.rankings.standings.items[0].played, 1);
  f.context.matches.set('14', { id: '14', homeId: '2', awayId: '1', score: '3-3', status: -1, timestamp: 9999999999999, time: '2026-09-22 01:00', round: 4 });
  const draw = buildReport(f.context, data, normalize(f.context, data), f.options);
  assert.equal(draw.teams.rankings.standings.items[0].draws, 1);
  assert.equal(draw.teams.rankings.standings.items[0].points, 7);
});

test('半场积分榜独立读取赛程，主客取值及下半场比分相减正确并支持范围', (t) => {
  const f = fixture(t);
  const options = { ...f.options, metrics: ['firstHalfStandings', 'secondHalfStandings'] };
  const build = (extra = {}) => buildReport(f.context, { matches: [], inputs: [], quality: [] }, { teamMatches: [], playerMatches: [], quality: [] }, { ...options, ...extra });
  let report = build();
  const first = report.teams.rankings.firstHalfStandings.items[0];
  assert.equal(first.id, '1');
  assert.equal(first.points, 4);
  assert.equal(first.wins, 1);
  assert.equal(first.draws, 1);
  assert.equal(first.goalsFor, 2);
  assert.equal(first.goalsAgainst, 1);
  const second = report.teams.rankings.secondHalfStandings.items[0];
  assert.equal(second.id, '1');
  assert.equal(second.points, 4);
  assert.equal(second.goalsFor, 2);
  assert.equal(second.goalsAgainst, 1);
  assert.equal(report.players.rankings.firstHalfStandings, undefined);
  assert.equal(build({ team: '1', last: 1 }).teams.rankings.firstHalfStandings.items[0].points, 1);
  assert.equal(build({ team: '1', roundRange: { start: 1, end: 1 } }).teams.rankings.secondHalfStandings.items[0].points, 1);
  assert.equal(build({ team: '2', from: '2026-09-08', to: '2026-09-08' }).teams.rankings.secondHalfStandings.items[0].points, 0);
  // 全场主胜、上半场主队领先两球，但下半场是客队 1–0 获胜。
  f.context.matches.get('11').halfScore = '2-0';
  report = build({ roundRange: { start: 1, end: 1 } });
  assert.equal(report.teams.rankings.secondHalfStandings.items[0].id, '2');
  assert.equal(report.teams.rankings.secondHalfStandings.items[0].points, 3);
  const directory = writeReport(f.context, report);
  for (const id of options.metrics) {
    const base = path.join(directory, 'teams', id, id);
    const rows = tableRows('teams', report.teams.rankings[id]);
    assert.deepEqual(Object.keys(rows[0]), ['名次', '球队', '赛', '胜', '平', '负', '进', '失', '净', '积分']);
    assert.deepEqual(JSON.parse(fs.readFileSync(base + '.json', 'utf8')), rows);
    const embedded = JSON.parse(fs.readFileSync(base + '.html', 'utf8').match(/<script id="ranking-data" type="application\/json">(.*?)<\/script>/s)[1]);
    assert.deepEqual(embedded.rows, rows);
  }
});

test('半场缺失及大于全场时排除，不影响全场榜；无有效样本不补零不排名', (t) => {
  const f = fixture(t);
  const options = { ...f.options, metrics: ['standings', 'firstHalfStandings', 'secondHalfStandings'] };
  const build = () => buildReport(f.context, { matches: [], inputs: [], quality: [] }, { teamMatches: [], playerMatches: [], quality: [] }, options);
  for (const half of [undefined, '', '未知', '3-0', '-1-0']) {
    f.context.matches.get('11').halfScore = half;
    const report = build();
    for (const id of ['firstHalfStandings', 'secondHalfStandings']) {
      assert.equal(report.teams.rankings[id].items[0].played, 1);
      assert.equal(report.teams.rankings[id].missing.length, 2);
    }
    assert.equal(report.teams.rankings.standings.items[0].points, 6);
  }
  f.context.matches.get('12').halfScore = undefined;
  const report = build();
  for (const id of ['firstHalfStandings', 'secondHalfStandings']) {
    assert.equal(report.teams.rankings[id].items[0].played, 0);
    assert.equal(report.teams.rankings[id].items[0].points, null);
    assert.equal(report.teams.rankings[id].items[0].rank, undefined);
    assert.equal(tableRows('teams', report.teams.rankings[id])[0]['积分'], null);
  }
  const directory = writeReport(f.context, report);
  assert(fs.readFileSync(path.join(directory, 'teams/README.md'), 'utf8').includes('半场比分缺失'));
  const md = fs.readFileSync(path.join(directory, 'teams/firstHalfStandings/firstHalfStandings.md'), 'utf8');
  assert(md.includes('缺失'));
  assert(md.includes('halfScore'));
  f.context.matches.get('11').halfScore = '0-0';
  assert.equal(build().teams.rankings.firstHalfStandings.items[0].points, 1);
});

test('平均控球率按有效场次，不把缺失和副本冲突当0，补齐后提醒消失', (t) => {
  const f = fixture(t);
  for (const team of [0, 1]) {
    for (const id of [11, 12]) {
      const file = f.fileFor(team, id, 'techStats.json');
      const tech = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (id === 11) tech.fullMatch['控球率'] = { kind: 'CONTROL_PERCENT', home: 60, away: 40 };
      fs.writeFileSync(file, JSON.stringify(tech));
    }
  }
  const build = () => {
    const data = readMatches(f.context, f.history);
    return buildReport(f.context, data, normalize(f.context, data), { ...f.options, metrics: ['averagePossession'] });
  };
  let report = build();
  let item = report.teams.rankings.averagePossession.items.find((row) => row.id === '1');
  assert.equal(item.value, 60);
  assert.equal(item.validSamples, 1);
  assert.equal(item.missingSamples, 1);
  for (const team of [0, 1]) {
    const file = f.fileFor(team, 12, 'techStats.json');
    const tech = JSON.parse(fs.readFileSync(file, 'utf8'));
    tech.fullMatch['控球率'] = { kind: 'CONTROL_PERCENT', home: 0, away: 100 };
    fs.writeFileSync(file, JSON.stringify(tech));
  }
  report = build();
  item = report.teams.rankings.averagePossession.items.find((row) => row.id === '1');
  assert.equal(item.value, 80);
  assert.equal(report.missingData.length, 0);
  const file = f.fileFor(1, 12, 'techStats.json');
  const tech = JSON.parse(fs.readFileSync(file, 'utf8'));
  tech.fullMatch['控球率'].away = 99;
  fs.writeFileSync(file, JSON.stringify(tech));
  assert.equal(build().teams.rankings.averagePossession.items.find((row) => row.id === '1').missingSamples, 1);
});

test('画像指标共用出场最多25人、排除0出场、保留资料缺失和赛季冲突', (t) => {
  const f = fixture(t);
  const directory = path.join(f.directory, 'teamProfile', 'Alpha');
  fs.mkdirSync(directory, { recursive: true });
  const players = Array.from({ length: 27 }, (_, index) => ({ name: '球员' + index, number: index + 1, appearances: index, starts: index, age: 20 + index, height: 180, marketValue: 100 }));
  players[26].age = null;
  players[26].marketValue = null;
  players.push({ name: '未知出场', number: 99, age: 18, height: 180, marketValue: 100 });
  fs.writeFileSync(path.join(directory, 'Alpha.json'), JSON.stringify({ teamId: '1', season: '2026-2027', players }));
  const data = readMatches(f.context, f.history);
  const report = buildReport(f.context, data, normalize(f.context, data), { ...f.options, metrics: ['averageAge', 'averageHeight', 'totalMarketValue'] });
  const age = report.teams.rankings.averageAge.items.find((row) => row.id === '1');
  assert.equal(age.selectedPlayers, 25);
  assert.equal(age.validPlayers, 24);
  assert.equal(age.value, 33.5);
  assert.equal(age.incomplete, true);
  assert.equal(report.teams.rankings.totalMarketValue.items.find((row) => row.id === '1').value, 2400);
  assert(report.missingData.some((row) => row.field === 'appearances' && row.player === '未知出场'));
  assert(report.missingData.some((row) => row.teamId === '2' && row.file.endsWith('Beta.json')));
  const output = writeReport(f.context, report);
  assert(fs.readFileSync(path.join(output, 'teams', 'README.md'), 'utf8').includes('待补数据'));
  assert(fs.readFileSync(path.join(output, 'teams', 'averageAge', 'averageAge.md'), 'utf8').includes('未知出场'));
  assert(!fs.readFileSync(path.join(output, 'teams', 'averageAge', 'averageAge.html'), 'utf8').includes('未知出场'));
  assert(!fs.readFileSync(path.join(output, 'teams', 'averageAge', 'averageAge.html'), 'utf8').includes('ranking-missing'));
  assert(!fs.readFileSync(path.join(output, 'teams', 'averageAge', 'averageAge.html'), 'utf8').includes('数据状态'));
  assert(!fs.readFileSync(path.join(output, 'teams', 'averageAge', 'averageAge.json'), 'utf8').includes('数据状态'));
  assert(!fs.readFileSync(path.join(output, 'teams', 'averageAge', 'averageAge.md'), 'utf8').includes('数据状态'));
  assert(!fs.readFileSync(path.join(output, 'teams', 'averageAge', 'averageAge.json'), 'utf8').includes('无法判断'));
  assert(!fs.existsSync(path.join(output, 'teams', 'missingData.json')));
  const partial = buildReport(f.context, data, normalize(f.context, data), { ...f.options, metrics: ['shots'] });
  writeReport(f.context, partial);
  assert(fs.readFileSync(path.join(output, 'teams', 'README.md'), 'utf8').includes('未知出场'));
  assert(!fs.existsSync(path.join(output, 'teams', 'missingData.json')));
  fs.writeFileSync(path.join(directory, 'Alpha.json'), JSON.stringify({ teamId: '1', season: '2025-2026', players }));
  const invalid = buildReport(f.context, data, normalize(f.context, data), { ...f.options, metrics: ['averageAge'] });
  assert.equal(invalid.teams.rankings.averageAge.items.find((row) => row.id === '1').value, undefined);
});


test('积分并列依次比较净胜球、进球；无效比分标记且末尾提醒', (t) => {
  const f = fixture(t);
  const { buildTeamIndicators } = require('../src/aggregators/teamIndicators');
  const context = { ...f.context, teams: [...f.context.teams, { id: '3', name: '丙', englishName: 'Gamma' }, { id: '4', name: '丁', englishName: 'Delta' }] };
  const matches = [
    { id: 'a', homeId: '1', awayId: '4', score: '2-0', time: '2026-09-01' },
    { id: 'b', homeId: '2', awayId: '4', score: '3-1', time: '2026-09-01' },
    { id: 'c', homeId: '3', awayId: '4', score: '4-1', time: '2026-09-01' },
  ];
  context.matches = new Map(matches.map((match) => [match.id, match]));
  const selected = new Map(context.teams.map((team) => [team.id, new Set(matches.filter((match) => match.homeId === team.id || match.awayId === team.id).map((match) => match.id))]));
  const options = { metrics: ['standings'] };
  const result = buildTeamIndicators(context, selected, {}, options);
  assert.deepEqual(result.rankings.standings.items.map((item) => item.id), ['3', '2', '1', '4']);
  context.matches.get('c').score = '无效';
  const invalid = buildTeamIndicators(context, selected, {}, options);
  assert(invalid.missing.some((item) => item.field === 'score'));
  assert(invalid.rankings.standings.items.find((item) => item.id === '3').incomplete);
});


test('场均xG按有效场次计算、降序排名、支持范围和真实0，缺失提醒仅写MD', (t) => {
  const f = fixture(t);
  const options = parseOptions(['--league', 'laLiga', '--season', '2026-2027', '--metrics', 'averageXg']);
  const data = readMatches(f.context, f.history);
  const build = (extra = {}) => buildReport(f.context, data, normalize(f.context, data), { ...options, ...extra });
  let report = build();
  let rows = report.teams.rankings.averageXg.items;
  assert.equal(rows.find((item) => item.id === '1').value, 0.95);
  assert.equal(rows.find((item) => item.id === '1').validSamples, 2);
  assert.equal(report.players.rankings.averageXg, undefined);
  assert.equal(build({ roundRange: { start: 1, end: 1 } }).teams.rankings.averageXg.items.find((item) => item.id === '1').value, 1.2);
  assert.equal(build({ last: 1 }).teams.rankings.averageXg.items.find((item) => item.id === '1').value, 0.7);
  const first = data.matches.find((match) => match.id === '11');
  const field = Object.values(first.files['techStats.json'].fullMatch).find((item) => item.kind === 'EXPECTED_GOALS');
  field.home = 0;
  report = build();
  assert.equal(report.teams.rankings.averageXg.items[0].id, '2');
  assert.equal(report.teams.rankings.averageXg.items.find((item) => item.id === '1').value, 0.35);
  delete field.home;
  report = build();
  const missing = report.teams.rankings.averageXg.items.find((item) => item.id === '1');
  assert.equal(missing.value, 0.7);
  assert.equal(missing.validSamples, 1);
  assert.equal(missing.missingSamples, 1);
  const output = writeReport(f.context, report);
  const directory = path.join(output, 'teams', 'averageXg');
  const md = fs.readFileSync(path.join(directory, 'averageXg.md'), 'utf8');
  const htmlText = fs.readFileSync(path.join(directory, 'averageXg.html'), 'utf8');
  const jsonText = fs.readFileSync(path.join(directory, 'averageXg.json'), 'utf8');
  assert(md.includes('0.70'));
  assert(md.includes('## 待补数据'));
  assert(md.includes('EXPECTED_GOALS'));
  assert(!htmlText.includes('全场 xG 缺失'));
  assert(!jsonText.includes('reason'));
  assert(!jsonText.includes('数据状态'));
  assert(!fs.existsSync(path.join(output, 'teams', 'missingData.json')));
  for (const match of data.matches) {
    for (const item of Object.values(match.files['techStats.json'].fullMatch)) {
      if (item.kind === 'EXPECTED_GOALS') delete item.home;
    }
  }
  report = build({ roundRange: { start: 1, end: 1 } });
  const absent = report.teams.rankings.averageXg.items.find((item) => item.id === '1');
  assert.equal(absent.value, undefined);
  assert.equal(absent.rank, undefined);
});


test('射门三项按主客取值、独立累计与平均、支持单队和范围及指定排序', (t) => {
  const f = fixture(t);
  const data = readMatches(f.context, f.history);
  const first = data.matches.find((match) => match.id === '11').files['techStats.json'].fullMatch['射门'];
  first.home = 8;
  first.away = 4;
  const options = parseOptions(['--league', 'laLiga', '--season', '2026-2027', '--metrics', 'averageShots,shotsAgainst,averageShotsAgainst']);
  const build = (extra = {}) => buildReport(f.context, data, normalize(f.context, data), { ...options, ...extra });
  const report = build();
  assert.equal(data.matches.length, 2);
  assert.equal(report.teamMatches.length, 4);
  const own = report.teams.rankings.averageShots.items;
  assert.deepEqual(own.map((item) => [item.id, item.value]), [['1', 5], ['2', 3.5]]);
  const against = report.teams.rankings.shotsAgainst.items;
  assert.deepEqual(against.map((item) => [item.id, item.value]), [['1', 7], ['2', 10]]);
  assert.deepEqual(report.teams.rankings.averageShotsAgainst.items.map((item) => [item.id, item.value]), [['1', 3.5], ['2', 5]]);
  assert.equal(report.players.rankings.shotsAgainst, undefined);
  const single = build({ team: '1', roundRange: { start: 1, end: 1 } });
  assert.equal(single.teams.rankings.shotsAgainst.items.length, 1);
  assert.equal(single.teams.rankings.shotsAgainst.items[0].value, 4);
  assert.equal(single.teams.rankings.averageShots.items[0].value, 8);
  assert.equal(build({ team: '1', last: 1 }).teams.rankings.shotsAgainst.items[0].value, 3);
  assert.equal(build({ team: '1', from: '2026-09-08', to: '2026-09-08' }).teams.rankings.averageShots.items[0].value, 2);
});

test('射门单侧缺失互不影响、真实0计入分母、无样本末尾不排名，提醒仅在MD', (t) => {
  const f = fixture(t);
  const data = readMatches(f.context, f.history);
  const first = data.matches.find((match) => match.id === '11').files['techStats.json'].fullMatch['射门'];
  delete first.home;
  first.away = 0;
  const options = { ...f.options, metrics: ['averageShots', 'shotsAgainst', 'averageShotsAgainst'] };
  const build = (extra = {}) => buildReport(f.context, data, normalize(f.context, data), { ...options, ...extra });
  const report = build();
  const own = report.teams.rankings.averageShots.items.find((item) => item.id === '1');
  assert.equal(own.value, 2);
  assert.equal(own.validSamples, 1);
  assert.equal(own.missingSamples, 1);
  const against = report.teams.rankings.averageShotsAgainst.items.find((item) => item.id === '1');
  assert.equal(against.value, 1.5);
  assert.equal(against.validSamples, 2);
  assert.equal(against.missingSamples, 0);
  const opposite = report.teams.rankings.averageShotsAgainst.items.find((item) => item.id === '2');
  assert.equal(opposite.value, 2);
  assert.equal(opposite.validSamples, 1);
  assert.equal(opposite.missingSamples, 1);
  const selected = build({ roundRange: { start: 1, end: 1 } });
  const missing = selected.teams.rankings.averageShots.items[1];
  assert.equal(missing.id, '1');
  assert.equal(missing.value, undefined);
  assert.equal(missing.rank, undefined);
  assert.equal(selected.teams.rankings.shotsAgainst.items[0].value, 0);
  assert.equal(selected.teams.rankings.shotsAgainst.items[0].rank, 1);
  const directory = writeReport(f.context, report);
  for (const id of options.metrics) {
    const base = path.join(directory, 'teams', id, id);
    const md = fs.readFileSync(base + '.md', 'utf8');
    assert(md.includes('## 待补数据'));
    assert(md.includes('SHOOT'));
    const htmlText = fs.readFileSync(base + '.html', 'utf8');
    assert(!htmlText.includes('未纳入统计'));
    assert(!htmlText.includes('ranking-missing'));
    assert(!htmlText.includes('数据状态'));
    const json = fs.readFileSync(base + '.json', 'utf8');
    assert(!json.includes('reason'));
    assert(!json.includes('数据状态'));
  }
  assert(!fs.existsSync(path.join(directory, 'teams', 'missingData.json')));
});

test('射门平均值按未舍入值排序，同值并列；升序不改变其他指标的降序', () => {
  const rows = [
    { teamId: '1', metrics: { shots: 1, shotsAgainst: 1 } },
    { teamId: '1', metrics: { shots: 0, shotsAgainst: 0 } },
    { teamId: '1', metrics: { shots: 0, shotsAgainst: 0 } },
    { teamId: '2', metrics: { shots: 0.334, shotsAgainst: 0.334 } },
  ];
  const identities = [{ id: '1', name: '甲' }, { id: '2', name: '乙' }, { id: '3', name: '缺失' }];
  const samples = new Map([['1', 3], ['2', 1], ['3', 0]]);
  const definitions = metricsFor('teams', ['averageShots', 'averageShotsAgainst']);
  const result = aggregate('teams', rows, definitions, identities, samples);
  assert.deepEqual(result.rankings.averageShots.items.map((item) => item.id), ['2', '1', '3']);
  assert.deepEqual(result.rankings.averageShotsAgainst.items.map((item) => item.id), ['1', '2', '3']);
  assert.equal(result.rankings.averageShotsAgainst.items[2].rank, undefined);
  rows[3].metrics.shotsAgainst = 1 / 3;
  const equal = aggregate('teams', rows, definitions, identities, samples);
  assert.deepEqual(equal.rankings.averageShotsAgainst.items.slice(0, 2).map((item) => item.rank), [1, 1]);
});
