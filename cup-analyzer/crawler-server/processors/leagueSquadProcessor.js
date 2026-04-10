const path = require('path');
const BaseCrawler = require('../crawlers/base');
const config = require('../config');
const squadTarget = require('../config/squadTarget');
const { readJSON, saveMarkdown, fileExists } = require('../utils/fileWriter');

/**
 * 联赛大名单 Markdown：从 clubMatchAnalyzer 输出的 *-new.json 生成 squad/{队名}.md（平铺）
 *
 * 前置：已运行 playerListCrawler、clubMatchAnalyzer，且 squadTarget 指向当前球队。
 * CLI: CUP_ANALYZER_CUP=epl node processors/leagueSquadProcessor.js
 */

const POS_TO_LINE = {
  GK: 'GK',
  CB: 'DF',
  LB: 'DF',
  RB: 'DF',
  LCB: 'DF',
  RCB: 'DF',
  LWB: 'DF',
  RWB: 'DF',
  CDM: 'MF',
  CM: 'MF',
  CAM: 'MF',
  LDM: 'MF',
  RDM: 'MF',
  LCM: 'MF',
  RCM: 'MF',
  LM: 'MF',
  RM: 'MF',
  LAM: 'MF',
  RAM: 'MF',
  ST: 'FW',
  CF: 'FW',
  LW: 'FW',
  RW: 'FW',
};

const LINE_LABEL = { GK: '门将', DF: '后卫', MF: '中场', FW: '前锋' };

function formationDisplay(raw) {
  const s = String(raw || '').replace(/[^0-9]/g, '');
  if (!s) return '-';
  return s.split('').join('-');
}

function lineGroupFromPlayer(p) {
  if (!p.positions || typeof p.positions !== 'object') return 'MF';
  const entries = Object.entries(p.positions).filter(
    ([k]) => k && k !== 'Substitute' && k !== 'Unknown'
  );
  if (entries.length === 0) return 'MF';
  entries.sort((a, b) => b[1] - a[1]);
  const mainPos = entries[0][0];
  return POS_TO_LINE[mainPos] || 'MF';
}

function formatMarketValue(socialStatus) {
  if (socialStatus == null || socialStatus === '') return '-';
  const n = Number(socialStatus);
  if (Number.isNaN(n)) return String(socialStatus);
  return String(n);
}

class LeagueSquadProcessor extends BaseCrawler {
  constructor() {
    super('LeagueSquadProcessor');
  }

  /**
   * @param {object} data -new.json 根对象
   * @returns {string[][]} 表格行 [jersey, name, age, height, pos, value, nation, caps, lineups, goals, assists]
   */
  buildTableRows(data) {
    const players = data.players;
    if (!players || typeof players !== 'object') return [];
    const list = Object.values(players);
    const rows = [];
    for (const p of list) {
      const line = lineGroupFromPlayer(p);
      const posKeys = p.positions && typeof p.positions === 'object'
        ? Object.entries(p.positions)
            .filter(([k]) => k !== 'Substitute' && k !== 'Unknown')
            .sort((a, b) => b[1] - a[1])
        : [];
      const posDisplay = posKeys.length > 0 ? posKeys[0][0] : p.qiutanPosition || '-';
      rows.push({
        line,
        cells: [
          p.number != null ? String(p.number) : '-',
          p.name || '-',
          p.age != null ? String(p.age) : '-',
          p.height != null ? `${p.height}cm` : '-',
          posDisplay,
          formatMarketValue(p.socialStatus),
          p.nation || '-',
          p.caps != null ? String(p.caps) : '-',
          p.lineups != null ? String(p.lineups) : '-',
          p.goals != null ? String(p.goals) : '0',
          p.assists != null ? String(p.assists) : '0',
        ],
      });
    }
    rows.sort((a, b) => {
      const order = { GK: 0, DF: 1, MF: 2, FW: 3 };
      const la = order[a.line] ?? 2;
      const lb = order[b.line] ?? 2;
      if (la !== lb) return la - lb;
      return parseInt(b.cells[8], 10) - parseInt(a.cells[8], 10);
    });
    return rows;
  }

