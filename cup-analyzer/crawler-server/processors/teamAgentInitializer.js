/**
 * 从已登记俱乐部赛事的本地赛程初始化 teamAgent；本脚本不发起网络请求。
 * 工作目录：cup-analyzer/crawler-server；命令：node processors/teamAgentInitializer.js --all。
 * 球队与赛季来自 arrTeam 和赛程元数据，已有配置、文档和数据不覆盖。
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { isClubCompetition, readSchedule, safeTeamDirectory, seasonFolder } = require('../utils/teamAgent');

const WORKFLOW_MARKER = '<!-- team-agent-workflow-v1 -->';
const CONFIG_FIELDS = ['leagueSlug', 'leagueSerial', 'season', 'teamSerial', 'teamChineseName', 'teamEnglishName'];

function createMissing(file, content) {
  if (fs.existsSync(file)) {
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, { encoding: 'utf8', flag: 'wx' });
}

function readme(slug, league, status) {
  return `# ${league.chineseName}球队研究（teamAgent）

## 最终目的

研究球队未来比赛的赢盘表现更可能上升还是下降，识别值得持续跟踪的潜力球队。当前只建立数据基础，不把近期赢盘率直接当成未来概率或已验证的预测结论。

## 当前状态

${status}

初始化不发起联网采集。新建球队的初始状态为未采集、未分析；实际采集完成情况以数据完整性检查和命令统计为准。

## 数据与配置

- 球队名单、比赛 ID、主客队和赛季取自本赛事本地赛程：\`data/${path.basename(league.paths.cupScheduleData)}\`，不回退读取其他赛季。
- 赛后数据源为球探移动端 \`https://m.titan007.com/Analy/ShiJian/{matchId}.htm\`，复用已迁移的 PostMatchDataCrawler。
- 球队目录使用赛程英文名，Windows 禁止字符和空白替换为下划线，并去除末尾空格和句点；同名附加球队 ID。已有 Barcelona 对应球探 ID 84，保留原目录名。
- 每队 \`config.js\` 为 CommonJS：\`leagueSlug\` 为本赛事目录名（${slug}）；\`leagueSerial\` 为球探赛事序号（${league.cupSerial}）；\`season\` 为赛程完整赛季；\`teamSerial\` 为球队 ID；\`teamChineseName\`、\`teamEnglishName\` 为赛程中英文名。序号使用字符串。
- 每个球队只收集本目录对应赛事的已完赛比赛；启用mainStageOnly的杯赛从联赛/分组阶段起统计，不包含资格赛及资格赛附加赛。不混入该队其他联赛或杯赛。
- 数据目录为 \`{球队}/basicData/{短赛季}/{matchId}/\`；如 2026-2027 对应 26-27，单年 2026 保持不变。
- 核心文件为 \`matchInfo.json\`、\`matchEvents.json\`、\`techStats.json\`；上游提供时另保存 \`lineup.json\`、\`playerStats.json\`、\`goalProbability.json\`。
- 核心文件 ID 必须一致、基础状态为完赛、事件包含终场比分、全场技术统计非空，才视为已完成；不完整的数据再次采集。单场失败后继续，最终统计成功、跳过、失败，有失败返回非零退出码。

## 操作入口

工作目录为 \`cup-analyzer/crawler-server\`：

\`\`\`bash
# 仅创建缺少的文件；保留已有配置、文档和数据，冲突明确报告。
node processors/teamAgentInitializer.js --all
\`\`\`

单队更新命令见各队 workflow.md。采集入口通过必填 --config 读取该队配置，不读取 squadTarget.js，不要求设置 CUP_ANALYZER_CUP。

## 研究工作流与已知缺项

1. 核对球队配置与本地赛程的赛事、赛季、球队 ID。
2. 更新所属赛事赛程；注意现有全局 season 与本地赛程可能不一致，更新前人工核对，防止覆盖成其他赛季。
3. 采集本赛季已完赛比赛，检查缺场、重复 ID、事件与技术统计完整性。
4. 后续分析表现变化，并匹配盘口、对手强弱、主客场、阵容及赛程负荷。
5. 后续再定义趋势指标、记录判断时间，并用判断之后的比赛验证结果，避免用未来信息解释历史。

当前尚无赢盘趋势模型、跨赛事球队汇总或预测结论。赛后数据不包含完整盘口变动历史；本地赛程也可能过期或尚未包含全部比赛。高球队 ID 不作为占位符排除依据。
`;
}

function workflow(target, directoryName) {
  const relativeConfig = `../${target.leagueSlug}/teamAgent/${directoryName}/config.js`;
  return `${WORKFLOW_MARKER}
## 球队研究工作流

- 球队：${target.teamChineseName}（${target.teamEnglishName}，球探 ID ${target.teamSerial}）。
- 赛事：${target.leagueSlug}，赛季：${target.season}。
- 初始化状态：未采集、未分析；这不是每次执行采集后的实时状态。

以下命令均在 \`cup-analyzer/crawler-server\` 执行。

1. 核对本队 config.js；本地赛程的赛事、赛季、球队 ID 必须一致。
2. 更新所属赛事赛程。执行前核对 crawler-server/config/index.js 的对应赛事 season 是否为 ${target.season}，不一致时先人工确认，不用旧配置直接覆盖赛程。

\`\`\`bash
npx cross-env CUP_ANALYZER_CUP=${target.leagueSlug} node crawlers/scheduleCrawler.js
\`\`\`

3. 采集本队本赛季、本赛事已完赛比赛；再次执行时跳过完整数据，重新采集不完整数据。

\`\`\`bash
node processors/teamPostMatchDataProcessor.js --config "${relativeConfig}"
\`\`\`

4. 检查 \`basicData/${seasonFolder(target.season)}/{matchId}/\` 中的核心文件及命令成功、跳过、失败统计；文件 ID、终场事件与技术统计必须完整，并对照本地赛程检查缺场。
5. 后续分析：结合比赛表现、盘口、对手、主客场、阵容和赛程，形成带判断时间的潜力观察，再用后续比赛验证。本次未实现趋势判断或预测。

## basicData分析与赛后复盘

启用mainStageOnly的杯赛仅采集联赛/分组阶段及之后的正赛，排除资格赛及其附加赛。完整步骤见[赛事teamAgent工作流](../workflow.md)。

采集后切换到 \`cup-analyzer/analysis-cli\`，先执行全赛事build：

\`\`\`bash
node bin/cli.js build --league ${target.leagueSlug} --season ${target.season}
\`\`\`

然后生成xgStory、teamStrength、keyPlayerStarts等报告。需要本队比较时可在build中加入 \`--team ${target.teamSerial}\`；单队build同样覆盖指标目录，恢复全赛事报告时重新运行全赛事build。

本场复盘资料命令为 \`node bin/matchReview.js --league ${target.leagueSlug} --season ${target.season} --match {已完赛比赛ID}\`，缺少核心文件或实际首发时先补齐；不要使用预测阵容替代实际阵容。
`;
}

function configSource(target) {
  const quote = (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '\\r').replace(/\n/g, '\\n')}'`;
  return `// 来源：本赛事本地赛程；赛季或球队变化时需人工核对，不自动覆盖。\nmodule.exports = {\n${CONFIG_FIELDS.map((field) => `  ${field}: ${quote(target[field])},`).join('\n')}\n};\n`;
}

function initializeLeague(slug, league) {
  const root = path.join(league.paths.cupAnalyzer, 'teamAgent');
  let schedule;
  try {
    schedule = readSchedule(league);
  } catch (error) {
    createMissing(path.join(root, 'README.md'), readme(slug, league, `阻塞：${error.message}\n\n尚未生成球队配置，需先准备有效赛程，再重新初始化。`));
    return { teams: 0, blocked: error.message, conflicts: [] };
  }
  let phase = '本地赛程球队';
  if (league.mainStageOnly) phase = '联赛/分组阶段起的正赛球队，不含资格赛球队';
  createMissing(path.join(root, 'README.md'), readme(slug, league, `本地赛程赛季：${schedule.season}；名单包含 ${schedule.arrTeam.length} 支${phase}。这是本地数据快照，不表示已联网核实当前赛季。`));
  const aliases = new Map();
  const conflicts = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name, 'config.js');
    if (entry.isDirectory() && fs.existsSync(file)) {
      const existing = require(file);
      if (aliases.has(existing.teamSerial)) {
        throw new Error(`${slug} 存在重复球队配置：${existing.teamSerial}`);
      }
      aliases.set(existing.teamSerial, entry.name);
    }
  }
  // 已有 Barcelona 是用户创建的目录，按球队 ID 复用，不按赛程英文名再建一份。
  if (slug === 'laLiga' && fs.existsSync(path.join(root, 'Barcelona'))) {
    aliases.set('84', 'Barcelona');
  }
  const names = schedule.arrTeam.map((team) => {
    const id = String(team[0]);
    if (aliases.has(id)) {
      return aliases.get(id);
    }
    return safeTeamDirectory(team[3]);
  });
  const frequencies = new Map();
  for (const name of names) {
    const key = name.toLowerCase();
    if (!frequencies.has(key)) {
      frequencies.set(key, 0);
    }
    frequencies.set(key, frequencies.get(key) + 1);
  }
  const usedNames = new Set();
  let teams = 0;
  for (let index = 0; index < schedule.arrTeam.length; index++) {
    const team = schedule.arrTeam[index];
    const target = {
      leagueSlug: slug,
      leagueSerial: String(league.cupSerial),
      season: schedule.season,
      teamSerial: String(team[0]),
      teamChineseName: team[1],
      teamEnglishName: team[3],
    };
    let name = names[index];
    if (frequencies.get(name.toLowerCase()) > 1 && !aliases.has(target.teamSerial)) {
      name = `${name}_${target.teamSerial}`;
    }
    if (usedNames.has(name.toLowerCase())) {
      throw new Error(`${slug} 球队目录重名：${name}`);
    }
    usedNames.add(name.toLowerCase());
    const directory = path.join(root, name);
    const configFile = path.join(directory, 'config.js');
    if (fs.existsSync(configFile)) {
      const existing = require(configFile);
      if (CONFIG_FIELDS.some((field) => existing[field] !== target[field])) {
        conflicts.push(`配置与本地赛程冲突，未覆盖：${configFile}`);
        continue;
      }
    }
    createMissing(configFile, configSource(target));
    const workflowFile = path.join(directory, 'workflow.md');
    if (!fs.existsSync(workflowFile)) {
      createMissing(workflowFile, `# ${target.teamChineseName}球队研究\n\n${workflow(target, name)}`);
    } else if (!fs.readFileSync(workflowFile, 'utf8').includes(WORKFLOW_MARKER)) {
      fs.appendFileSync(workflowFile, `\n\n${workflow(target, name)}`, 'utf8');
    }
    createMissing(path.join(directory, 'basicData', seasonFolder(target.season), '.gitkeep'), '');
    teams++;
  }
  return { teams, blocked: null, conflicts };
}

function initializeAll(leagues, log) {
  const result = { leagues: 0, teams: 0, blocked: [], conflicts: [] };
  for (const [slug, league] of Object.entries(leagues)) {
    if (!isClubCompetition(slug)) {
      continue;
    }
    const initialized = initializeLeague(slug, league);
    result.conflicts.push(...initialized.conflicts);
    if (initialized.blocked) {
      result.blocked.push(slug);
      log(`${slug} 阻塞：${initialized.blocked}`);
    } else {
      result.leagues++;
      result.teams += initialized.teams;
      log(`${slug}：${initialized.teams} 支球队。`);
    }
  }
  for (const conflict of result.conflicts) {
    log(conflict);
  }
  log(`初始化完成：${result.leagues} 个有效赛事，${result.teams} 支球队；${result.blocked.length} 个赛事阻塞，${result.conflicts.length} 个配置冲突。未发送采集请求。`);
  return result;
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    let leagues = config.cups;
    if (args.length === 2 && args[0] === '--league' && config.cups[args[1]] && isClubCompetition(args[1])) {
      leagues = { [args[1]]: config.cups[args[1]] };
    } else if (args.length !== 1 || args[0] !== '--all') {
      throw new Error('用法：node processors/teamAgentInitializer.js --all | --league {赛事键}');
    }
    const result = initializeAll(leagues, console.log);
    process.exitCode = result.conflicts.length > 0 ? 1 : 0;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { initializeAll, initializeLeague };
