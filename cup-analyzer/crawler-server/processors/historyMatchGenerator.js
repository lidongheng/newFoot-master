const fs = require('fs');
const path = require('path');
const TeamProfileGenerator = require('./teamProfileGenerator');
const ClubAnalyzer = require('../analyzers/clubMatchAnalyzer');
const config = require('../config');
const { readJSON, saveMarkdown, fileExists } = require('../utils/fileWriter');

/**
 * 历史比赛首发生成器
 *
 * 输入:
 * - squad-final / player_center：复用 teamProfileGenerator 生成球队画像主体
 * - basicData 下各级 lineup.json：复用 postMatchDataCrawler 已抓取的真实阵型、首发、替补
 *
 * 输出:
 * - 有小组目录时：{cup}/historyMatch/group-X/{队名}.md
 * - 无小组目录时：{cup}/historyMatch/{队名}.md
 */
class HistoryMatchGenerator extends TeamProfileGenerator {
  constructor() {
    super();
    this.name = 'HistoryMatchGenerator';
  }

  getHistoryMatchPath(teamInfo, scheduleData) {
    const historyRoot = path.join(config.paths.cupAnalyzer, 'historyMatch');
    const letter = this.findGroupLetterForTeam(teamInfo.id, scheduleData);
    if (letter) return path.join(historyRoot, `group-${letter}`, `${teamInfo.chineseName}.md`);
    return path.join(historyRoot, `${teamInfo.chineseName}.md`);
  }

