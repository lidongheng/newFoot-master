'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { title, columns, parseBeijingTime, classifyInterval, buildRows, generateReports, main } = require('../bin/monthlySchedule');
const { markdown } = require('../src/renderers');

const hour = 3600000;

function profile(offsets, matchTime = '2026-11-29 23:15:00') {
  const start = parseBeijingTime(matchTime);
  return { teamId: '84', season: '2026-2027', futureSchedule: {
    teamId: '84', source: 'dongqiudi', sourceTeamId: '500', timezone: 'Asia/Shanghai', windowDays: 30, anchorTime: matchTime,
    matches: offsets.map((offset, index) => ({ matchId: String(index + 1), competitionId: '7', competitionName: '西甲', gameweek: '23', matchTitle: '西甲 第23轮',
      homeTeamId: '500', homeTeamName: '巴塞罗那', awayTeamId: '600', awayTeamName: '马德里竞技', opponentId: '600', opponentName: '马德里竞技', venue: 'home',
      startTime: new Date(start + offset * hour + 8 * hour).toISOString().slice(0, 19).replace('T', ' '), status: 'fixture' })),
  } };
}

test('危险、警告、良好及一周一赛按实际小时边界分类', () => {
  for (const [hours, level] of [[0.1, '危险'], [66, '危险'], [66.001, '警告'], [92, '警告'], [92.001, '良好'], [120, '良好'], [120.001, '一周一赛']]) {
    assert.equal(classifyInterval(hours), level);
  }
  for (const hours of [0, -1, NaN, Infinity]) assert.throws(() => classifyInterval(hours));
});

test('以画像matchTime为基准，跨赛事按时间排序；首场及后续间隔独立计算', () => {
  const input = profile([77.25, 148.75, 220.75]);
  input.futureSchedule.matches[2].competitionName = '欧冠';
  input.futureSchedule.matches[2].matchTitle = '欧冠 联赛阶段';
  input.futureSchedule.matches[2].gameweek = '';
  input.futureSchedule.matches[2].homeTeamId = '700';
  input.futureSchedule.matches[2].homeTeamName = '曼城';
  input.futureSchedule.matches[2].awayTeamId = '500';
  input.futureSchedule.matches[2].awayTeamName = '巴塞罗那';
  input.futureSchedule.matches[2].venue = 'away';
  input.futureSchedule.matches.reverse();
  const before = JSON.stringify(input);
  const result = buildRows(input, '84', '2026-2027');
  assert.deepEqual(result.rows[0], { '日期时间': '12月3日 04:30', '赛事': '西甲', '轮次或阶段': '第23轮', '对阵': '巴塞罗那vs马德里竞技', '间隔': '77.25小时', '等级': '警告', '备注': '' });
  assert.equal(result.rows[1]['间隔'], '71.5小时');
  assert.match(result.rows[1]['备注'], /^7天3场/);
  assert.equal(result.rows[2]['赛事'], '欧冠');
  assert.equal(result.rows[2]['轮次或阶段'], '联赛阶段');
  assert.equal(result.rows[2]['对阵'], '曼城vs巴塞罗那');
  assert.match(result.rows[2]['备注'], /^6天3场/);
  assert.equal(JSON.stringify(input), before);
});

test('密集赛程采用144及168小时边界，包含基准比赛并保留重叠窗口', () => {
  for (const [offsets, expected] of [[[72, 144], '6天3场'], [[72, 144.01], '7天3场'], [[84, 168], '7天3场'], [[84, 168.01], '']]) {
    const row = buildRows(profile(offsets), '84', '2026-2027').rows[1];
    assert.equal(row['备注'].startsWith(expected), true);
    if (!expected) assert.equal(row['备注'], '');
  }
  const rows = buildRows(profile([72, 144, 216]), '84', '2026-2027').rows;
  assert.equal(rows[0]['备注'], '');
  assert.match(rows[1]['备注'], /^6天3场/);
  assert.match(rows[2]['备注'], /^6天3场/);
});

