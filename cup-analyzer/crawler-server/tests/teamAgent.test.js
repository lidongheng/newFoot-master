const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const config = require('../config');
const PostMatchDataCrawler = require('../crawlers/postMatchDataCrawler');
const { initializeAll, initializeLeague } = require('../processors/teamAgentInitializer');
const { collectTeamMatches, loadTeamTarget, seasonFolder } = require('../utils/teamAgent');
const { isCompleteMatch, collectTarget, main } = require('../processors/teamPostMatchDataProcessor');

function fixture(t, slug = 'fixture') {
  const root = fs.mkdtempSync(path.join(__dirname, '.team-agent-test-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), __dirname);
    fs.rmSync(root, { recursive: true, force: true });
  });
  const moduleRoot = path.join(root, slug);
  fs.mkdirSync(path.join(moduleRoot, 'data'), { recursive: true });
  const league = {
    type: 'league', cupSerial: '31', chineseName: '测试联赛',
    paths: { cupAnalyzer: moduleRoot, cupScheduleData: path.join(moduleRoot, 'data', 's31.js') },
  };
  const teams = [[84, '巴塞罗那', '', 'FC Barcelona'], [82, '皇家马德里', '', 'Real Madrid']];
  fs.writeFileSync(league.paths.cupScheduleData, `var arrLeague = [31, '', '', '', '2026-2027']; var arrTeam = ${JSON.stringify(teams)}; jh.R_1 = [[1,31,-1,'2026-01-01',84,82,'2-1']];`);
  return { root, slug, league, leagues: { [slug]: league } };
}

function writeMatch(directory, id) {
  fs.mkdirSync(directory, { recursive: true });
  const data = {
    'matchInfo.json': { matchId: id, stateCode: -1 },
    'matchEvents.json': { matchId: id, events: [{ process: 'FullTime', score: { home: 2, away: 1 } }] },
    'techStats.json': { matchId: id, fullMatch: { 射门: { home: 2, away: 1 } } },
  };
  for (const [name, value] of Object.entries(data)) {
    fs.writeFileSync(path.join(directory, name), JSON.stringify(value));
  }
}

test('初始化复用 Barcelona、保留原 workflow，重跑不覆盖文件或数据', (t) => {
  const f = fixture(t, 'laLiga');
  const barcelona = path.join(f.league.paths.cupAnalyzer, 'teamAgent', 'Barcelona');
  fs.mkdirSync(barcelona, { recursive: true });
  const original = '1、拿到本赛季赛后数据\r\n';
  fs.writeFileSync(path.join(barcelona, 'workflow.md'), original);
  assert.equal(initializeLeague(f.slug, f.league).teams, 2);
  assert(!fs.existsSync(path.join(path.dirname(barcelona), 'FC Barcelona')));
  const file = path.join(barcelona, 'config.js');
  assert.equal(require(file).teamSerial, '84');
  assert.equal(require(file).season, '2026-2027');
  const workflow = fs.readFileSync(path.join(barcelona, 'workflow.md'), 'utf8');
  assert(workflow.startsWith(original));
  assert(workflow.includes('--config "../laLiga/teamAgent/Barcelona/config.js"'));
  const snapshot = fs.readFileSync(file, 'utf8');
  const dataDir = path.join(barcelona, 'basicData', '26-27', '1');
  writeMatch(dataDir, 1);
  initializeLeague(f.slug, f.league);
  assert.equal(fs.readFileSync(file, 'utf8'), snapshot);
  assert.equal(fs.readFileSync(path.join(barcelona, 'workflow.md'), 'utf8'), workflow);
  assert(isCompleteMatch(dataDir, '1'));
  const loaded = loadTeamTarget(file, f.leagues);
  assert.equal(loaded.outputDir, path.join(barcelona, 'basicData', '26-27'));
});

test('已有配置与赛程冲突时报告且不覆盖', (t) => {
  const f = fixture(t);
  initializeLeague(f.slug, f.league);
  const file = path.join(f.league.paths.cupAnalyzer, 'teamAgent', 'FC Barcelona', 'config.js');
  const old = fs.readFileSync(file, 'utf8').replace('2026-2027', '2025-2026');
  fs.writeFileSync(file, old);
  delete require.cache[require.resolve(file)];
  const result = initializeLeague(f.slug, f.league);
  assert.equal(result.conflicts.length, 1);
  assert.equal(fs.readFileSync(file, 'utf8'), old);
  assert.throws(() => loadTeamTarget(file, f.leagues), /赛季/);
});

