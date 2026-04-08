const path = require('path');
const fs = require('fs');
const BaseCrawler = require('./base');
const targets = require('../config/targets');
const config = require('../config');
const { saveJSON, fileExists } = require('../utils/fileWriter');
const { enrichPlayers } = require('../utils/playerDetailEnricher');

/**
 * 大名单爬虫 - 批量爬取世界杯48队26人名单
 * 复用 backend-server/crawlerPlayer.js 的解析逻辑，适配国家队
 *
 * 数据来源: titan007 teamDetail API
 * 输出: output/player_center/{teamSerial}.json
 *
 * CLI:
 *   node crawlers/squadCrawler.js                    # 批量（世界杯赛程 c75 中的队）
 *   node crawlers/squadCrawler.js --team <球队序号>   # 只爬一队，如 --team 772
 *   node crawlers/squadCrawler.js -t 772               # 同上
 *   node crawlers/squadCrawler.js --help               # 帮助
 */
class SquadCrawler extends BaseCrawler {
  constructor() {
    super('SquadCrawler');
    /** 是否抓取球员俱乐部与转会（单队默认 true，批量默认 false，可由 CLI 覆盖） */
    this.withClub = false;
  }

  /**
   * 从 titan007 球员数据中解析大名单
   * 变量由 eval 注入: rearguard(后卫), vanguard(前锋), goalkeeper(门将), midfielder(中场), lineupDetail(详细信息)
   */
  parsePlayerData(sandbox) {
    const { rearguard = [], vanguard = [], goalkeeper = [], midfielder = [], lineupDetail = [] } = sandbox;

    const players = [];
    const nameIndexMap = {};

    const addPlayers = (list, posGroup) => {
      list.forEach((item) => {
        players.push({
          number: Number(item[1]),
          name: item[2],
          positionGroup: posGroup,
        });
      });
    };

    addPlayers(goalkeeper, 'GK');
    addPlayers(rearguard, 'DF');
    addPlayers(midfielder, 'MF');
    addPlayers(vanguard, 'FW');

    players.forEach((p, i) => {
      nameIndexMap[p.name] = i;
    });

    for (const detail of lineupDetail) {
      if (detail[8] === '主教练') continue;

      const name = (detail[2] || '').trim();
      const idx = nameIndexMap[name];
      if (idx === undefined) continue;

      const birthYear = (detail[5] || '').trim().split('-')[0];
      players[idx].age = birthYear ? new Date().getFullYear() - Number(birthYear) : null;
      players[idx].height = Number(detail[6]) || null;
      players[idx].weight = Number(detail[7]) || null;
      players[idx].position = (detail[8] || '').trim();
      players[idx].nationality = (detail[9] || '').trim();
      players[idx].marketValue = (detail[11] || '').trim();
      players[idx].birthDate = (detail[5] || '').trim();
    }

    return players;
  }

  /**
   * 爬取单个球队大名单
   */
  async crawlTeam(teamSerial, opts = {}) {
    const useClub = opts.withClub !== undefined ? opts.withClub : this.withClub;
    const url = targets.titan007.teamDetailUrl(teamSerial);
    this.log(`爬取球队 ${teamSerial}: ${url}`);

    const sandbox = await this.fetchJsData(url, targets.titan007.headers.desktop);
    if (!sandbox) {
      this.error(`球队 ${teamSerial} 数据解析失败`);
      return null;
    }

    const players = this.parsePlayerData(sandbox);
    if (useClub) {
      this.log(`补充俱乐部与转会信息（${players.length} 人）…`);
      await enrichPlayers(teamSerial, players, {
        nameKey: 'name',
        delayMs: this.delayMs,
        logger: (msg) => this.log(msg),
        lineupDetail: sandbox.lineupDetail,
      });
    }
    const outputPath = path.join(config.paths.playerCenter, `${teamSerial}.json`);
    saveJSON(outputPath, players);

    this.log(`球队 ${teamSerial} 完成，共 ${players.length} 名球员`);
    return { teamSerial, playerCount: players.length, outputPath };
  }