test('固定30天窗口不含基准时刻，包含截止时刻；跨年、空赛程与去重', () => {
  const input = profile([-1, 0, 24, 720, 721], '2026-12-15 04:00:00');
  input.futureSchedule.matches.push({ ...input.futureSchedule.matches[2] });
  const result = buildRows(input, '84', '2026-2027');
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0]['日期时间'], '12月16日 04:00');
  assert.equal(result.rows[1]['日期时间'], '1月14日 04:00');
  assert.equal(result.endTime, '2027-01-14 04:00:00');
  assert.deepEqual(buildRows(profile([]), '84', '2026-2027').rows, []);
  input.futureSchedule.matches.at(-1).competitionName = '另一赛事';
  assert.throws(() => buildRows(input, '84', '2026-2027'), /冲突/);
});

test('缺失结构化赛程、错误身份或赛季、非法时间不使用兜底值', () => {
  assert.throws(() => buildRows({ teamId: '84', season: '2026-2027' }, '84', '2026-2027'), /缺少futureSchedule/);
  assert.throws(() => buildRows(profile([]), '85', '2026-2027'), /球队ID或赛季/);
  assert.throws(() => buildRows(profile([]), '84', '2025-2026'), /球队ID或赛季/);
  for (const time of ['2026-02-30 04:00:00', '2026-11-29 25:00:00', '', null]) assert.throws(() => parseBeijingTime(time));
  for (const field of ['anchorTime', 'sourceTeamId', 'matches']) {
    const input = profile([24]);
    delete input.futureSchedule[field];
    assert.throws(() => buildRows(input, '84', '2026-2027'));
  }
  const input = profile([24]);
  input.futureSchedule.matches[0].homeTeamId = '999';
  assert.throws(() => buildRows(input, '84', '2026-2027'), /主客身份/);
  assert.throws(() => main(['--league', 'laLiga', '--season', '2026-2027', '--round', '1']), /Unknown option/);
});

test('逐队隔离缺项；有效空赛程生成，失败不覆盖旧报告；MD和HTML一致且源JSON不变', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'monthly-schedule-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    fs.rmSync(root, { recursive: true });
  });
  const teams = ['有效', '空赛程', '缺少字段', '缺少文件'].map((name, index) => ({ id: String(84 + index), name, directory: 'Team' + index }));
  const sources = [];
  for (const [index, team] of teams.entries()) {
    const destination = path.join(root, 'teamAgent', team.directory);
    const source = path.join(root, 'teamProfile', team.directory, team.directory + '.json');
    fs.mkdirSync(destination, { recursive: true });
    fs.mkdirSync(path.dirname(source), { recursive: true });
    if (index < 3) {
      const data = profile(index === 0 ? [77.25, 148.75] : []);
      data.teamId = team.id;
      data.futureSchedule.teamId = team.id;
      if (index === 2) delete data.futureSchedule;
      fs.writeFileSync(source, JSON.stringify(data));
      sources.push({ file: source, content: fs.readFileSync(source, 'utf8') });
    }
    if (index === 2) fs.writeFileSync(path.join(destination, title + '.md'), '旧报告');
  }
  const result = generateReports({ league: 'laLiga', season: '2026-2027', directory: root, teams,
    directories: new Map(teams.map((team) => [team.id, path.join(root, 'teamAgent', team.directory)])) });
  assert.deepEqual(result.results.map((item) => item.status), ['generated', 'generated', 'blocked', 'blocked']);
  assert.equal(result.status, 'partial');
  assert.equal(result.files, 4);
  for (const team of teams.slice(0, 2)) {
    const destination = path.join(root, 'teamAgent', team.directory);
    const md = fs.readFileSync(path.join(destination, title + '.md'), 'utf8');
    const page = fs.readFileSync(path.join(destination, title + '.html'), 'utf8');
    const payload = JSON.parse(page.match(/<script id="ranking-data" type="application\/json">(.*?)<\/script>/s)[1]);
    assert.deepEqual(payload.columns, columns);
    assert.ok(md.endsWith(markdown(payload.rows, columns, { decimalColumns: [] })));
    assert.match(md, /基准比赛时间（matchTime）：2026-11-29 23:15:00/);
    assert.ok(!md.includes('anchorTime'));
    for (const [, asset] of page.matchAll(/(?:src|href)="([^"]+)"/g)) assert.ok(fs.existsSync(path.resolve(destination, asset)));
  }
  assert.equal(fs.readFileSync(path.join(root, 'teamAgent/Team2', title + '.md'), 'utf8'), '旧报告');
  assert.equal(fs.existsSync(path.join(root, 'teamAgent/Team3', title + '.html')), false);
  for (const source of sources) assert.equal(fs.readFileSync(source.file, 'utf8'), source.content);
});