test('缺赛程和 HTML 赛程仅生成阻塞说明，国家队不初始化', (t) => {
  const f = fixture(t);
  fs.unlinkSync(f.league.paths.cupScheduleData);
  let result = initializeAll({ fixture: f.league, theWorldCup: f.league }, () => {});
  assert.deepEqual(result.blocked, ['fixture']);
  const root = path.join(f.league.paths.cupAnalyzer, 'teamAgent');
  assert.deepEqual(fs.readdirSync(root), ['README.md']);
  assert(fs.readFileSync(path.join(root, 'README.md'), 'utf8').includes('缺少赛程'));
  fs.writeFileSync(f.league.paths.cupScheduleData, '<!DOCTYPE html><html>错误</html>');
  result = initializeLeague('fixture', f.league);
  assert.match(result.blocked, /HTML/);
  assert.equal(result.teams, 0);
});

test('英文名 Windows 字符处理、大小写重名加 ID、高 ID 球队保留', (t) => {
  const f = fixture(t);
  fs.writeFileSync(f.league.paths.cupScheduleData, `var arrLeague = [31,'','','','2026']; var arrTeam = [[84,'甲','','Team/Name. '],[65873,'乙','','team:name']];`);
  assert.equal(initializeLeague(f.slug, f.league).teams, 2);
  const root = path.join(f.league.paths.cupAnalyzer, 'teamAgent');
  assert(fs.existsSync(path.join(root, 'Team_Name_84', 'config.js')));
  assert(fs.existsSync(path.join(root, 'team_name_65873', 'config.js')));
  assert.equal(seasonFolder('2026'), '2026');
});

test('联赛过滤主客队、未完赛及其他赛事结构，按比赛 ID 去重', () => {
  const home = [1, 31, -1, '', 84, 82, '2-1'];
  const away = [2, 31, -1, '', 82, 84, '1-1'];
  const schedule = { rounds: { R_1: [home, away, [3, 31, 1, '', 84, 82, '1-0'], [4, 31, -1, '', 82, 90, '1-0']], R_2: [home], G1: [[5, 31, -1, '', 84, 82, '1-0']] } };
  assert.deepEqual(collectTeamMatches(schedule, 'league', '84').map((row) => row[0]), [1, 2]);
});

test('杯赛支持普通列表和两回合，排除 S 积分榜且不把对阵当作比赛', (t) => {
  const f = fixture(t);
  f.league.type = 'cup';
  fs.writeFileSync(f.league.paths.cupScheduleData, `var arrCup = [31,'','','','','','','2026-2027']; var arrTeam = [[84,'甲','','A'],[82,'乙','','B']];`);
  assert.equal(initializeLeague(f.slug, f.league).teams, 2);
  const leg1 = [10, 31, -1, '', 84, 82, '2-0'];
  const leg2 = [11, 31, -1, '', 82, 84, '2-1'];
  const schedule = { rounds: { G1: [leg1], G2: [[84, 82, '2-0', '2-1', leg1, leg2]], S1: [[12, 31, -1, '', 84, 82, '9-0']] } };
  assert.deepEqual(collectTeamMatches(schedule, 'cup', '84').map((row) => row[0]), [10, 11]);
});

test('单队完整性判断排除错 ID、缺文件、缺终场、空统计和半成品', (t) => {
  const f = fixture(t);
  const directory = path.join(f.root, 'match');
  writeMatch(directory, 1);
  assert(isCompleteMatch(directory, 1));
  assert(!isCompleteMatch(directory, 2));
  fs.writeFileSync(path.join(directory, 'techStats.json'), '{');
  assert(!isCompleteMatch(directory, 1));
  writeMatch(directory, 1);
  fs.writeFileSync(path.join(directory, 'matchEvents.json'), JSON.stringify({ matchId: 1, events: [] }));
  assert(!isCompleteMatch(directory, 1));
  writeMatch(directory, 1);
  fs.writeFileSync(path.join(directory, 'techStats.json'), JSON.stringify({ matchId: 1, fullMatch: {} }));
  assert(!isCompleteMatch(directory, 1));
  fs.unlinkSync(path.join(directory, 'matchInfo.json'));
  assert(!isCompleteMatch(directory, 1));
});

