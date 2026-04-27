/**
 * 赛中大名单：从双方 squad-final 读阵型/名单/伤停/伤疑；预测首发与 teamProfileGenerator.computePredictedStartingLineup 同源（非静态「推荐首发」段）。
 *
 * - 联赛/欧冠（有出场统计）：预测替补 = 非首发且非伤停且非伤疑中出场数最高的 9 人；落选 = 其余未列入者。
 * - 世界杯国家队（无出场统计）：预测替补 = 除首发与伤停外的全部球员（伤疑仍可进替补）；不输出落选。
 *
 * CLI:
 *   CUP_ANALYZER_CUP=epl node processors/matchSquadGenerator.js --home 19 --away 25
 */

const path = require('path');
const config = require('../config');
const { readFile, fileExists } = require('../utils/fileWriter');
const BaseCrawler = require('../crawlers/base');
const TeamProfileGenerator = require('./teamProfileGenerator');
const predLineupUtil = require('../utils/predictedStartingLineup');

function isWorldCupNationalContext() {
  return (config.activeCupKey || '') === 'theWorldCup';
}

/**
 * @param {string} lineupText
 * @returns {{ number: number|null, name: string }[]}
 */
function extractStarterTokens(lineupText) {
  const s = String(lineupText || '');
  const tokens = [];
  const re = /(\d+)\s*[-－]\s*([^，,／/\n]+)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    tokens.push({ number: parseInt(m[1], 10), name: m[2].trim() });
  }
  if (tokens.length >= 5) return tokens;
  const parts = s
    .split(/[/／，,]/)
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.map((p) => {
    const mm = p.match(/^(\d+)\s*[-－]\s*(.+)$/);
    if (mm) return { number: parseInt(mm[1], 10), name: mm[2].trim() };
    return { number: null, name: p };
  });
}

class MatchSquadGenerator extends BaseCrawler {
  constructor() {
    super('MatchSquadGenerator');
    this.profileGen = new TeamProfileGenerator();
  }

  /**
   * @param {object} teamInfo
   * @param {object} scheduleData
   * @returns {string|null}
   */
  resolveSquadFinalPath(teamInfo, scheduleData) {
    const root = config.paths.squadFinal;
    const flat = path.join(root, `${teamInfo.chineseName}.md`);
    if (fileExists(flat)) return flat;
    const letter = this.profileGen.findGroupLetterForTeam(teamInfo.id, scheduleData);
    const folder = letter ? `group-${letter}` : 'misc';
    const g = path.join(root, folder, `${teamInfo.chineseName}.md`);
    if (fileExists(g)) return g;
    return null;
  }

  playerKey(p) {
    return `${String(p.number)}::${(p.name || '').trim()}`;
  }

  /**
   * @param {any[]} players
   * @param {{ number: number|null, name: string }} token
   */
  findPlayerForToken(players, token) {
    if (token.number != null && !Number.isNaN(token.number)) {
      const byNum = players.filter((p) => Number(p.number) === token.number);
      if (byNum.length === 1) return byNum[0];
      const byBoth = byNum.find((p) => (p.name || '').trim() === token.name);
      if (byBoth) return byBoth;
      if (byNum[0]) return byNum[0];
    }
    return this.profileGen.findPlayerByInjuryLine(players, token.name);
  }

  formatJerseyLabel(p, national) {
    if (national) return p.name || '';
    const raw = p.number;
    if (raw == null || raw === '') return p.name || '';
    const str = String(raw).trim();
    if (str === '' || str === '-') return p.name || '';
    return `${str}-${p.name || ''}`;
  }

  /**
   * 替补行：联赛为 号-名(位置)；国家队为 号-名(俱乐部，位置)
   */
  formatBenchShort(p, national) {
    const posCode =
      predLineupUtil.normalizePositionCode(p.position) || String(p.position || '').trim() || '-';
    if (national) {
      const club = String(p.currentClub || '').trim() || '-';
      return `${this.formatJerseyLabel(p, national)}(${club}，${posCode})`;
    }
    return `${this.formatJerseyLabel(p, national)}(${posCode})`;
  }