  collectLineupFiles(dirPath) {
    if (!fileExists(dirPath)) return [];
    const out = [];
    const stack = [dirPath];

    while (stack.length > 0) {
      const current = stack.pop();
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(fullPath);
          continue;
        }
        if (entry.isFile() && entry.name === 'lineup.json') out.push(fullPath);
      }
    }

    return out;
  }

  buildLineupIndex() {
    const index = new Map();
    const lineupFiles = this.collectLineupFiles(config.paths.basicData);
    for (const lineupPath of lineupFiles) {
      try {
        const lineup = readJSON(lineupPath);
        if (!lineup || lineup.matchId == null) continue;
        index.set(String(lineup.matchId), { lineup, lineupPath });
      } catch (err) {
        this.error(`lineup.json 读取失败: ${lineupPath} (${err.message})`);
      }
    }
    return index;
  }

  getStageNameByRoundKey(scheduleData, roundKey) {
    const match = String(roundKey || '').match(/^G(\d+)/);
    if (!match) return null;
    const kindId = Number(match[1]);
    if (!Array.isArray(scheduleData.arrCupKind)) return null;
    const row = scheduleData.arrCupKind.find((item) => Number(item[0]) === kindId);
    if (!row) return null;
    const name = String(row[2] || '').trim();
    return name || null;
  }

  flattenScheduleMatches(scheduleData) {
    const rows = [];
    const rounds = scheduleData.rounds || {};
    for (const [roundKey, matches] of Object.entries(rounds)) {
      if (!roundKey.startsWith('G') && !roundKey.startsWith('R_')) continue;
      if (!Array.isArray(matches) || matches.length === 0) continue;

      const isTwoLegCup =
        Array.isArray(matches[0]) && matches[0].length >= 5 && Array.isArray(matches[0][4]);

      if (isTwoLegCup) {
        for (const tie of matches) {
          const legs = [tie[4], tie[5]].filter((leg) => leg && leg[0]);
          for (const match of legs) rows.push({ roundKey, match });
        }
        continue;
      }

      for (const match of matches) rows.push({ roundKey, match });
    }
    return rows;
  }

  getGroupRoundLabelsForTeam(scheduleData, teamId) {
    const labels = new Map();
    const groupMap = this.buildGroupMap(scheduleData);
    for (const group of Object.values(groupMap)) {
      if (!group.teams.some((team) => Number(team.teamId) === Number(teamId))) continue;
      const matches = scheduleData.rounds[group.matchKey] || [];
      const teamMatches = matches
        .filter((match) => Number(match[4]) === Number(teamId) || Number(match[5]) === Number(teamId))
        .sort((a, b) => String(a[3] || '').localeCompare(String(b[3] || '')));
      teamMatches.forEach((match, index) => {
        labels.set(String(match[0]), `小组赛第${index + 1}轮`);
      });
    }
    return labels;
  }

  formatPlayerLabel(player) {
    if (!player || !player.name) return null;
    const number = String(player.number ?? '').trim();
    if (!number || number === '-') return player.name;
    return `${number}-${player.name}`;
  }

  formatPlayerList(players) {
    return (players || [])
      .map((player) => this.formatPlayerLabel(player))
      .filter(Boolean)
      .join('，');
  }

  formatFormationLabel(formation) {
    const digits = String(formation || '').replace(/[^0-9]/g, '');
    if (!digits) return '';
    return digits.split('').join('-');
  }

  formatStartingByFormation(players, formation) {
    const labels = (players || [])
      .map((player) => this.formatPlayerLabel(player))
      .filter(Boolean);
    if (labels.length === 0) return '';

    const digits = String(formation || '')
      .replace(/[^0-9]/g, '')
      .split('')
      .map((item) => Number(item));
    const validFormation =
      digits.length >= 2 && digits.reduce((sum, item) => sum + item, 0) === labels.length - 1;

    if (!validFormation) return labels.join('，');

    const groups = [labels[0]];
    let index = 1;
    for (const count of digits) {
      groups.push(labels.slice(index, index + count).join('，'));
      index += count;
    }
    return groups.join('/');
  }

  isFinishedMatch(match) {
    if (!match) return false;
    if (match[2] !== -1) return false;
    return typeof match[6] === 'string' && match[6] !== '';
  }

  buildMatchLabel(scheduleData, match, groupRoundLabels) {
    const matchId = String(match[0]);
    const groupLabel = groupRoundLabels.get(matchId);
    if (groupLabel) return groupLabel;

    const roundKey = String(match.roundKey || '');
    if (roundKey.startsWith('R_')) return `第${roundKey.replace('R_', '')}轮`;

    return this.getStageNameByRoundKey(scheduleData, roundKey);
  }

  getLocalLineupForMatch(match, isHome, lineupIndex) {
    const indexed = lineupIndex.get(String(match[0]));
    if (!indexed || !indexed.lineup) return null;

    const lineup = indexed.lineup;
    const formation = isHome ? lineup.homeFormation : lineup.guestFormation;
    const starting = isHome ? lineup.homeStarting : lineup.guestStarting;
    const subs = isHome ? lineup.homeSubs : lineup.guestSubs;
    if (!formation || !starting || !subs) return null;
    return { formation, starting, subs };
  }

  createLineupAnalyzer(teamInfo) {
    const isWorldCup = (config.activeCupKey || '') === 'theWorldCup';
    const isCupSchedule = config.type === 'cup';
    return new ClubAnalyzer({
      leagueId: config.cupSerial,
      serial: Number(teamInfo.id),
      isNation: isCupSchedule,
      matchByName: isWorldCup,
      roundSerial: null,
      teamChineseName: teamInfo.chineseName,
    });
  }

  async fetchLineupForMatch(match, isHome, analyzer) {
    const status = isHome ? 'home' : 'guest';
    try {
      const lineup = await analyzer.fetchSingleMatchLineup({
        matchSerial: match[0],
        status,
        score: match[6],
      });
      return lineup;
    } catch (err) {
      this.error(`比赛 ${match[0]} 阵容抓取失败: ${err.message}`);
      return null;
    }
  }

  async buildHistoryMatchSection(teamInfo, scheduleData, lineupIndex, options = {}) {
    const teamMap = this.buildTeamMap(scheduleData.arrTeam);
    const allMatches = this.flattenScheduleMatches(scheduleData);
    const groupRoundLabels = this.getGroupRoundLabelsForTeam(scheduleData, teamInfo.id);
    const blocks = [];
    let analyzer = null;
    const crawlMissing = options.crawlMissing !== false;

    for (const row of allMatches) {
      const match = row.match;
      if (!match || String(match[0] || '').trim() === '') continue;
      if (!this.isFinishedMatch(match)) continue;

      const homeTeamId = Number(match[4]);
      const awayTeamId = Number(match[5]);
      const isHome = homeTeamId === Number(teamInfo.id);
      const isAway = awayTeamId === Number(teamInfo.id);
      if (!isHome && !isAway) continue;

      const localLineup = this.getLocalLineupForMatch(match, isHome, lineupIndex);
      if (!localLineup && !crawlMissing) continue;
      if (!analyzer && !localLineup) analyzer = this.createLineupAnalyzer(teamInfo);

      const lineup = localLineup || await this.fetchLineupForMatch(match, isHome, analyzer);
      if (!lineup) continue;

      const formation = this.formatFormationLabel(lineup.formation);
      const startLine = this.formatStartingByFormation(lineup.starting, lineup.formation);
      const subLine = this.formatPlayerList(lineup.subs);
      if (!formation || !startLine || !subLine) continue;

      const homeName = teamMap[homeTeamId]?.chineseName;
      const awayName = teamMap[awayTeamId]?.chineseName;
      const matchLabel = this.buildMatchLabel(scheduleData, { ...match, roundKey: row.roundKey }, groupRoundLabels);
      if (!homeName || !awayName || !matchLabel) continue;

      blocks.push(`${matchLabel} ${homeName}vs${awayName} 阵型(${formation})：\n首发：${startLine}\n替补：${subLine}`);
    }

    if (blocks.length === 0) return '';
    return `### 每场比赛首发\n${blocks.join('\n\n')}`;
  }

  async generateHistoryMarkdown(team, scheduleData, resolved, source, options = {}) {
    const analyzerReport = this.loadAnalyzerReportForCurrentCup(team.id);
    const section = await this.buildHistoryMatchSection(team, scheduleData, this.buildLineupIndex(), {
      crawlMissing: options.crawlMissing,
    });
    const afterPredictedLineupSections = section ? [section] : [];

    return this.generateProfileMarkdown(team, resolved.players, {
      dataSource: resolved.dataSource,
      coach: resolved.coach,
      formation: resolved.formation,
      analyzerReport,
      injured: resolved.injured,
      doubtful: resolved.doubtful,
      manualSections: resolved.manualSections,
      afterPredictedLineupSections,
      source,
    });
  }

  loadAnalyzerReportForCurrentCup(teamId) {
    const leagueStyleCups = new Set([
      'championsLeague',
      'afcChampionsLeagueTwo',
      'europaLeague',
      'uefaConferenceLeague',
    ]);
    if (config.type !== 'league' && !leagueStyleCups.has(config.activeCupKey || '')) return null;
    return this.loadAnalyzerReport(teamId);
  }

  async generateOne(teamSerial, options = {}) {
    const source = options.source || 'final';
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

    const team = this.buildTeamMap(scheduleData.arrTeam)[id];
    if (!team) {
      this.error(
        `球队序号 ${id} 不在当前赛程 arrTeam 中。请确认已设置正确的 CUP_ANALYZER_CUP，且 cupScheduleData 与球队一致。`
      );
      return null;
    }

    const resolved = this.resolvePlayers(team, scheduleData, source);
    if (!resolved.players || resolved.players.length === 0) {
      this.error(`无可用球员数据（序号 ${id}）。请确认存在 squad-final 名单或 output/player_center/${id}.json`);
      return null;
    }

    try {
      const md = await this.generateHistoryMarkdown(team, scheduleData, resolved, source, {
        crawlMissing: options.crawlMissing,
      });
      const mdPath = this.getHistoryMatchPath(team, scheduleData);
      saveMarkdown(mdPath, md);
      this.syncSquadFinalStatsAfterProfile(resolved.finalPath, resolved.players, resolved.dataSource);
      this.log(`单队历史比赛画像完成: ${team.chineseName} → ${mdPath}（来源: ${resolved.dataSource}）`);
      return { team, mdPath, dataSource: resolved.dataSource };
    } catch (err) {
      this.error(`历史比赛画像生成失败: ${err.message}`);
      return null;
    }
  }

  async generateAll(options = {}) {
    const source = options.source || 'final';
    const scheduleData = this.parseScheduleData();
    if (!scheduleData) {
      this.error('无法读取赛程数据');
      return null;
    }

    const teams = this.getAllTeams(scheduleData);
    const results = { success: [], noData: [], failed: [] };

    for (const team of teams) {
      const resolved = this.resolvePlayers(team, scheduleData, source);
      if (!resolved.players || resolved.players.length === 0) {
        results.noData.push(team.chineseName);
        continue;
      }

      try {
        const md = await this.generateHistoryMarkdown(team, scheduleData, resolved, source, {
          crawlMissing: options.crawlMissing,
        });
        const mdPath = this.getHistoryMatchPath(team, scheduleData);
        saveMarkdown(mdPath, md);
        this.syncSquadFinalStatsAfterProfile(resolved.finalPath, resolved.players, resolved.dataSource);
        results.success.push(team.chineseName);
      } catch (err) {
        this.error(`${team.chineseName} 历史比赛画像生成失败: ${err.message}`);
        results.failed.push(team.chineseName);
      }
    }

    this.log(`\n历史比赛画像生成完成: 成功${results.success.length} 无数据${results.noData.length} 失败${results.failed.length}`);
    return results;
  }
}