test('完整数据跳过、不完整数据重采、请求串行间隔、失败继续且返回非零码', async (t) => {
  const f = fixture(t);
  initializeLeague(f.slug, f.league);
  const file = path.join(f.league.paths.cupAnalyzer, 'teamAgent', 'FC Barcelona', 'config.js');
  const loaded = loadTeamTarget(file, f.leagues);
  loaded.schedule.rounds.R_1 = [1, 2, 3, 4].map((id) => [id, 31, -1, '', 84, 82, '2-1']);
  writeMatch(path.join(loaded.outputDir, '1'), 1);
  fs.mkdirSync(path.join(loaded.outputDir, '2'), { recursive: true });
  fs.writeFileSync(path.join(loaded.outputDir, '2', 'matchEvents.json'), '{}');
  const requested = [];
  const delays = [];
  const crawler = { crawlSingleMatch: async (id, directory) => {
    requested.push(id);
    if (id === '3') throw new Error('测试失败');
    writeMatch(directory, id);
    return true;
  } };
  const result = await collectTarget(loaded, crawler, async (ms) => delays.push(ms), () => {});
  assert.deepEqual(result, { success: ['2', '4'], skipped: ['1'], failed: ['3'] });
  assert.deepEqual(requested, ['2', '3', '4']);
  assert.deepEqual(delays, [config.crawlDelayMs, config.crawlDelayMs]);
  config.cups.fixture = f.league;
  const previous = PostMatchDataCrawler.prototype.crawlSingleMatch;
  PostMatchDataCrawler.prototype.crawlSingleMatch = async function () {
    assert.equal(this.requestOptions.retry, 0);
    throw new Error('离线测试');
  };
  try {
    assert.equal(await main(['--config', file]), 0);
    fs.unlinkSync(path.join(loaded.outputDir, '1', 'techStats.json'));
    assert.equal(await main(['--config', file]), 1);
  } finally {
    delete config.cups.fixture;
    PostMatchDataCrawler.prototype.crawlSingleMatch = previous;
  }
});

test('复用采集器解析本地 HTML 并写到球队赛季比赛目录，不发送网络请求', async (t) => {
  const f = fixture(t);
  const crawler = new PostMatchDataCrawler();
  const data = {
    info: { id: 1, homeName: '甲', awayName: '乙', stateCode: -1 },
    events: { eventList: [{ process: 'FullTime', matchProcess: { homeScore: 2, guestScore: 1 } }] },
    techStat: { itemList: [{ name: '射门', home: { value: 2, text: '2' }, away: { value: 1, text: '1' } }] },
    jsq: { jsqList: [] },
  };
  crawler.fetchText = async (url) => {
    assert(url.includes('/1.htm'));
    return `<div id="afterPreInfo"><p>本地测试总结</p></div><script>var jsonData = ${JSON.stringify(data)};\n</script>`;
  };
  crawler.fetchPostMatchSummary = async () => { throw new Error('不应联网'); };
  const directory = path.join(f.root, 'teamAgent', 'A', 'basicData', '26-27', '1');
  assert(await crawler.crawlSingleMatch('1', directory));
  assert(isCompleteMatch(directory, 1));
  assert(fs.existsSync(path.join(directory, 'goalProbability.json')));
});

test('CLI 缺 --config 时非零退出，不发起网络请求', () => {
  const script = path.resolve(__dirname, '../processors/teamPostMatchDataProcessor.js');
  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--config/);
});

test('单队采集的页面和总结请求失败各只请求一次，不更改共享重试配置', async () => {
  const { service } = require('../utils/http');
  const originalAdapter = service.defaults.adapter;
  const originalDelay = service.defaults.retryDelay;
  let attempts = 0;
  service.defaults.adapter = async (request) => {
    attempts++;
    const error = new Error('测试连接失败');
    error.config = request;
    throw error;
  };
  service.defaults.retryDelay = 1;
  try {
    const crawler = new PostMatchDataCrawler();
    crawler.requestOptions = { retry: 0 };
    await assert.rejects(crawler.fetchText('https://example.test/match'), /测试连接失败/);
    assert.equal(attempts, 1);
    await assert.rejects(crawler.fetchJson('https://example.test/summary'), /测试连接失败/);
    assert.equal(attempts, 2);
    assert.equal(service.defaults.retry, 4);
    assert.deepEqual(new PostMatchDataCrawler().requestOptions, {});
  } finally {
    service.defaults.adapter = originalAdapter;
    service.defaults.retryDelay = originalDelay;
  }
});
