const fs = require('fs');
const path = require('path');
const BaseCrawler = require('../crawlers/base');
const config = require('../config');
const squadTarget = require('../config/squadTarget');
const { readJSON, readFile, saveMarkdown, fileExists } = require('../utils/fileWriter');
const { isDeepStrictEqual } = require('util');

const SECTION_START = '<!-- TEAM_SCHEDULE_START -->';
const SECTION_END = '<!-- TEAM_SCHEDULE_END -->';

function dateValue(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const parts = match.slice(1).map((part) => Number(part || 0));
  const [year, month, day, hour, minute, second] = parts;
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;
  const utc = Date.UTC(year, month - 1, day, hour, minute, second);
  const parsed = new Date(utc);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return utc;
}

function beijingTimeValue(value) {
  const utcValue = dateValue(value);
  return utcValue === null ? null : utcValue - 8 * 60 * 60 * 1000;
}

function isPlayed(match) {
  return String(match.status || '').toLowerCase() === 'played';
}

function isUpcoming(match) {
  return ['fixture', 'uncertain'].includes(String(match.status || '').toLowerCase());
}

function fmtTime(value) {
  if (!value) return '待定';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return '待定';
  const beijing = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6] || 0)) + 8 * 60 * 60 * 1000);
  return beijing.toISOString().slice(0, 19).replace('T', ' ');
}

function markdownCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/[\r\n]/g, ' ');
}

function parseMatch(rawMatch, index, teamId) {
  if (!rawMatch || typeof rawMatch !== 'object' || Array.isArray(rawMatch)) {
    throw new Error(`赛程第 ${index + 1} 条必须是比赛对象`);
  }
  const stringFields = [
    'competition_id', 'competition_name', 'gameweek', 'team_A_name', 'team_B_name', 'team_A_logo', 'team_B_logo',
    'fs_A', 'fs_B', 'ps_A', 'ps_B', 'start_play', 'suretime', 'status', 'playing_time', 'scheme', 'round_name',
    'minute', 'minute_extra', 'score_color', 'match_title',
  ];
  stringFields.forEach((field) => {
    if (typeof rawMatch[field] !== 'string') throw new Error(`赛程第 ${index + 1} 条字段 ${field} 必须是字符串`);
  });
  if (typeof rawMatch.match_id !== 'string' || typeof rawMatch.team_A_id !== 'string' || typeof rawMatch.team_B_id !== 'string' ||
      !/^\d+$/.test(rawMatch.match_id) || !/^\d+$/.test(rawMatch.team_A_id) || !/^\d+$/.test(rawMatch.team_B_id) ||
      !/^\d+$/.test(rawMatch.competition_id) || Number(rawMatch.match_id) <= 0 || Number(rawMatch.competition_id) <= 0 ||
      Number(rawMatch.team_A_id) <= 0 || Number(rawMatch.team_B_id) <= 0) {
    throw new Error(`赛程第 ${index + 1} 条比赛 ID 或球队 ID 格式无效`);
  }
  if (rawMatch.team_A_id !== String(teamId) && rawMatch.team_B_id !== String(teamId)) {
    throw new Error(`赛程第 ${index + 1} 条比赛不包含目标球队 ID ${teamId}`);
  }
  const teamIsA = rawMatch.team_A_id === String(teamId);
  return {
    matchId: rawMatch.match_id,
    competitionName: rawMatch.competition_name,
    gameweek: rawMatch.gameweek,
    matchTitle: rawMatch.match_title,
    opponentName: teamIsA ? rawMatch.team_B_name : rawMatch.team_A_name,
    teamSide: teamIsA ? 'A' : 'B',
    teamScore: teamIsA ? rawMatch.fs_A : rawMatch.fs_B,
    opponentScore: teamIsA ? rawMatch.fs_B : rawMatch.fs_A,
    teamPenaltyScore: teamIsA ? rawMatch.ps_A : rawMatch.ps_B,
    opponentPenaltyScore: teamIsA ? rawMatch.ps_B : rawMatch.ps_A,
    startPlay: rawMatch.start_play,
    startTime: rawMatch.start_play ? dateValue(rawMatch.start_play) : null,
    status: rawMatch.status,
    raw: rawMatch,
  };
}

function renderScheduleLine(fixture, anchorTime, teamName, isUpcomingMatch) {
  const beijingTime = fixture.startTime === null ? null : fmtTime(fixture.startPlay);
  const dateMatch = beijingTime && beijingTime.match(/^\d{4}-(\d{2})-(\d{2}) (\d{2}:\d{2}):\d{2}$/);
  const dateTime = dateMatch ? `${Number(dateMatch[1])}月${Number(dateMatch[2])}日 ${dateMatch[3]}` : '待定';
  const titlePrefix = `${fixture.competitionName} `;
  const titleRound = fixture.matchTitle.startsWith(titlePrefix)
    ? fixture.matchTitle.slice(titlePrefix.length).trim()
    : '';
  const round = titleRound || (fixture.gameweek ? `第${fixture.gameweek}轮` : '');
  const competitionRound = [fixture.competitionName, round].filter(Boolean).join(' ');
  const hours = fixture.startTime === null
    ? '待定'
    : `${Math.round(Math.abs(fixture.startTime - anchorTime) / (60 * 60 * 1000))}小时${isUpcomingMatch ? '' : '前'}`;
  return markdownCell(`${dateTime} ${competitionRound} ${fixture.opponentName}vs${teamName} ${hours}`);
}