function printHistoryMatchUsage() {
  console.log(`
历史比赛画像生成器

用法:
  node processors/historyMatchGenerator.js [选项]

选项:
  （无参数）              批量生成全部球队（--source 默认 final）
  --source final|raw     final：优先 squad-final，否则 player_center JSON；raw：仅 JSON
  --no-crawl             只读取本地 basicData/**/lineup.json，不联网抓缺失比赛
  --team <序号>           只生成一队
  -t <序号>               同 --team
  --help, -h              显示本说明

示例:
  npx cross-env CUP_ANALYZER_CUP=theWorldCup node processors/historyMatchGenerator.js --team 819
`);
}

function parseHistoryMatchCliArgs(argv) {
  const out = { mode: 'all', teamSerial: null, source: 'final', crawlMissing: true };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      out.mode = 'help';
      return out;
    }
    if (arg === '--no-crawl') {
      out.crawlMissing = false;
      continue;
    }
    if (arg === '--source') {
      const next = argv[i + 1];
      if (next === 'final' || next === 'raw') {
        out.source = next;
        i++;
      }
      continue;
    }
    if (arg.startsWith('--source=')) {
      const value = arg.slice('--source='.length).trim();
      if (value === 'final' || value === 'raw') out.source = value;
      continue;
    }
    if (arg === '--team' || arg === '-t') {
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
    if (arg.startsWith('--team=')) {
      const value = arg.slice('--team='.length).trim();
      if (value) {
        out.mode = 'one';
        out.teamSerial = value;
      } else {
        out.mode = 'missing_team';
      }
    }
  }
  return out;
}

if (require.main === module) {
  const opts = parseHistoryMatchCliArgs(process.argv.slice(2));
  const generator = new HistoryMatchGenerator();

  if (opts.mode === 'help') {
    printHistoryMatchUsage();
    process.exit(0);
  }
  if (opts.mode === 'missing_team') {
    console.error('错误: 请提供球队序号，例如: node processors/historyMatchGenerator.js --team 819\n');
    printHistoryMatchUsage();
    process.exit(1);
  }

  const runOpts = { source: opts.source, crawlMissing: opts.crawlMissing };
  if (opts.mode === 'one' && opts.teamSerial) {
    generator.generateOne(opts.teamSerial, runOpts).catch(console.error);
  } else {
    generator.generateAll(runOpts).catch(console.error);
  }
}

module.exports = HistoryMatchGenerator;
