const path = require('path');
const BaseCrawler = require('../crawlers/base');
const config = require('../config');
const { readJSON, readFile, saveMarkdown, fileExists } = require('../utils/fileWriter');

/**
 * 球队画像生成器 - 从大名单数据自动分析球队特征
 *
 * 分析维度：年龄结构、身高分析、身价分析、位置深度、打法推断、球队目标
 * 输入: output/player_center/{teamSerial}.json + c75.js + 冠军赔率.md
 * 输出: cup-analyzer/theWorldCup/teamProfile/{队名}.md
 */
class TeamProfileGenerator extends BaseCrawler {
  constructor() {
    super('TeamProfileGenerator');
    this.championOdds = this.loadChampionOdds();
  }

  /**
   * 加载冠军赔率数据
   */
  loadChampionOdds() {
    const oddsPath = path.join(config.paths.cupAnalyzer, 'data', '冠军赔率.md');
    const content = readFile(oddsPath);
    if (!content) return {};

    const odds = {};
    content.split('\n').forEach((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2 && !isNaN(parseFloat(parts[parts.length - 1]))) {
        const teamName = parts.slice(0, -1).join('');
        odds[teamName] = parseFloat(parts[parts.length - 1]);
      }
    });
    return odds;
  }

  /**
   * 分析年龄结构
   */
  analyzeAge(players) {
    const ages = players.filter((p) => p.age).map((p) => p.age);
    if (ages.length === 0) return { avg: 0, min: 0, max: 0, young: 0, prime: 0, veteran: 0 };

    const avg = (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1);
    const young = ages.filter((a) => a <= 23).length;
    const prime = ages.filter((a) => a >= 24 && a <= 29).length;
    const veteran = ages.filter((a) => a >= 30).length;

    return {
      avg: parseFloat(avg),
      min: Math.min(...ages),
      max: Math.max(...ages),
      young,
      prime,
      veteran,
      distribution: { '≤23岁': young, '24-29岁': prime, '≥30岁': veteran },
    };
  }

  /**
   * 分析身高
   */
  analyzeHeight(players) {
    const heights = players.filter((p) => p.height && p.height > 0).map((p) => p.height);
    if (heights.length === 0) return { avg: 0, tallCount: 0 };

    return {
      avg: parseFloat((heights.reduce((a, b) => a + b, 0) / heights.length).toFixed(1)),
      min: Math.min(...heights),
      max: Math.max(...heights),
      tallCount: heights.filter((h) => h >= 185).length,
      shortCount: heights.filter((h) => h < 175).length,
    };
  }

  /**
   * 分析身价
   */
  analyzeMarketValue(players) {
    const values = players
      .map((p) => {
        if (!p.marketValue) return 0;
        const str = String(p.marketValue).replace(/,/g, '');
        const match = str.match(/([\d.]+)/);
        if (!match) return 0;
        const num = parseFloat(match[1]);
        if (str.includes('亿')) return num * 10000;
        return num;
      })
      .filter((v) => v > 0);

    if (values.length === 0) return { total: 0, avg: 0, top5: [] };

    const sorted = [...values].sort((a, b) => b - a);
    const total = values.reduce((a, b) => a + b, 0);

    const top5Players = players
      .map((p) => {
        let val = 0;
        if (p.marketValue) {
          const str = String(p.marketValue).replace(/,/g, '');
          const match = str.match(/([\d.]+)/);
          if (match) {
            val = parseFloat(match[1]);
            if (str.includes('亿')) val *= 10000;
          }
        }
        return { name: p.name, value: val, position: p.position };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      total: Math.round(total),
      avg: Math.round(total / values.length),
      max: sorted[0],
      top5: top5Players,
    };
  }

  /**
   * 分析位置深度
   */
  analyzePositionDepth(players) {
    const depth = { GK: [], DF: [], MF: [], FW: [] };
    players.forEach((p) => {
      const group = depth[p.positionGroup] || depth.MF;
      group.push(p.name);
    });

    const warnings = [];
    if (depth.GK.length < 2) warnings.push('门将深度不足');
    if (depth.DF.length < 6) warnings.push('后卫深度偏薄');
    if (depth.MF.length < 6) warnings.push('中场深度偏薄');
    if (depth.FW.length < 4) warnings.push('前锋深度偏薄');

    return {
      GK: depth.GK.length,
      DF: depth.DF.length,
      MF: depth.MF.length,
      FW: depth.FW.length,
      warnings,
    };
  }

  /**
   * 推断打法风格
   */
  inferTacticalStyle(players, ageAnalysis, heightAnalysis, valueAnalysis) {
    const styles = [];

    if (heightAnalysis.avg >= 182 && heightAnalysis.tallCount >= 8) {
      styles.push('身体对抗型，定位球有空中优势');
    }
    if (heightAnalysis.avg < 178) {
      styles.push('技术型，地面配合为主');
    }
    if (ageAnalysis.avg >= 28) {
      styles.push('经验丰富，比赛阅读能力强，体能可能是隐患');
    }
    if (ageAnalysis.avg <= 25) {
      styles.push('年轻有冲劲，体能充沛，但经验不足');
    }
    if (ageAnalysis.prime >= 15) {
      styles.push('当打之年球员占主体，整体实力最强区间');
    }

    const fwCount = players.filter((p) => p.positionGroup === 'FW').length;
    const mfCount = players.filter((p) => p.positionGroup === 'MF').length;
    if (fwCount >= 8) styles.push('进攻配置充足，可能偏重攻势足球');
    if (mfCount >= 10) styles.push('中场配置厚实，可能偏重控球体系');

    return styles.length > 0 ? styles : ['需要更多比赛数据确认打法'];
  }

  /**
   * 推断球队目标
   */
  inferTeamGoal(teamName, valueAnalysis) {
    const odds = this.championOdds[teamName];
    let oddsGoal = '小组出线';

    if (odds) {
      if (odds <= 10) oddsGoal = '夺冠热门';
      else if (odds <= 20) oddsGoal = '四强候选';
      else if (odds <= 40) oddsGoal = '八强目标';
      else if (odds <= 80) oddsGoal = '小组出线';
      else oddsGoal = '陪跑/黑马';
    }

    let valueGoal = '小组出线';
    if (valueAnalysis.total >= 80000) valueGoal = '夺冠热门';
    else if (valueAnalysis.total >= 50000) valueGoal = '四强候选';
    else if (valueAnalysis.total >= 25000) valueGoal = '八强目标';
    else if (valueAnalysis.total >= 10000) valueGoal = '小组出线';
    else valueGoal = '陪跑/黑马';

    return { oddsGoal, valueGoal, odds: odds || '未知' };
  }

  /**
   * 生成单个球队画像 Markdown
   */
  generateProfileMarkdown(teamInfo, players) {
    const ageAnalysis = this.analyzeAge(players);
    const heightAnalysis = this.analyzeHeight(players);
    const valueAnalysis = this.analyzeMarketValue(players);
    const positionDepth = this.analyzePositionDepth(players);
    const tacticalStyle = this.inferTacticalStyle(players, ageAnalysis, heightAnalysis, valueAnalysis);
    const teamGoal = this.inferTeamGoal(teamInfo.chineseName, valueAnalysis);

    const lines = [];
    lines.push(`# ${teamInfo.chineseName}（${teamInfo.englishName}）球队画像\n`);
    lines.push(`> 自动生成 | 基于26人大名单数据分析\n`);

    // 球队目标
    lines.push(`## 一、球队定位\n`);
    lines.push(`- **冠军赔率**: ${teamGoal.odds}`);
    lines.push(`- **赔率定位**: ${teamGoal.oddsGoal}`);
    lines.push(`- **身价定位**: ${teamGoal.valueGoal}`);
    lines.push(`- **综合目标**: ${teamGoal.oddsGoal}\n`);

    // 年龄结构
    lines.push(`## 二、年龄结构\n`);
    lines.push(`- **平均年龄**: ${ageAnalysis.avg}岁`);
    lines.push(`- **年龄范围**: ${ageAnalysis.min} - ${ageAnalysis.max}岁`);
    lines.push(`- **年轻球员(≤23岁)**: ${ageAnalysis.young}人`);
    lines.push(`- **当打之年(24-29岁)**: ${ageAnalysis.prime}人`);
    lines.push(`- **老将(≥30岁)**: ${ageAnalysis.veteran}人`);
    if (ageAnalysis.avg >= 28) lines.push(`- **⚠️ 平均年龄偏大，体能和连续作战能力需关注**`);
    if (ageAnalysis.young >= 10) lines.push(`- **⚠️ 年轻球员多，大赛经验可能不足**`);
    lines.push('');

    // 身高分析
    lines.push(`## 三、身高分析\n`);
    lines.push(`- **平均身高**: ${heightAnalysis.avg}cm`);
    lines.push(`- **身高范围**: ${heightAnalysis.min} - ${heightAnalysis.max}cm`);
    lines.push(`- **高点(≥185cm)**: ${heightAnalysis.tallCount}人`);
    lines.push(`- **矮个(< 175cm)**: ${heightAnalysis.shortCount}人`);
    if (heightAnalysis.tallCount >= 8) lines.push(`- **定位球空中优势明显**`);
    if (heightAnalysis.avg < 178) lines.push(`- **球队偏矮，定位球防守需注意**`);
    lines.push('');

    // 身价分析
    lines.push(`## 四、身价分析\n`);
    lines.push(`- **总身价**: ${valueAnalysis.total}万`);
    lines.push(`- **平均身价**: ${valueAnalysis.avg}万`);
    lines.push(`- **最高身价**: ${valueAnalysis.max}万`);
    lines.push(`\n**身价TOP 5**:\n`);
    lines.push('| 排名 | 球员 | 位置 | 身价(万) |');
    lines.push('|------|------|------|----------|');
    valueAnalysis.top5.forEach((p, i) => {
      lines.push(`| ${i + 1} | ${p.name} | ${p.position || '-'} | ${p.value} |`);
    });
    lines.push('');

    // 位置深度
    lines.push(`## 五、位置深度\n`);
    lines.push(`- **门将**: ${positionDepth.GK}人`);
    lines.push(`- **后卫**: ${positionDepth.DF}人`);
    lines.push(`- **中场**: ${positionDepth.MF}人`);
    lines.push(`- **前锋**: ${positionDepth.FW}人`);
    if (positionDepth.warnings.length > 0) {
      lines.push(`\n**⚠️ 警告**:`);
      positionDepth.warnings.forEach((w) => lines.push(`- ${w}`));
    }
    lines.push('');

    // 打法推断
    lines.push(`## 六、打法推断\n`);
    tacticalStyle.forEach((s) => lines.push(`- ${s}`));
    lines.push('');

    // AI分析备注
    lines.push(`## 七、AI分析备注\n`);
    lines.push(`> 以上为基于大名单数据的自动分析，实际打法需结合：`);
    lines.push(`> 1. 主教练战术偏好`);
    lines.push(`> 2. 预选赛/友谊赛的阵型和比赛方式`);
    lines.push(`> 3. 核心球员的俱乐部赛季表现`);
    lines.push(`> 4. 球队历史大赛表现`);

    return lines.join('\n');
  }

  /**
   * 获取单个球队画像
   */
  async getProfile(teamName) {
    const profilePath = path.join(config.paths.cupAnalyzer, 'teamProfile', `${teamName}.md`);
    if (fileExists(profilePath)) {
      return readFile(profilePath);
    }
    return null;
  }

  /**
   * 批量生成所有球队画像
   */
  async generateAll() {
    const scheduleData = this.parseScheduleData();
    if (!scheduleData) {
      this.error('无法读取赛程数据');
      return null;
    }

    const teamMap = this.buildTeamMap(scheduleData.arrTeam);
    const realTeams = Object.values(teamMap).filter((t) => t.id < 36185);
    const results = { success: [], noData: [], failed: [] };

    for (const team of realTeams) {
      const jsonPath = path.join(config.paths.playerCenter, `${team.id}.json`);
      if (!fileExists(jsonPath)) {
        results.noData.push(team.chineseName);
        continue;
      }

      try {
        const players = readJSON(jsonPath);
        const md = this.generateProfileMarkdown(team, players);
        const mdPath = path.join(config.paths.cupAnalyzer, 'teamProfile', `${team.chineseName}.md`);
        saveMarkdown(mdPath, md);
        results.success.push(team.chineseName);
      } catch (err) {
        this.error(`${team.chineseName} 画像生成失败: ${err.message}`);
        results.failed.push(team.chineseName);
      }
    }

    this.log(`\n画像生成完成: 成功${results.success.length} 无数据${results.noData.length} 失败${results.failed.length}`);
    return results;
  }
}

// CLI 模式
if (require.main === module) {
  const generator = new TeamProfileGenerator();
  generator.generateAll().catch(console.error);
}

module.exports = TeamProfileGenerator;