  /**
   * 批量爬取48队大名单
   */
  async crawlAllTeams() {
    const scheduleData = this.parseScheduleData();
    if (!scheduleData) {
      this.error('无法读取赛程数据 c75.js');
      return null;
    }

    const teamMap = this.buildTeamMap(scheduleData.arrTeam);

    // 过滤出确定的参赛队（排除占位符球队：id >= 36185 的都是占位符）
    const realTeams = Object.values(teamMap).filter((t) => t.id < 36185);
    this.log(`共 ${realTeams.length} 支确定参赛队`);

    const results = { success: [], failed: [], skipped: [] };

    for (let i = 0; i < realTeams.length; i++) {
      const team = realTeams[i];
      const outputPath = path.join(config.paths.playerCenter, `${team.id}.json`);

      if (fileExists(outputPath)) {
        this.log(`[${i + 1}/${realTeams.length}] ${team.chineseName}(${team.id}) 已存在，跳过`);
        results.skipped.push(team);
        continue;
      }

      this.log(`[${i + 1}/${realTeams.length}] ${team.chineseName}(${team.id})`);

      try {
        const result = await this.crawlTeam(team.id, { withClub: this.withClub });
        if (result) {
          results.success.push({ ...team, playerCount: result.playerCount });
        } else {
          results.failed.push(team);
        }
      } catch (err) {
        this.error(`${team.chineseName}(${team.id}) 爬取失败: ${err.message}`);
        results.failed.push(team);
      }

      if (i < realTeams.length - 1) await this.delay();
    }

    this.log(`\n爬取完成: 成功${results.success.length} 跳过${results.skipped.length} 失败${results.failed.length}`);
    return results;
  }
}

function printSquadCrawlerUsage() {
  console.log(`
大名单爬虫（国家队 / teamDetail）

用法:
  node crawlers/squadCrawler.js [选项]

选项:
  （无参数）           按当前世界杯赛程数据批量爬取全部确定参赛队（跳过已存在的 json）
  --team <序号>        只爬取指定球探球队序号一队，输出 output/player_center/<序号>.json
  -t <序号>            同 --team
  --force              与 --team 合用：单队模式下忽略是否已存在文件，重新抓取
  --with-club          批量模式下也抓取每名球员的俱乐部与转会（请求量大，慎用）
  --no-club            单队模式下不抓取俱乐部/转会（默认单队会抓）
  --help, -h           显示本说明

示例:
  node crawlers/squadCrawler.js --team 772
  node crawlers/squadCrawler.js -t 19
  node crawlers/squadCrawler.js --team 744 --no-club
  node crawlers/squadCrawler.js --with-club
  npm run crawl:squad:one -- 772

球队序号见各杯赛 data/球队与序号对照表.md（世界杯 c75 对应队）。
`);
}

function parseSquadCliArgs(argv) {
  const out = { mode: 'all', teamSerial: null, force: false, withClubFlag: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      out.mode = 'help';
      return out;
    }
    if (a === '--with-club') {
      out.withClubFlag = true;
      continue;
    }
    if (a === '--no-club') {
      out.withClubFlag = false;
      continue;
    }
    if (a === '--force') {
      out.force = true;
      continue;
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
      continue;
    }
  }
  return out;
}

function resolveSquadWithClub(opts) {
  if (opts.withClubFlag === true) return true;
  if (opts.withClubFlag === false) return false;
  return opts.mode === 'one';
}

// CLI 模式
if (require.main === module) {
  const argv = process.argv.slice(2);
  const opts = parseSquadCliArgs(argv);
  const crawler = new SquadCrawler();
  crawler.withClub = resolveSquadWithClub(opts);

  if (opts.mode === 'help') {
    printSquadCrawlerUsage();
    process.exit(0);
  }

  if (opts.mode === 'missing_team') {
    console.error('错误: 请提供球队序号，例如: node crawlers/squadCrawler.js --team 772\n');
    printSquadCrawlerUsage();
    process.exit(1);
  }

  if (opts.mode === 'one' && opts.teamSerial) {
    const serial = opts.teamSerial;
    const outputPath = path.join(config.paths.playerCenter, `${serial}.json`);
    if (opts.force && fileExists(outputPath)) {
      try {
        fs.unlinkSync(outputPath);
        crawler.log(`已删除旧文件（--force）: ${outputPath}`);
      } catch (e) {
        crawler.error(`无法删除旧文件: ${e.message}`);
      }
    }
    crawler.crawlTeam(serial).catch(console.error);
  } else {
    crawler.crawlAllTeams().catch(console.error);
  }
}

module.exports = SquadCrawler;
