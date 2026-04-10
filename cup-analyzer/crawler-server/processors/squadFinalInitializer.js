const path = require('path');
const BaseCrawler = require('../crawlers/base');
const config = require('../config');
const { readFile, saveMarkdown, fileExists } = require('../utils/fileWriter');

const TODO_COMMENT = '<!-- TODO: 请从初选名单中裁剪至26人 -->';

/**
 * 最终大名单初始化器：从 squad/ 初选复制到 squad-final/，并改写标题与待办注释
 *
 * 输入: cup-analyzer/.../squad/group-X/{队名}.md
 * 输出: cup-analyzer/.../squad-final/group-X/{队名}.md
 *
 * CLI:
 *   node processors/squadFinalInitializer.js
 *   node processors/squadFinalInitializer.js --team 744
 */
class SquadFinalInitializer extends BaseCrawler {
  constructor() {
    super('SquadFinalInitializer');
  }

  /**
   * 将初选 Markdown 转为最终名单草稿（待用户裁剪至 26 人）
   */
  transformToFinalDraft(content) {
    if (!content || !content.trim()) return `${TODO_COMMENT}\n`;
    let text = content;
    if (!text.includes(TODO_COMMENT)) {
      text = `${TODO_COMMENT}\n${text}`;
    }
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trimStart();
      if (line.startsWith('#')) {
        lines[i] = lines[i].replace(/26人大名单/g, '最终26人大名单（待确认）');
        break;
      }
    }
    return lines.join('\n');
  }

  /**
   * 遍历赛程全部球队：有初选 squad 文件则写入 squad-final
   */
  async processAll() {
    const scheduleData = this.parseScheduleData();
    if (!scheduleData) {
      this.error('无法读取赛程数据');
      return null;
    }

    const teamMap = this.buildTeamMap(scheduleData.arrTeam);
    const groupMap = this.buildGroupMap(scheduleData);
    const results = { success: [], skipped: [], failed: [] };
    const squadRoot = path.join(config.paths.cupAnalyzer, 'squad');
    const finalRoot = config.paths.squadFinal;

    for (const [letter, group] of Object.entries(groupMap)) {
      this.log(`处理小组 ${letter}...`);

      for (const team of group.teams) {
        const teamInfo = teamMap[team.teamId] || {
          id: team.teamId,
          chineseName: team.chineseName,
          englishName: team.englishName || '',
        };
        const baseName = `${teamInfo.chineseName}.md`;
        const srcPath = path.join(squadRoot, `group-${letter}`, baseName);

        if (!fileExists(srcPath)) {
          this.log(`  ${teamInfo.chineseName}(${team.teamId}) 无初选文件，跳过`);
          results.skipped.push({ team: teamInfo.chineseName, reason: 'no_squad_md' });
          continue;
        }

        try {
          const raw = readFile(srcPath);
          const out = this.transformToFinalDraft(raw);
          const destPath = path.join(finalRoot, `group-${letter}`, baseName);
          saveMarkdown(destPath, out);
          results.success.push({ team: teamInfo.chineseName, group: letter });
        } catch (err) {
          this.error(`  ${teamInfo.chineseName} 失败: ${err.message}`);
          results.failed.push(team);
        }
      }
    }

    this.log(`\n初始化完成: 成功${results.success.length} 跳过${results.skipped.length} 失败${results.failed.length}`);
    return results;
  }

  findGroupLetterForTeam(teamId, scheduleData) {
    const groupMap = this.buildGroupMap(scheduleData);
    const id = Number(teamId);
    for (const [letter, group] of Object.entries(groupMap)) {
      if (group.teams.some((t) => Number(t.teamId) === id)) return letter;
    }
    return null;
  }

  /**
   * 单队：从 squad 复制到 squad-final
   */
  async processOne(teamSerial) {
    const scheduleData = this.parseScheduleData();
    if (!scheduleData) {
      this.error('无法读取赛程数据');
      return null;
    }

    const id = Number(teamSerial);
    if (Number.isNaN(id)) {
      this.error(`无效的球队序号: ${teamSerial}`);
      return null;
    }

    const teamMap = this.buildTeamMap(scheduleData.arrTeam);
    const teamInfo = teamMap[id];
    if (!teamInfo) {
      this.error(
        `球队序号 ${id} 不在当前赛程 arrTeam 中。请确认已设置正确的 CUP_ANALYZER_CUP，且 cupScheduleData 与球队一致。`
      );
      return null;
    }

    const letter = this.findGroupLetterForTeam(id, scheduleData);
    const groupFolder = letter ? `group-${letter}` : 'misc';
    const squadRoot = path.join(config.paths.cupAnalyzer, 'squad');
    const finalRoot = config.paths.squadFinal;
    const baseName = `${teamInfo.chineseName}.md`;
    const srcPath = path.join(squadRoot, groupFolder, baseName);

    if (!fileExists(srcPath)) {
      this.error(`无初选文件: ${srcPath}，请先执行: node processors/squadProcessor.js --team ${id}`);
      return null;
    }

    try {
      const raw = readFile(srcPath);
      const out = this.transformToFinalDraft(raw);
      const destPath = path.join(finalRoot, groupFolder, baseName);
      saveMarkdown(destPath, out);
      this.log(`单队初始化完成: ${teamInfo.chineseName} → ${destPath}`);
      return { teamInfo, destPath, groupFolder };
    } catch (err) {
      this.error(`处理失败: ${err.message}`);
      return null;
    }
  }
}

function printUsage() {
  console.log(`
最终大名单初始化（squad/ → squad-final/）

用法:
  node processors/squadFinalInitializer.js [选项]

选项:
  （无参数）     按赛程遍历，有初选 md 则写入 squad-final/
  --team <序号>  只处理一队
  -t <序号>      同 --team
  --help, -h     显示本说明

示例:
  node processors/squadProcessor.js --team 744
  node processors/squadFinalInitializer.js --team 744
`);
}

function parseCliArgs(argv) {
  const out = { mode: 'all', teamSerial: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      out.mode = 'help';
      return out;
    }
    if (a === '--team' || a === '-t') {
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        out.mode = 'one';
        out.teamSerial = String(next).trim();
        i++;
      } else {
        out.mode = 'missing_team';
      }
      continue;
    }
    if (a.startsWith('--team=')) {
      const v = a.slice('--team='.length).trim();
      if (v) {
        out.mode = 'one';
        out.teamSerial = v;
      } else {
        out.mode = 'missing_team';
      }
    }
  }
  return out;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const opts = parseCliArgs(argv);
  const init = new SquadFinalInitializer();

  if (opts.mode === 'help') {
    printUsage();
    process.exit(0);
  }
  if (opts.mode === 'missing_team') {
    console.error('错误: 请提供球队序号，例如: node processors/squadFinalInitializer.js --team 744\n');
    printUsage();
    process.exit(1);
  }
  if (opts.mode === 'one' && opts.teamSerial) {
    init.processOne(opts.teamSerial).catch(console.error);
  } else {
    init.processAll().catch(console.error);
  }
}

module.exports = SquadFinalInitializer;