  generateMarkdown(teamInfo, data) {
    const cn = teamInfo.chineseName;
    const en = teamInfo.englishName || '';
    const serial = data.teamId || squadTarget.teamSerial;
    const season = squadTarget.season || config.season || '';
    const round = squadTarget.roundSerial || '';
    const formation = formationDisplay(data.mostUsedFormation || '');
    const rows = this.buildTableRows(data);

    const byLine = { GK: [], DF: [], MF: [], FW: [] };
    for (const r of rows) {
      if (byLine[r.line]) byLine[r.line].push(r.cells);
    }

    const lines = [];
    lines.push(`# ${cn}（${en}）赛季大名单\n`);
    lines.push(`> 球队ID: ${serial} | 数据来源: titan007 + clubMatchAnalyzer`);
    lines.push(`> 赛季: ${season} | 截至第 ${round} 轮`);
    if (data.analysisDate) {
      lines.push(`> 分析时间: ${data.analysisDate}`);
    }
    lines.push('');
    lines.push('- **主教练**: （请结合球队资料补充）');
    lines.push(`- **阵型**: ${formation}`);
    lines.push('');

    const header =
      '| 球衣号 | 姓名 | 年龄 | 身高 | 位置 | 身价(万) | 国籍 | 出场 | 首发 | 进球 | 助攻 |';
    const sep =
      '|--------|------|------|------|------|----------|------|------|------|------|------|';

    for (const key of ['GK', 'DF', 'MF', 'FW']) {
      const groupRows = byLine[key];
      if (groupRows.length === 0) continue;
      lines.push(`## ${LINE_LABEL[key]}（${groupRows.length}人）\n`);
      lines.push(header);
      lines.push(sep);
      for (const c of groupRows) {
        lines.push(`| ${c.join(' | ')} |`);
      }
      lines.push('');
    }

    const rec = Array.isArray(data.recommendedLineup) ? data.recommendedLineup : [];
    const recNames = rec.map((p) => p.name).filter(Boolean);
    lines.push(`## 推荐首发（${formation}）\n`);
    lines.push(recNames.length > 0 ? recNames.join('、') : '（无推荐数据）');
    lines.push('');

    const ages = rows
      .map((r) => parseInt(r.cells[2], 10))
      .filter((n) => !Number.isNaN(n));
    const heights = rows
      .map((r) => parseInt(String(r.cells[3]).replace(/cm/gi, ''), 10))
      .filter((n) => !Number.isNaN(n));
    const avgAge = ages.length
      ? (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1)
      : '-';
    const avgH = heights.length
      ? (heights.reduce((a, b) => a + b, 0) / heights.length).toFixed(1)
      : '-';

    lines.push('## 统计摘要\n');
    lines.push(`- **总人数**: ${rows.length}`);
    lines.push(`- **平均年龄**: ${avgAge}岁`);
    lines.push(`- **平均身高**: ${avgH}cm`);
    lines.push(
      `- **位置分布**: 门将${byLine.GK.length} / 后卫${byLine.DF.length} / 中场${byLine.MF.length} / 前锋${byLine.FW.length}`
    );

    return lines.join('\n');
  }

  async processOne() {
    const serial = Number(squadTarget.teamSerial);
    if (Number.isNaN(serial)) {
      this.error('squadTarget.teamSerial 无效');
      return null;
    }

    const newPath = path.join(config.paths.playerCenter, `${serial}-new.json`);
    if (!fileExists(newPath)) {
      this.error(`缺少分析文件: ${newPath}，请先运行 npm run analyze:club-domestic`);
      return null;
    }

    const scheduleData = this.parseScheduleData();
    if (!scheduleData) {
      this.error('无法读取赛程数据');
      return null;
    }

    const teamMap = this.buildTeamMap(scheduleData.arrTeam);
    const teamInfo = teamMap[serial];
    if (!teamInfo) {
      this.error(`球队序号 ${serial} 不在当前赛程 arrTeam 中`);
      return null;
    }

    const data = readJSON(newPath);
    if (!data || !data.players) {
      this.error(`${newPath} 格式无效`);
      return null;
    }

    const md = this.generateMarkdown(teamInfo, data);
    const outDir = path.join(config.paths.cupAnalyzer, 'squad');
    const outPath = path.join(outDir, `${teamInfo.chineseName}.md`);
    saveMarkdown(outPath, md);
    this.log(`已写入: ${outPath}`);
    return { outPath, teamInfo };
  }
}

function printUsage() {
  console.log(`
联赛大名单 Markdown（*-new.json → cup-analyzer/.../squad/{队名}.md）

用法:
  1. 编辑 config/squadTarget.js（teamSerial、leagueSerial、roundSerial 等）
  2. npm run crawl:player-list
  3. npm run analyze:club-domestic
  4. CUP_ANALYZER_CUP=epl node processors/leagueSquadProcessor.js

选项:
  --help, -h   显示本说明
`);
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();
    process.exit(0);
  }
  const p = new LeagueSquadProcessor();
  p.processOne().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = LeagueSquadProcessor;