  /**
   * @param {object} teamInfo
   * @param {object} scheduleData
   * @returns {string}
   */
  buildTeamBlock(teamInfo, scheduleData) {
    const fp = this.resolveSquadFinalPath(teamInfo, scheduleData);
    if (!fp) {
      return `=== ${teamInfo.chineseName} ===\n（未找到 squad-final 文件）\n`;
    }
    const content = readFile(fp);
    const parsed = this.profileGen.parseFinalSquadMarkdown(content);
    const players = parsed.players || [];
    const national = isWorldCupNationalContext();

    const analyzerReport = !national ? this.profileGen.loadAnalyzerReport(teamInfo.id) : null;
    const { predLine, predFormationLabel, starters: analyzerStarters } =
      this.profileGen.computePredictedStartingLineup({
        players,
        formation: parsed.formation || null,
        analyzerReport,
        injured: parsed.injured || [],
      });

    const starters = [];
    const seen = new Set();
    const pushStarter = (pl) => {
      if (!pl) return;
      const k = this.playerKey(pl);
      if (!seen.has(k)) {
        seen.add(k);
        starters.push(pl);
      }
    };

    if (analyzerStarters && analyzerStarters.length > 0) {
      for (const s of analyzerStarters) {
        pushStarter(
          this.findPlayerForToken(players, {
            number: s.number != null ? Number(s.number) : null,
            name: s.name || '',
          })
        );
      }
    }

    if (starters.length < 11 && predLine) {
      const tokens = extractStarterTokens(predLine);
      for (const t of tokens) {
        pushStarter(this.findPlayerForToken(players, t));
      }
    }

    const starterKeys = new Set(starters.map((p) => this.playerKey(p)));

    const injuredPlayers = (parsed.injured || [])
      .map((line) => this.profileGen.findPlayerByInjuryLine(players, line))
      .filter(Boolean);
    const doubtfulPlayers = (parsed.doubtful || [])
      .map((line) => this.profileGen.findPlayerByInjuryLine(players, line))
      .filter(Boolean);

    const injKeys = new Set(injuredPlayers.map((p) => this.playerKey(p)));
    const doubtKeys = new Set(doubtfulPlayers.map((p) => this.playerKey(p)));

    /** 联赛：排除首发、伤停、伤疑；国家队：仅排除首发与伤停（伤疑可进替补池） */
    const pool = players.filter((p) => {
      const k = this.playerKey(p);
      if (starterKeys.has(k) || injKeys.has(k)) return false;
      if (!national && doubtKeys.has(k)) return false;
      return true;
    });

    const lines = [];
    lines.push(`=== ${teamInfo.chineseName} ===`);
    const title = predFormationLabel ? `预测首发（${predFormationLabel}）` : '预测首发';
    lines.push(title);
    lines.push(predLine || '（无推荐首发文本）');
    lines.push('');

    const doubtFmt = doubtfulPlayers.map((p) =>
      this.profileGen.formatInjuryDoubtfulDisplayLine(p, national)
    );
    const injFmt = injuredPlayers.map((p) =>
      this.profileGen.formatInjuryDoubtfulDisplayLine(p, national)
    );

    if (national) {
      const benchFmt = pool.map((p) => this.formatBenchShort(p, true));
      lines.push(`预测替补：${benchFmt.join('，')}`);
      lines.push(`伤疑：${doubtFmt.length ? doubtFmt.join('，') : '（无）'}`);
      lines.push(`伤停：${injFmt.length ? injFmt.join('，') : '（无）'}`);
      return lines.join('\n');
    }

    const sorted = [...pool].sort((a, b) => {
      const aa = parseInt(String(a.appearances ?? a.caps ?? 0), 10) || 0;
      const bb = parseInt(String(b.appearances ?? b.caps ?? 0), 10) || 0;
      return bb - aa;
    });
    const top9 = sorted.slice(0, 9);
    const subKeys = new Set(top9.map((p) => this.playerKey(p)));
    const benchFmt = top9.map((p) => this.formatBenchShort(p, false));
    lines.push(`预测替补：${benchFmt.join('，')}`);
    lines.push(`伤疑：${doubtFmt.length ? doubtFmt.join('，') : '（无）'}`);
    lines.push(`伤停：${injFmt.length ? injFmt.join('，') : '（无）'}`);

    const dropped = players.filter((p) => {
      const k = this.playerKey(p);
      return !starterKeys.has(k) && !subKeys.has(k) && !injKeys.has(k) && !doubtKeys.has(k);
    });
    const dropFmt = dropped.map((p) => this.profileGen.formatInjuryDoubtfulDisplayLine(p, false));
    lines.push(`落选：${dropFmt.length ? dropFmt.join('，') : '（无）'}`);
    return lines.join('\n');
  }

  /**
   * @param {string|number} homeSerial
   * @param {string|number} awaySerial
   */
  runPair(homeSerial, awaySerial) {
    const scheduleData = this.parseScheduleData();
    if (!scheduleData) {
      this.error('无法读取赛程数据');
      return null;
    }
    const teamMap = this.buildTeamMap(scheduleData.arrTeam);
    const hid = Number(homeSerial);
    const aid = Number(awaySerial);
    const home = teamMap[hid];
    const away = teamMap[aid];
    if (!home) {
      this.error(`未找到主队序号 ${hid}`);
      return null;
    }
    if (!away) {
      this.error(`未找到客队序号 ${aid}`);
      return null;
    }
    const out = [];
    out.push(this.buildTeamBlock(home, scheduleData));
    out.push('');
    out.push(this.buildTeamBlock(away, scheduleData));
    return out.join('\n');
  }
}

function printUsage() {
  console.log(`
赛中大名单（squad-final → 预测首发/替补/伤疑/伤停/落选）

用法:
  CUP_ANALYZER_CUP=epl node processors/matchSquadGenerator.js --home <序号> --away <序号>

选项:
  --home <序号>   主队球探序号
  --away <序号>   客队球探序号
  --help, -h      显示本说明

示例:
  CUP_ANALYZER_CUP=epl node processors/matchSquadGenerator.js --home 19 --away 25
  CUP_ANALYZER_CUP=theWorldCup node processors/matchSquadGenerator.js --home 744 --away 640
`);
}

function parseCliArgs(argv) {
  const out = { home: null, away: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      out.help = true;
      return out;
    }
    if (a === '--home' && argv[i + 1]) {
      out.home = argv[++i];
      continue;
    }
    if (a === '--away' && argv[i + 1]) {
      out.away = argv[++i];
      continue;
    }
    if (a.startsWith('--home=')) out.home = a.slice('--home='.length).trim();
    if (a.startsWith('--away=')) out.away = a.slice('--away='.length).trim();
  }
  return out;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const opts = parseCliArgs(argv);
  if (opts.help) {
    printUsage();
    process.exit(0);
  }
  if (!opts.home || !opts.away) {
    console.error('请提供 --home 与 --away 球队序号。\n');
    printUsage();
    process.exit(1);
  }
  const gen = new MatchSquadGenerator();
  const text = gen.runPair(opts.home, opts.away);
  if (text) console.log(text);
  else process.exit(1);
}

module.exports = MatchSquadGenerator;
