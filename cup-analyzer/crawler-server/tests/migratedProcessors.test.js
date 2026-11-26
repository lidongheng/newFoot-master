const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const config = require('../config');
const { readLeagueSchedule } = require('../utils/squadLeagueSchedule');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(__dirname, '.migrated-processors-'));
  t.after(() => {
    delete config.cups.migrationFixture;
    assert.equal(path.dirname(path.resolve(root)), __dirname);
    fs.rmSync(root, { recursive: true, force: true });
  });
  const file = path.join(root, 's36.js');
  const row = (id, date, home, away, score, half, status = -1) => [id, 36, status, date, home, away, score, half, '', '', 0.25];
  const rounds = {
    R_1: [row(101, '2026-11-01 20:00', 1, 2, '3-1', '1-0')],
    R_2: [row(102, '2026-11-02 20:00', 2, 1, '2-2', '1-2')],
    R_3: [row(103, '2026-11-03 20:00', 1, 2, '0-0', '0-0')],
    R_4: [row(104, '2026-11-04 20:00', 1, 2, '', '', 0)],
    R_5: [row(105, '2026-11-05 20:00', 1, 2, '2-0', '1-0')],
  };
  fs.writeFileSync(file, `var arrLeague=[36,'测试联赛','','','2026-2027']; var arrTeam=[[1,'甲队','','A'],[2,'乙队','','B']]; var totalScore=[[0,1,1,0,4,2,2,0,7,3,4,0,0,0,0,0,8],[0,2,2,0,4,0,2,2,3,7,-4,0,0,0,0,0,2]]; Object.assign(jh,${JSON.stringify(rounds)});`);
  config.cups.migrationFixture = { type: 'league', cupSerial: '36', paths: { cupScheduleData: file, cupAnalyzer: root } };
  return { file, target: { leagueSlug: 'migrationFixture', leagueSerial: '36', season: '26-27', roundSerial: '4', matchSerial: '104' } };
}

function loadProcessor(name, target, args = []) {
  const file = path.resolve(__dirname, '../processors', name);
  const localRequire = createRequire(file);
  const logs = [];
  const context = {
    module: { exports: {} }, __dirname: path.dirname(file),
    process: { argv: ['node', file, ...args], exit: (code) => { throw new Error(`exit ${code}`); } },
    console: { log: (...parts) => logs.push(parts.join(' ')), warn: (...parts) => logs.push(parts.join(' ')), error: (...parts) => logs.push(parts.join(' ')) },
    require: (id) => {
      if (id === '../config/squadTarget') return target;
      return localRequire(id);
    },
  };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return { exports: context.module.exports, logs };
}

test('赛程定位校验赛事和赛季，排除非 R_* 数据并去重', (t) => {
  const f = fixture(t);
  const data = readLeagueSchedule(f.target);
  assert.equal(data.season, '2026-2027');
  assert.equal(data.shortSeason, '26-27');
  assert.throws(() => readLeagueSchedule({ ...f.target, season: '25-26' }), /赛季/);
  assert.throws(() => readLeagueSchedule({ ...f.target, leagueSerial: '31' }), /对应/);
  fs.appendFileSync(f.file, 'jh.S1=[[999,36,-1,"",1,2,"9-0"]]; jh.R_6=jh.R_1;');
  const unique = readLeagueSchedule(f.target);
  assert(!Object.hasOwn(unique.rounds, 'S1'));
  assert.equal(unique.rounds.R_6.length, 0);
  config.cups.migrationFixture.type = 'cup';
  assert.throws(() => readLeagueSchedule(f.target), /仅适用于联赛/);
});

test('下半场积分正确相减、按球队 ID 比较全场榜，不把当前轮次当完赛轮数', (t) => {
  const f = fixture(t);
  const processor = loadProcessor('secondHalfStandings.js', f.target);
  processor.exports.main();
  const output = processor.logs.join('\n');
  assert.match(output, /有效完赛样本 4 场/);
  assert.match(output, /下半场 vs 全场/);
  assert(!output.includes('NaN'));
  assert.match(output, /甲队/);
  fs.appendFileSync(f.file, 'jh.R_1[0][7]="4-0";');
  assert.throws(() => loadProcessor('secondHalfStandings.js', f.target).exports.main(), /小于半场/);
});

test('自定义轮次支持单轮/范围，拒绝非法输入，胜平负及主客战绩正确', (t) => {
  const f = fixture(t);
  const processor = loadProcessor('customRoundStandings.js', f.target, ['--rounds', '1-3']);
  assert.equal(processor.exports.parseRoundsArg([]), null);
  assert.equal(processor.exports.parseRoundsArg(['--rounds', '2']).start, 2);
  for (const args of [['--rounds'], ['--rounds', '0'], ['--rounds', '3-1'], ['--rounds', '2x'], ['--wrong', '2']]) {
    assert.throws(() => processor.exports.parseRoundsArg(args));
  }
  processor.exports.main();
  const output = processor.logs.join('\n');
  assert.match(output, /已完赛: 3 场/);
  assert.match(output, /1胜1平0负/);
  assert(!output.includes('NaN'));
});

