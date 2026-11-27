/** 全量本地迁移；不联网。原画像逐份归档、逐份对账，不覆盖目录冲突。 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const config = require('../config');
const { readSchedule, safeTeamDirectory } = require('../utils/teamAgent');
const { teamDirectory, missingMarkdown } = require('../utils/teamProfileData');

const reportRoot = path.join(__dirname, '../output/profile-migration');
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function filesUnder(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) return filesUnder(file);
    return [file];
  });
}

function renameAgents(league) {
  const root = path.join(league.paths.cupAnalyzer, 'teamAgent');
  if (!fs.existsSync(root)) return [];
  const renames = fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory() && /\s/.test(entry.name)).map((entry) => ({ from: path.join(root, entry.name), to: path.join(root, safeTeamDirectory(entry.name)) }));
  const targets = new Set();
  for (const item of renames) {
    if (fs.existsSync(item.to) || targets.has(item.to.toLowerCase())) throw new Error(`目录重名冲突：${item.to}`);
    targets.add(item.to.toLowerCase());
    item.hashes = filesUnder(item.from).map((file) => ({ relative: path.relative(item.from, file), hash: hash(file) }));
  }
  for (const item of renames) {
    if (path.dirname(item.from) !== root || path.dirname(item.to) !== root) throw new Error('目录超出球队目录根路径');
    fs.renameSync(item.from, item.to);
    for (const file of item.hashes) {
      if (hash(path.join(item.to, file.relative)) !== file.hash) throw new Error(`迁移校验失败：${file.relative}`);
    }
  }
  // 只更新显式球队路径，不修改赛程英文名、球员数据和历史原始记录。
  const textFiles = filesUnder(league.paths.cupAnalyzer).filter((file) => /\.(md|js)$/.test(file) && !file.includes(`${path.sep}data${path.sep}`));
  for (const file of textFiles) {
    const original = fs.readFileSync(file, 'utf8');
    let content = original;
    for (const item of renames) {
      const oldName = path.basename(item.from);
      const newName = path.basename(item.to);
      for (const separator of ['/', '\\', '\\\\']) content = content.split(`teamAgent${separator}${oldName}${separator}`).join(`teamAgent${separator}${newName}${separator}`);
    }
    if (content !== original) fs.writeFileSync(file, content, 'utf8');
  }
  return renames.map(({ from, to, hashes }) => ({ from, to, verifiedFiles: hashes.length }));
}

function updateProfileReferences(league, profiles) {
  const root = path.join(league.paths.cupAnalyzer, 'teamProfile');
  const files = filesUnder(league.paths.cupAnalyzer).filter((file) => /\.(md|js)$/.test(file) && !file.includes(`${path.sep}data${path.sep}`) && !file.includes(`${path.sep}basicData${path.sep}`));
  for (const file of files) {
    const original = fs.readFileSync(file, 'utf8');
    let content = original;
    for (const profile of profiles) {
      if (!profile.destination) continue;
      const relative = path.relative(root, profile.destination).split(path.sep).join('/');
      const old = `teamProfile/${profile.name}.md`;
      content = content.split(old).join(`teamProfile/${relative}`);
      const parts = relative.split('/');
      if (parts[0].startsWith('group-')) content = content.split(`teamProfile/${parts[0]}/${profile.name}.md`).join(`teamProfile/${relative}`);
    }
    if (content !== original) fs.writeFileSync(file, content, 'utf8');
  }
}

async function migrateLeague(slug) {
  const league = config.cups[slug];
  if (!league) throw new Error(`未知赛事 ${slug}`);
  const root = path.join(league.paths.cupAnalyzer, 'teamProfile');
  const inventory = filesUnder(root).filter((file) => file.endsWith('.md') && path.basename(file) !== 'README.md');
  const result = { league: slug, originalProfiles: inventory.length, migrated: 0, generated: 0, missing: 0, failed: 0, directoryRenames: [], profiles: [], issues: [] };
  result.directoryRenames = renameAgents(league);
  let schedule;
  try { schedule = readSchedule(league); }
  catch (error) { result.issues.push({ reason: error.message, file: league.paths.cupScheduleData }); }
  const Generator = require('./teamProfileGenerator');
  const generator = new Generator();
  const data = generator.parseScheduleData();
  const teams = generator.buildTeamMap(data && data.arrTeam);
  const destinations = new Set();
  const plans = inventory.map((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const name = path.basename(file, '.md');
    let candidates = Object.values(teams).filter((team) => team.chineseName === name);
    // 存量名单可能属于旧赛季或使用旧译名，必须以名单中的 ID 和英文标题交叉核验。
    if (candidates.length !== 1) {
      const finalFile = path.join(league.paths.squadFinal, `${name}.md`);
      if (fs.existsSync(finalFile)) {
        const final = fs.readFileSync(finalFile, 'utf8');
        const id = final.match(/球队ID[:：]\s*(\d+)/);
        const title = final.match(/^#\s+(.+?)（(.+?)）/m);
        const oldTitle = content.match(/^#\s+(.+?)（(.+?)）/m);
        if (id && title && oldTitle && title[1] === name && title[2] === oldTitle[2]) {
          const known = teams[Number(id[1])];
          if (known) candidates = [{ ...known, chineseName: name }];
          else candidates = [{ id: Number(id[1]), chineseName: name, englishName: title[2] }];
        }
      }
    }
    const entry = { original: file, originalHash: hash(file), name };
    let missingHistoricalSource = false;
    if (candidates.length !== 1) {
      const title = content.match(/^#\s+(.+?)（(.+?)）/m);
      if (title && title[1] === name) {
        const identities = [];
        for (const definition of Object.values(config.cups)) {
          try {
            const other = readSchedule(definition);
            for (const row of other.arrTeam) {
              if (row[1] === name && row[3] === title[2]) identities.push(row);
            }
          } catch { /* 无效赛程不能用于核验球队身份。 */ }
        }
        const ids = new Set(identities.map((row) => row[0]));
        if (ids.size === 1) {
          candidates = [{ id: identities[0][0], chineseName: name, englishName: title[2] }];
          missingHistoricalSource = true;
        }
      }
    }
    if (candidates.length !== 1) {
      entry.reason = '无法唯一匹配赛程球队；保留原文件，请补充赛程球队映射';
      return { entry, content };
    }
    const team = candidates[0];
    const destination = generator.getTeamProfilePath(team, data);
    entry.destination = destination;
    if (destinations.has(destination.toLowerCase()) || (file !== destination && fs.existsSync(destination))) {
      entry.reason = '画像目标重名冲突，保留原文件';
    }
    destinations.add(destination.toLowerCase());
    return { entry, team, content, missingHistoricalSource };
  });
  for (const { entry, team, content, missingHistoricalSource } of plans) {
    result.profiles.push(entry);
    if (entry.reason) {
      result.failed++;
      result.issues.push({ file: entry.original, reason: entry.reason });
      continue;
    }
    const archiveCandidates = filesUnder(path.join(reportRoot, 'originals', slug)).filter((file) => path.basename(file) === path.basename(entry.original));
    let archive = path.join(reportRoot, 'originals', slug, path.relative(root, entry.original));
    if (archiveCandidates.length === 1) archive = archiveCandidates[0];
    if (!fs.existsSync(archive)) {
      fs.mkdirSync(path.dirname(archive), { recursive: true });
      fs.copyFileSync(entry.original, archive);
    }
    entry.archive = archive;
    entry.archiveHash = hash(archive);
    fs.mkdirSync(path.dirname(entry.destination), { recursive: true });
    if (entry.original !== entry.destination) {
      fs.renameSync(entry.original, entry.destination);
      result.migrated++;
    }
    try {
      if (missingHistoricalSource) throw new Error('旧赛季画像缺少对应 squad-final；保留原文，请补旧赛季名单及统计，不使用其他联赛统计替代');
      const resolved = generator.resolvePlayers(team, data, 'final');
      if (!resolved.players || !resolved.players.length) throw new Error('缺少可用 squad-final 或 player_center 名单');
      const analyzerReport = generator.loadAnalyzerReport(team.id);
      const meta = { ...resolved, analyzerReport };
      let md = generator.generateProfileMarkdown(team, resolved.players, meta);
      // 原画像非标准章节（含手工备注和赛程）原样保留；完整原文另行归档。
      const sections = content.split(/(?=^##\s)/m).filter((section) => /^##\s/.test(section));
      for (const section of sections) {
        const title = section.split('\n')[0].trim();
        if (/^##\s+[一二三四五六七八九十]+、/.test(title) || title === '## 待补数据' || title === '## 迁移前画像') continue;
        if (!md.includes(title)) md += '\n\n' + section.trimEnd();
      }
      const link = path.relative(path.dirname(entry.destination), archive).split(path.sep).join('/');
      md += `\n\n## 迁移前画像\n\n[完整原文与人工内容归档](${link})\n`;
      const output = generator.writeProfile(team, data, resolved.players, meta, md);
      entry.json = output.jsonPath;
      const missing = JSON.parse(fs.readFileSync(path.join(path.dirname(entry.destination), 'missingData.json'), 'utf8'));
      result.missing += missing.length;
      result.issues.push(...missing);
      entry.status = 'generated';
      result.generated++;
    } catch (error) {
      result.failed++;
      entry.reason = error.message;
      const issues = [{ team: team.chineseName, teamId: String(team.id), profile: entry.destination, file: path.join(league.paths.squadFinal, `${team.chineseName}.md`), reason: error.message }];
      result.issues.push(...issues);
      fs.writeFileSync(entry.destination, content.replace(/\n## 待补数据[\s\S]*$/, '') + '\n\n' + missingMarkdown(issues), 'utf8');
      fs.writeFileSync(path.join(path.dirname(entry.destination), 'missingData.json'), JSON.stringify(issues, null, 2) + '\n', 'utf8');
      const directory = path.dirname(entry.destination);
      const jsonPath = path.join(directory, `${path.basename(directory)}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify({ teamId: String(team.id), chineseName: team.chineseName, englishName: team.englishName, season: null, dataSource: 'missing', players: [], missingData: issues }, null, 2) + '\n', 'utf8');
      entry.json = jsonPath;
    }
  }
  const indexFile = path.join(root, 'README.md');
  let index = '# 球队画像\n';
  if (fs.existsSync(indexFile)) index = fs.readFileSync(indexFile, 'utf8').replace(/\n<!-- generated-profile-index -->[\s\S]*$/, '');
  for (const entry of result.profiles) {
    if (!entry.destination) continue;
    const relative = path.relative(root, entry.destination).split(path.sep).join('/');
    for (const prefix of ['', './']) index = index.split(`](${prefix}${entry.name}.md)`).join(`](${relative})`);
  }
  index += '\n\n<!-- generated-profile-index -->\n## 画像与待补数据\n\n每队一个英文目录（空白使用下划线），包含中文画像 MD、同名英文 JSON 和 missingData.json。\n\n';
  for (const entry of result.profiles) {
    const file = entry.destination || entry.original;
    const relative = path.relative(root, file).split(path.sep).join('/');
    let status = '已生成 MD/JSON';
    if (entry.reason) status = `待补：${entry.reason}`;
    index += `- [${entry.name}](${relative})：${status}\n`;
  }
  if (fs.existsSync(root)) fs.writeFileSync(indexFile, index, 'utf8');
  updateProfileReferences(league, result.profiles);
  if (schedule) result.season = schedule.season;
  fs.mkdirSync(reportRoot, { recursive: true });
  fs.writeFileSync(path.join(reportRoot, `${slug}.json`), JSON.stringify(result, null, 2) + '\n', 'utf8');
  return result;
}

function migrateAll() {
  const results = [];
  fs.mkdirSync(reportRoot, { recursive: true });
  for (const slug of Object.keys(config.cups)) {
    const child = spawnSync(process.execPath, [__filename, '--league', slug], { env: { ...process.env, CUP_ANALYZER_CUP: slug }, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
    fs.writeFileSync(path.join(reportRoot, `${slug}.log`), child.stdout + child.stderr, 'utf8');
    if (child.status !== 0) results.push({ league: slug, failed: 1, reason: child.stderr || child.error?.message });
    else results.push(JSON.parse(fs.readFileSync(path.join(reportRoot, `${slug}.json`), 'utf8')));
  }
  fs.writeFileSync(path.join(reportRoot, 'summary.json'), JSON.stringify(results, null, 2) + '\n', 'utf8');
  const lines = ['# 全量球队画像迁移与待补数据', '', '| 赛事 | 原有画像 | 迁移 | MD/JSON成功 | 缺失字段 | 失败 |', '|---|---|---|---|---|---|'];
  for (const result of results) {
    const inLayout = (result.profiles || []).filter((profile) => profile.destination && fs.existsSync(profile.destination)).length;
    result.inNewLayout = inLayout;
    lines.push(`| [${result.league}](${result.league}.json) | ${result.originalProfiles ?? '缺失'} | ${inLayout} | ${result.generated ?? '缺失'} | ${result.missing ?? '缺失'} | ${result.failed} |`);
  }
  fs.writeFileSync(path.join(reportRoot, 'summary.json'), JSON.stringify(results, null, 2) + '\n', 'utf8');
  lines.push('', '请按各赛事 JSON 的 issues 补充源名单、赛季统计或赛程，之后重新生成画像和榜单。原文保存在 originals 中。', '', '重新生成：`node processors/migrateTeamProfiles.js`（在 crawler-server 目录执行）。', '');
  fs.writeFileSync(path.join(reportRoot, 'README.md'), lines.join('\n'), 'utf8');
  console.table(results.map(({ league, originalProfiles, migrated, generated, missing, failed }) => ({ league, originalProfiles, migrated, generated, missing, failed })));
  console.log(`请补充以上数据后重新生成：${path.join(reportRoot, 'README.md')}`);
}

if (require.main === module) {
  if (process.argv[2] === '--league') migrateLeague(process.argv[3]).catch((error) => { console.error(error.stack); process.exitCode = 1; });
  else migrateAll();
}

module.exports = { filesUnder, renameAgents, updateProfileReferences, migrateLeague, migrateAll };
