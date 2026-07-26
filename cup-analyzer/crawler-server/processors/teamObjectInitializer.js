const path = require('path');
const BaseCrawler = require('../crawlers/base');
const config = require('../config');
const { clubFootballRoot } = require('../domain/teamPaths');
const { getTeamObject } = require('../config/teamObjects');
const { saveJSON, fileExists } = require('../utils/fileWriter');

function slugifyEnglishName(englishName) {
  const slug = String(englishName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) throw new Error(`无法从英文队名生成 slug: ${englishName}`);
  return slug;
}

class TeamObjectInitializer extends BaseCrawler {
  constructor() {
    super('TeamObjectInitializer');
  }

  initializeCompetitionTeams() {
    if (config.activeCupKey === 'theWorldCup') {
      throw new Error('国家队对象不得写入 club-football，请使用现有世界杯工作流');
    }
    const scheduleData = this.parseScheduleData();
    if (!scheduleData) throw new Error('无法读取赛程数据');

    const results = { created: [], existing: [], deep: [] };
    for (const team of this.getAllTeams(scheduleData)) {
      const deepObject = getTeamObject(team.id);
      if (deepObject && deepObject.deep) {
        results.deep.push(team.id);
        continue;
      }
      const slug = slugifyEnglishName(team.englishName);
      const outputPath = path.join(clubFootballRoot, 'teams', slug, 'team.json');
      if (fileExists(outputPath)) {
        results.existing.push(team.id);
        continue;
      }
      saveJSON(outputPath, {
        schemaVersion: 1,
        objectType: 'club-team',
        id: slug,
        names: {
          zhHans: team.chineseName,
          en: team.englishName,
        },
        externalIds: {
          titan007: team.id,
        },
        analysisLevel: 'identity',
      });
      results.created.push(team.id);
    }
    return results;
  }
}

if (require.main === module) {
  try {
    const results = new TeamObjectInitializer().initializeCompetitionTeams();
    console.log(
      `球队身份对象初始化完成: 新建${results.created.length} 已存在${results.existing.length} 深度对象${results.deep.length}`
    );
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}

module.exports = { TeamObjectInitializer, slugifyEnglishName };
