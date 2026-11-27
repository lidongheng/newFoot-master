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
  assert.deepEqual(fs.readdirSync(path.join(directory, 'teams')).sort(), ['shots', 'shotsOnTarget', 'xG']);
  assert(!fs.existsSync(path.join(directory, 'players', 'xG')));
  for (const entity of ['teams', 'players']) {
    for (const name of fs.readdirSync(path.join(directory, entity))) {
      const metricDir = path.join(directory, entity, name);
      assert.deepEqual(fs.readdirSync(metricDir).sort(), [`${name}.html`, `${name}.json`, `${name}.md`]);
      const json = JSON.parse(fs.readFileSync(path.join(metricDir, `${name}.json`), 'utf8'));
      assert(Array.isArray(json));
      assert.equal(fs.readFileSync(path.join(metricDir, `${name}.md`), 'utf8'), markdown(json, Object.keys(json[0])));
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