function makeSection(anchorTime, recent, upcoming, teamName) {
  return [
    SECTION_START,
    '## 近期与未来赛程',
    '',
    '### 最近 3 场已完赛',
    ...recent.map((fixture) => renderScheduleLine(fixture, anchorTime, teamName, false)),
    '',
    '### 未来 3 场比赛',
    ...upcoming.map((fixture) => renderScheduleLine(fixture, anchorTime, teamName, true)),
    SECTION_END,
  ].join('\n');
}

class TeamScheduleProcessor extends BaseCrawler {
  constructor() {
    super('TeamScheduleProcessor');
  }

  updateScheduleSection(filePath, section) {
    let content = readFile(filePath);
    const blockRegex = new RegExp(`${SECTION_START}[\\s\\S]*?${SECTION_END}`, 'm');
    if (blockRegex.test(content)) {
      content = content.replace(blockRegex, section);
    } else {
      const marker = '## 统计摘要';
      const index = content.indexOf(marker);
      content = index < 0
        ? `${content.trimEnd()}\n\n${section}\n`
        : `${content.slice(0, index).trimEnd()}\n\n${section}\n\n${content.slice(index)}`;
    }
    saveMarkdown(filePath, content);
  }

  async run() {
    const targetPath = path.resolve(__dirname, '../../', squadTarget.leagueSlug, 'data/config.json');
    if (!fileExists(targetPath)) throw new Error(`球队映射文件不存在: ${targetPath}`);
    const mappings = readJSON(targetPath);
    const mapping = Object.values(mappings.team || {}).find((team) => String(team.qiutanSerial) === String(squadTarget.teamSerial));
    if (!mapping) throw new Error(`球队映射中找不到球探球队 ID ${squadTarget.teamSerial}`);
    const dqdTeamId = Object.keys(mappings.team).find((id) => mappings.team[id] === mapping);
    const schedulePath = path.join(config.paths.playerCenter, '..', `${squadTarget.teamSerial}-schedule.json`);
    if (!fileExists(schedulePath)) throw new Error(`懂球帝赛程文件不存在: ${schedulePath}，请先抓取球队名单/赛程`);
    const data = readJSON(schedulePath);
    const matches = Array.isArray(data) ? data : data.data;
    if (!Array.isArray(matches)) throw new Error(`${schedulePath} 赛程数据格式无效`);

    const anchorTime = beijingTimeValue(squadTarget.matchTime);
    if (anchorTime === null) throw new Error(`matchTime 必须是有效的北京时间，格式为 YYYY-MM-DD HH:mm:ss：${squadTarget.matchTime}`);
    const unique = new Map();
    matches.forEach((match, index) => {
      const fixture = parseMatch(match, index, dqdTeamId);
      const existing = unique.get(fixture.matchId);
      if (existing && !isDeepStrictEqual(existing.raw, fixture.raw)) {
        throw new Error(`同一 match_id 的赛程记录内容冲突: ${fixture.matchId}`);
      }
      unique.set(fixture.matchId, fixture);
    });
    const teamMatches = [...unique.values()];
    const anchors = teamMatches.filter((fixture) => fixture.startTime === anchorTime);
    if (anchors.length !== 1) {
      throw new Error(`球队 ${squadTarget.teamSerial} 在北京时间 ${squadTarget.matchTime} 匹配到 ${anchors.length} 场比赛，要求唯一`);
    }
    const anchor = anchors[0];
    const recent = teamMatches.filter((match) => isPlayed(match.raw) && match.startTime !== null && match.startTime < anchorTime)
      .sort((a, b) => b.startTime - a.startTime).slice(0, 3).reverse();
    const datedUpcoming = teamMatches.filter((match) => isUpcoming(match.raw) && match.startTime !== null && match.startTime > anchorTime)
      .sort((a, b) => a.startTime - b.startTime).slice(0, 3);
    const undatedUpcoming = teamMatches.filter((match) => isUpcoming(match.raw) && match.startTime === null);
    const upcoming = datedUpcoming.concat(undatedUpcoming.slice(0, Math.max(0, 3 - datedUpcoming.length)));

    const base = path.join(config.paths.cupAnalyzer, 'squad', `${mapping.qiutanName}.md`);
    if (!fileExists(base)) throw new Error(`初选名单不存在: ${base}，请先运行 leagueSquadProcessor`);
    const section = makeSection(anchor.startTime, recent, upcoming, mapping.qiutanName);
    this.updateScheduleSection(base, section);
    this.log(`已写入赛程区块: ${base}`);

    const finalRoot = config.paths.squadFinal;
    const finalName = `${mapping.qiutanName}.md`;
    const flatFinalPath = path.join(finalRoot, finalName);
    let finalCandidates = [];
    if (fileExists(flatFinalPath)) {
      finalCandidates = [flatFinalPath];
    } else if (fs.existsSync(finalRoot)) {
      finalCandidates = fs.readdirSync(finalRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(finalRoot, entry.name, finalName))
        .filter(fileExists);
    }
    if (finalCandidates.length > 1) throw new Error(`最终名单中找到多个 ${finalName}，无法唯一更新赛程区块`);
    if (finalCandidates.length === 1) {
      this.updateScheduleSection(finalCandidates[0], section);
      this.log(`已同步赛程区块至最终名单: ${finalCandidates[0]}`);
    }
  }
}

if (require.main === module) {
  new TeamScheduleProcessor().run().catch((error) => {
    console.error(`[TeamScheduleProcessor] ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = TeamScheduleProcessor;
