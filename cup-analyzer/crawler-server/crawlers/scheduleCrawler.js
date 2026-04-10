const path = require('path');
const fs = require('fs');
const BaseCrawler = require('./base');
const targets = require('../config/targets');
const config = require('../config');
const { sleep } = require('../utils/fileWriter');

/**
 * 赛程更新爬虫 - 更新世界杯赛程和比分数据
 *
 * 数据来源: titan007 赛程数据 JS 文件
 * 输出: 更新当前激活赛事的 cupScheduleData（杯赛如 c75/c103，联赛如 s36/s15_313，见 config.fileId）
 * 同步更新：亚盘盘路 l{序号}.js、大小球 bs{序号}.js；联赛另更新入球时间 td{序号}.js（杯赛不更新 td）
 * 赛程主文件另拷贝至 match_center/{s|c}{序号}.js，与 clubMatchAnalyzer 兜底路径一致
 */
class ScheduleCrawler extends BaseCrawler {
  constructor() {
    super('ScheduleCrawler');
  }

  /**
   * 备份并写入单个 JS 文件
   * @param {string} outputPath
   * @param {string} text
   */
  writeJsWithBackup(outputPath, text) {
    if (fs.existsSync(outputPath)) {
      const backupPath = outputPath.replace('.js', `.backup_${Date.now()}.js`);
      fs.copyFileSync(outputPath, backupPath);
      this.log(`已备份旧文件: ${backupPath}`);
    }
    fs.writeFileSync(outputPath, text, 'utf-8');
  }

  /**
   * 从 titan007 获取最新赛程数据并更新 cupScheduleData；联赛/杯赛同时拉取 l、bs；仅联赛拉取 td
   */
  async updateSchedule() {
    const referer =
      config.type === 'league'
        ? targets.titan007.leagueMatchReferer(config.cupSerial, config.season)
        : targets.titan007.cupMatchReferer(config.cupSerial);
    const headers = {
      ...targets.titan007.headers.desktop,
      Referer: referer,
    };

    const schedulePath = config.paths.cupScheduleData || config.paths.c75Data;
    const dataDir = path.dirname(schedulePath);
    const serial = config.cupSerial;

    /** @type {{ label: string, url: string, outputPath: string }[]} */
    const steps = [
      {
        label: '赛程',
        url: targets.titan007.scheduleUrl(config.fileId, config.season),
        outputPath: schedulePath,
      },
      {
        label: '亚盘盘路',
        url: targets.titan007.matchResultDataUrl(`l${serial}`, config.season),
        outputPath: path.join(dataDir, `l${serial}.js`),
      },
      {
        label: '大小球盘路',
        url: targets.titan007.matchResultDataUrl(`bs${serial}`, config.season),
        outputPath: path.join(dataDir, `bs${serial}.js`),
      },
    ];

    if (config.type === 'league') {
      steps.push({
        label: '入球时间',
        url: targets.titan007.matchResultDataUrl(`td${serial}`, config.season),
        outputPath: path.join(dataDir, `td${serial}.js`),
      });
    }

    const results = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (i > 0) {
        await sleep(this.delayMs);
      }
      try {
        this.log(`更新${step.label}: ${step.url}`);
        const text = await this.fetchText(step.url, headers);
        this.writeJsWithBackup(step.outputPath, text);
        this.log(`${step.label}已更新: ${step.outputPath}`);
        // 赛程文件同步到 match_center（与 clubMatchAnalyzer 兜底路径一致；l/bs/td 不同步）
        if (step.label === '赛程') {
          const mcPrefix = config.fileId.startsWith('c') ? 'c' : 's';
          const matchCenterDest = path.join(config.paths.matchCenterDir, `${mcPrefix}${serial}.js`);
          fs.copyFileSync(step.outputPath, matchCenterDest);
          this.log(`已同步到 match_center: ${matchCenterDest}`);
        }
        results.push({ ok: true, label: step.label, outputPath: step.outputPath });
      } catch (err) {
        this.error(`${step.label}更新失败: ${err.message}`);
        results.push({ ok: false, label: step.label, error: err.message });
        // 赛程失败则不再请求后续文件
        if (step.label === '赛程') {
          return { success: false, error: err.message, results };
        }
      }
    }

    const success = results.every((r) => r.ok);
    return { success, results };
  }

  /**
   * 获取当前小组积分榜
   */
  async getGroupStandings() {
    const scheduleData = this.parseScheduleData();
    if (!scheduleData) {
      this.error('无法读取赛程数据');
      return null;
    }

    const teamMap = this.buildTeamMap(scheduleData.arrTeam);
    const groupMap = this.buildGroupMap(scheduleData);
    const standings = {};

    for (const [letter, group] of Object.entries(groupMap)) {
      const standingKey = `S27970${letter}`;
      const rawStandings = scheduleData.rounds[standingKey];
      if (!rawStandings) continue;

      standings[letter] = rawStandings.map((row) => {
        const team = teamMap[row[1]] || {};
        return {
          rank: row[0],
          teamId: row[1],
          teamName: team.chineseName || String(row[1]),
          englishName: team.englishName || '',
          played: row[2] || 0,
          won: row[3] || 0,
          drawn: row[4] || 0,
          lost: row[5] || 0,
          goalsFor: row[6] || 0,
          goalsAgainst: row[7] || 0,
          goalDiff: row[8] || 0,
          points: row[9] || 0,
        };
      });
    }

    return standings;
  }
}

// CLI 模式
if (require.main === module) {
  const args = process.argv.slice(2);
  const crawler = new ScheduleCrawler();

  if (args[0] === '--standings') {
    crawler.getGroupStandings().then((s) => console.log(JSON.stringify(s, null, 2))).catch(console.error);
  } else {
    crawler.updateSchedule().catch(console.error);
  }
}

module.exports = ScheduleCrawler;
