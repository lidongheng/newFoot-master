const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const Generator = require('../processors/teamProfileGenerator');
const { numeric, tableColumns, profileData, teamDirectory, profileSeason } = require('../utils/teamProfileData');
const { renameAgents } = require('../processors/migrateTeamProfiles');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(__dirname, '.profile-data-'));
  t.after(() => {
    assert.equal(path.dirname(root), __dirname);
    fs.rmSync(root, { recursive: true });
  });
  return root;
}

test('表头全部导出，转会和人工列不丢失，真实0和未知统计分开', (t) => {
  const root = fixture(t);
  const file = path.join(root, '名单.md');
  const content = '# 测试\n> 赛季: 25-26 | 截至第36轮\n\n| 球衣号 | 姓名 | 年龄 | 转会记录 | 人工备注 |\n|---|---|---|---|---|\n| 7 | 球员甲 | 25 | A->B | 需跟踪 |\n';
  fs.writeFileSync(file, content);
  assert.equal(tableColumns(content)[0]['人工备注'], '需跟踪');
  const exported = profileData({ id: 1, chineseName: '测试', englishName: 'Test' }, '2025-2026', [{ number: 7, name: '球员甲', age: 25, height: '180cm', marketValue: '1.5亿', caps: 12, lineups: 10, goals: 0 }], 'final', file, null);
  const player = exported.data.players[0];
  assert.equal(player.sourceColumns['转会记录'], 'A->B');
  assert.equal(player.sourceColumns['人工备注'], '需跟踪');
  assert.equal(player.appearances, 12);
  assert.equal(player.starts, 10);
  assert.equal(player.goals, 0);
  assert.equal(player.assists, null);
  assert.equal(player.marketValue, 15000);
  assert.equal(player.height, 180);
  assert(exported.issues.some((item) => item.field === 'assists'));
  assert(!exported.issues.some((item) => item.field === 'goals'));
  assert.equal(profileSeason(file, 'not-needed'), '2025-2026');
  assert.equal(numeric('-'), null);
  const missingJerseyFile = path.join(root, '无号码.md');
  fs.writeFileSync(missingJerseyFile, '| 球衣号 | 姓名 | 人工备注 |\n|---|---|---|\n| - | 未知号码 | 保留 |\n');
  const missingJersey = profileData({ id: 1, chineseName: '测试', englishName: 'Test' }, '2026', [{ number: null, name: '未知号码' }, { name: '教练', staff: '主教练' }], 'final', missingJerseyFile, null);
  assert.equal(missingJersey.data.players.length, 1);
  assert.equal(missingJersey.data.players[0].sourceColumns['人工备注'], '保留');
  assert.equal(missingJersey.data.players[0].number, null);
});

test('目录迁移哈希校验、工作流更新、重跑不变、冲突不覆盖', (t) => {
  const root = fixture(t);
  const old = path.join(root, 'teamAgent', 'Real Madrid');
  fs.mkdirSync(old, { recursive: true });
  fs.writeFileSync(path.join(old, 'config.js'), "module.exports = { teamSerial: '82' };\n");
  const bytes = Buffer.from([0, 1, 255, 40]);
  fs.writeFileSync(path.join(old, 'raw.json'), bytes);
  fs.writeFileSync(path.join(old, 'workflow.md'), '--config ../laLiga/teamAgent/Real Madrid/config.js');
  const result = renameAgents({ paths: { cupAnalyzer: root } });
  assert.equal(result.length, 1);
  const destination = path.join(root, 'teamAgent', 'Real_Madrid');
  assert.deepEqual(fs.readFileSync(path.join(destination, 'raw.json')), bytes);
  assert(fs.readFileSync(path.join(destination, 'workflow.md'), 'utf8').includes('Real_Madrid/config.js'));
  assert.equal(renameAgents({ paths: { cupAnalyzer: root } }).length, 0);
  assert.equal(teamDirectory(root, { id: 82, englishName: 'Real Madrid' }), 'Real_Madrid');
  fs.mkdirSync(old);
  assert.throws(() => renameAgents({ paths: { cupAnalyzer: root } }), /冲突/);
  assert(fs.existsSync(path.join(destination, 'raw.json')));
});

test('单队和批量共用画像写入，保留人工章节，缺失补齐后消失', async (t) => {
  const root = fixture(t);
  const original = { ...config.paths };
  const originalNation = config.isNation;
  t.after(() => { config.paths = original; config.isNation = originalNation; });
  const scheduleFile = path.join(root, 's31.js');
  fs.writeFileSync(scheduleFile, "var arrLeague=[31,'','','','2026-2027'];");
  config.paths = { cupAnalyzer: root, cupScheduleData: scheduleFile, playerCenter: path.join(root, 'players') };
  config.isNation = false;
  const generator = new Generator();
  const team = { id: 84, chineseName: '巴塞罗那', englishName: 'FC Barcelona' };
  const agent = path.join(root, 'teamAgent', 'Barcelona');
  fs.mkdirSync(agent, { recursive: true });
  fs.writeFileSync(path.join(agent, 'config.js'), "module.exports={teamSerial:'84'};\n");
  const player = { number: 7, name: '球员甲', age: 25, height: 180, position: 'ST', marketValue: 100, nationality: '西班牙', ability: '80', appearances: 2, starts: 1, goals: 0, assists: null };
  let output = generator.writeProfile(team, {}, [player], { dataSource: 'raw' }, '# 测试\n\n## 人工备注\n保留我的文字\n');
  const missingFile = path.join(path.dirname(output.mdPath), 'missingData.json');
  assert(JSON.parse(fs.readFileSync(missingFile, 'utf8')).some((item) => item.field === 'assists'));
  output = generator.writeProfile(team, {}, [{ ...player, assists: 0 }], { dataSource: 'raw' }, '# 重新生成\n');
  assert(fs.readFileSync(output.mdPath, 'utf8').includes('保留我的文字'));
  assert.equal(JSON.parse(fs.readFileSync(missingFile, 'utf8')).length, 0);
  assert.equal(await generator.getProfile('巴塞罗那'), fs.readFileSync(output.mdPath, 'utf8'));
  assert.equal(path.basename(output.jsonPath), 'Barcelona.json');
  assert.equal(JSON.parse(fs.readFileSync(output.jsonPath, 'utf8')).players[0].assists, 0);
});