test('历史同盘口只取目标开赛之前，盘路支持半赢/半输及走水，缺同季分档不套旧档', (t) => {
  const f = fixture(t);
  const processor = loadProcessor('historicalHandicapAnalysis.js', f.target);
  const settle = processor.exports.handicapResult;
  assert.equal(settle(1, 0, 0.75), '赢半');
  assert.equal(settle(0, 0, 0.25), '输半');
  assert.equal(settle(1, 0, 1), '走水');
  assert.throws(() => settle(1, 0, null), /缺失/);
  processor.exports.main();
  const output = processor.logs.join('\n');
  assert.match(output, /2026-11-01/);
  assert(!output.includes('2026-11-05'));
  assert.match(output, /跳过同档次分析/);
});

test('单场统计复用解析结果，默认 squadTarget ID，显式 ID 优先，无网络验证 10/5 场上限', async () => {
  const { main, formatStatistics } = require('../processors/matchStatisticsProcessor');
  const row = { date: '2026-11-01', league: '测试', homeTeam: '甲', score: '1-0', awayTeam: '乙', handicapDisplay: '0赢', totalDisplay: '2小' };
  const future = { dateLine: '2026-12-01', league: '测试', teams: '甲vs乙', interval: '7天' };
  const data = { pageHomeTeam: '甲', pageAwayTeam: '乙', headToHead: Array(12).fill(row), homeTeamMatches: [], awayTeamMatches: [], futureMatches: { home: Array(7).fill(future), away: [] }, injuries: { home: [{ player: '球员', reason: '存疑' }], away: [] } };
  const formatted = formatStatistics(data);
  assert.equal(formatted.split('\n').filter((line) => line.startsWith(row.date)).length, 10);
  assert.equal(formatted.split('\n').filter((line) => line.startsWith(future.dateLine)).length, 5);
  const ids = [];
  const fetcher = async (id) => { ids.push(id); return data; };
  await main([], { matchSerial: '101' }, fetcher);
  await main(['--matchSerial', '102'], { matchSerial: '101' }, fetcher);
  assert.deepEqual(ids, ['101', '102']);
  await assert.rejects(main([], {}, fetcher), /matchSerial/);
  await assert.rejects(main(['--matchSerial'], {}, fetcher), /参数格式/);
});

test('球队 --config 可与 --rounds 配合，单场统计只读取配置的本轮本队未开打比赛', async (t) => {
  const f = fixture(t);
  const { resolveProcessorTarget, validateUpcomingMatch } = require('../utils/processorTarget');
  const target = { ...f.target, season: '2026-2027', teamSerial: '1', teamChineseName: '甲队', teamEnglishName: 'A' };
  const file = path.join(path.dirname(f.file), 'teamAgent', 'A', 'config.js');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `module.exports = ${JSON.stringify(target)};`);
  const loaded = resolveProcessorTarget(['--config', file, '--rounds', '1-3'], {});
  assert.equal(loaded.target.matchSerial, '104');
  assert.deepEqual(loaded.args, ['--rounds', '1-3']);
  assert.doesNotThrow(() => validateUpcomingMatch(loaded.schedule, loaded.target, '104'));
  assert.throws(() => validateUpcomingMatch(loaded.schedule, loaded.target, '101'), /本轮本队/);
  assert.throws(() => validateUpcomingMatch(loaded.schedule, { ...loaded.target, roundSerial: '1' }, '101'), /已开打/);
  assert.throws(() => validateUpcomingMatch(loaded.schedule, { ...loaded.target, teamSerial: '999' }, '104'), /本轮本队/);
  assert.throws(() => resolveProcessorTarget(['--config'], {}), /--config/);
  const { main } = require('../processors/matchStatisticsProcessor');
  let fetchedId;
  const fetcher = async (id) => {
    fetchedId = id;
    return { pageHomeTeam: '甲', pageAwayTeam: '乙', headToHead: [], homeTeamMatches: [], awayTeamMatches: [], futureMatches: { home: [], away: [] }, injuries: { home: [], away: [] } };
  };
  await main(['--config', file], { matchSerial: '999' }, fetcher);
  assert.equal(fetchedId, '104');
  const half = loadProcessor('secondHalfStandings.js', {}, ['--config', file]);
  half.exports.main();
  assert(half.logs.some((line) => line.includes('测试联赛')));
  const custom = loadProcessor('customRoundStandings.js', {}, ['--config', file, '--rounds', '1-3']);
  custom.exports.main();
  assert(custom.logs.some((line) => line.includes('已完赛: 3 场')));
  const history = loadProcessor('historicalHandicapAnalysis.js', {}, ['--config', file]);
  history.exports.main();
  assert(history.logs.some((line) => line.includes('ID: 104')));
});
