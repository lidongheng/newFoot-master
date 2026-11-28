const path = require('path');

/**
 * 多杯赛/联赛配置：通过环境变量 CUP_ANALYZER_CUP 切换
 * - theWorldCup（默认）
 * - europeanNationalLeague（欧国联，国家队杯赛，球探序号 1864，c1864.js）
 * - InternationalFriendship（国际友谊赛，国家队杯赛格式，1366，c1366.js）
 * - championsLeague
 * - afcChampionsLeagueTwo（亚冠联2，球探序号 350，c350.js）
 * - europaLeague（欧罗巴，球探序号 113，c113.js）
 * - uefaConferenceLeague（欧会杯，球探序号 2187，c2187.js）
 * - epl（英超，球探序号 36，联赛格式 s36.js）
 * - eredivisie（荷甲，球探序号 16，本地赛程 s16.js）
 * - eliteSerien（挪超，球探序号 22，单年赛季 s22.js）
 * - allsvenskan（瑞典超，球探序号 26，远程 s26_431.js，本地 s26.js）
 * - bundesliga（德甲，球探序号 8，联赛格式 s8.js）
 * - ligue1（法甲，球探序号 11，联赛格式 s11.js）
 * - laLiga（西甲，球探序号 31，联赛格式 s31.js）
 * - koreanKLeague（韩K联，s15_313，313 为 arrSubLeague 子联赛 ID）
 * - ChinaSuperLeague（中超，球探序号 60，单年赛季 s60_2187.js）
 * - aLeague（澳超，本地 s273.js，远程 s273_462.js）
 * - mls（美职联，s21_165，165 为 arrSubLeague 常规赛子联赛 ID）
 * - serieA（意甲，本地 s34.js，远程 s34_2948.js）
 * - ligaMx（墨西联，s140_44，44 为 arrSubLeague 子联赛 ID，赛程 Referer 用 SubLeague 页）
 *
 * 示例：npm run crawl:schedule:ucl（跨平台）；或 CUP_ANALYZER_CUP=championsLeague node crawlers/scheduleCrawler.js（Bash）
 */
const cups = {
  theWorldCup: {
    isNation: true,
    fileId: 'c75',
    type: 'cup',
    cupSerial: '75',
    cupName: 'theWorldCup',
    chineseName: '世界杯',
    crossYear: false,
    lineupMatchByName: false,
    season: '2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../theWorldCup'),
      squadFinal: path.resolve(__dirname, '../../theWorldCup/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../theWorldCup/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../theWorldCup/data/c75.js'),
    },
  },
  europeanNationalLeague: {
    fileId: 'c1864',
    type: 'cup',
    cupSerial: '1864',
    cupName: 'europeanNationalLeague',
    chineseName: '欧国联',
    isNation: true,
    // 欧国联有多个级别的同名小组，名单统一平铺，避免混用世界杯分组规则。
    flatSquad: true,
    lineupMatchByName: true,
    crossYear: true,
    season: '2026-2027',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../europeanNationalLeague'),
      squadFinal: path.resolve(__dirname, '../../europeanNationalLeague/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../europeanNationalLeague/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../europeanNationalLeague/data/c1864.js'),
    },
  },
  InternationalFriendship: {
    fileId: 'c1366',
    type: 'cup',
    cupSerial: '1366',
    cupName: 'InternationalFriendship',
    chineseName: '国际友谊',
    isNation: true,
    // 友谊赛按月份组织赛程，名单按球队平铺，不使用世界杯小组目录。
    flatSquad: true,
    lineupMatchByName: true,
    crossYear: false,
    season: '2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../InternationalFriendship'),
      squadFinal: path.resolve(__dirname, '../../InternationalFriendship/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../InternationalFriendship/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../InternationalFriendship/data/c1366.js'),
    },
  },
  championsLeague: {
    fileId: 'c103',
    type: 'cup',
    mainStageOnly: true,
    cupSerial: '103',
    cupName: 'championsLeague',
    chineseName: '欧冠',
    crossYear: true,
    season: '2026-2027',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../championsLeague'),
      squadFinal: path.resolve(__dirname, '../../championsLeague/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../championsLeague/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../championsLeague/data/c103.js'),
    },
  },
  afcChampionsLeague: {
    fileId: 'c192',
    type: 'cup',
    mainStageOnly: true,
    cupSerial: '192',
    cupName: 'afcChampionsLeague',
    chineseName: '亚冠精英',
    crossYear: true,
    // 球探远程赛季使用完整年份，本地报告目录使用 26-27。
    season: '2026-2027',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../afcChampionsLeague'),
      squadFinal: path.resolve(__dirname, '../../afcChampionsLeague/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../afcChampionsLeague/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../afcChampionsLeague/data/c192.js'),
    },
  },
  afcChampionsLeagueTwo: {
    fileId: 'c350',
    type: 'cup',
    mainStageOnly: true,
    cupSerial: '350',
    cupName: 'afcChampionsLeagueTwo',
    chineseName: '亚冠联2',
    crossYear: true,
    /**
     * 球探 URL 赛季段（matchResult / letGoal / bigSmall 同目录）。
     * 已核验2026-2027远程完整年份路径；本地报告目录使用26-27。
     */
    season: '2026-2027',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../afcChampionsLeagueTwo'),
      squadFinal: path.resolve(__dirname, '../../afcChampionsLeagueTwo/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../afcChampionsLeagueTwo/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../afcChampionsLeagueTwo/data/c350.js'),
    },
  },
  europaLeague: {
    fileId: 'c113',
    type: 'cup',
    mainStageOnly: true,
    cupSerial: '113',
    cupName: 'europaLeague',
    chineseName: '欧罗巴',
    crossYear: true,
    season: '2026-2027',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../europaLeague'),
      squadFinal: path.resolve(__dirname, '../../europaLeague/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../europaLeague/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../europaLeague/data/c113.js'),
    },
  },
  uefaConferenceLeague: {
    fileId: 'c2187',
    type: 'cup',
    mainStageOnly: true,
    cupSerial: '2187',
    cupName: 'uefaConferenceLeague',
    chineseName: '欧会杯',
    crossYear: true,
    season: '2026-2027',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../uefaConferenceLeague'),
      squadFinal: path.resolve(__dirname, '../../uefaConferenceLeague/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../uefaConferenceLeague/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../uefaConferenceLeague/data/c2187.js'),
    },
  },
  epl: {
    fileId: 's36',
    type: 'league',
    cupSerial: '36',
    cupName: 'epl',
    chineseName: '英超',
    crossYear: true,
    /**
     * 球探 URL 赛季段（与 s36 等路径一致；站点目录多为全写，勿与本地短赛季目录混用）
     */
    season: '2026-2027',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../epl'),
      squadFinal: path.resolve(__dirname, '../../epl/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../epl/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../epl/data/s36.js'),
    },
  },
  eflChampionship: {
    fileId: 's37_87',
    type: 'league',
    cupSerial: '37',
    cupName: 'eflChampionship',
    chineseName: '英冠',
    crossYear: true,
    // 球探 2026–2027 英冠常规联赛对应子联赛 87。
    subLeagueId: '87',
    // 英冠入球时间数据位于 timeDistri，非 matchResult。
    timeDistriData: true,
    /**
     * 球探 URL 赛季段（与 s37 等路径一致；站点目录多为全写，勿与本地短赛季目录混用）
     */
    season: '2026-2027',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../eflChampionship'),
      squadFinal: path.resolve(__dirname, '../../eflChampionship/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../eflChampionship/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../eflChampionship/data/s37.js'),
    },
  },
  allsvenskan: {
    fileId: 's26_431',
    type: 'league',
    cupSerial: '26',
    cupName: 'allsvenskan',
    chineseName: '瑞典超',
    crossYear: false,
    // 球探 2026 瑞典超页面的联赛阶段为 431。
    subLeagueId: '431',
    useSubLeagueReferer: true,
    season: '2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../allsvenskan'),
      squadFinal: path.resolve(__dirname, '../../allsvenskan/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../allsvenskan/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../allsvenskan/data/s26.js'),
    },
  },
  eliteSerien: {
    fileId: 's22',
    type: 'league',
    cupSerial: '22',
    cupName: 'eliteSerien',
    chineseName: '挪超',
    crossYear: false,
    season: '2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../eliteSerien'),
      squadFinal: path.resolve(__dirname, '../../eliteSerien/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../eliteSerien/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../eliteSerien/data/s22.js'),
    },
  },
  eredivisie: {
    fileId: 's16_98',
    type: 'league',
    cupSerial: '16',
    cupName: 'eredivisie',
    chineseName: '荷甲',
    crossYear: true,
    // 球探 2026-2027 荷甲联赛阶段对应子联赛 98。
    subLeagueId: '98',
    // 与 EPL 使用相同赛季，球探请求使用完整年份。
    season: '2026-2027',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../eredivisie'),
      squadFinal: path.resolve(__dirname, '../../eredivisie/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../eredivisie/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../eredivisie/data/s16.js'),
    },
  },
  jLeague: {
    fileId: 's25',
    type: 'league',
    cupSerial: '25',
    cupName: 'jLeague',
    chineseName: '日职联',
    // 抓取前须核对球探实际赛季目录及阶段，避免混用不同赛季数据。
    crossYear: false,
    season: '2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../jLeague'),
      squadFinal: path.resolve(__dirname, '../../jLeague/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../jLeague/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../jLeague/data/s25.js'),
    },
  },
  bundesliga: {
    fileId: 's8',
    type: 'league',
    cupSerial: '8',
    cupName: 'bundesliga',
    chineseName: '德甲',
    crossYear: true,
    // 与当前 EPL 模块使用相同赛季，球探请求使用完整年份。
    season: '2026-2027',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../bundesliga'),
      squadFinal: path.resolve(__dirname, '../../bundesliga/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../bundesliga/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../bundesliga/data/s8.js'),
    },
  },
  ligue1: {
    fileId: 's11',
    type: 'league',
    cupSerial: '11',
    cupName: 'ligue1',
    chineseName: '法甲',
    crossYear: true,
    season: '2026-2027',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../ligue1'),
      squadFinal: path.resolve(__dirname, '../../ligue1/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../ligue1/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../ligue1/data/s11.js'),
    },
  },
  laLiga: {
    fileId: 's31',
    type: 'league',
    cupSerial: '31',
    cupName: 'laLiga',
    chineseName: '西甲',
    crossYear: true,
    season: '2026-2027',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../laLiga'),
      squadFinal: path.resolve(__dirname, '../../laLiga/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../laLiga/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../laLiga/data/s31.js'),
    },
  },
  koreanKLeague: {
    fileId: 's15_313',
    type: 'league',
    cupSerial: '15',
    cupName: 'koreanKLeague',
    chineseName: '韩K联',
    crossYear: false,
    /** 子联赛 ID，与 titan007 arrSubLeague 中「联赛」阶段一致 */
    subLeagueId: '313',
    season: '2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../koreanKLeague'),
      squadFinal: path.resolve(__dirname, '../../koreanKLeague/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../koreanKLeague/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../koreanKLeague/data/s15.js'),
    },
  },
  ChinaSuperLeague: {
    fileId: 's60_2187',
    type: 'league',
    cupSerial: '60',
    cupName: 'ChinaSuperLeague',
    chineseName: '中超',
    // 中超使用自然年赛季；赛程文件按球探页面的子联赛编号定位。
    crossYear: false,
    subLeagueId: '2187',
    season: '2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../ChinaSuperLeague'),
      squadFinal: path.resolve(__dirname, '../../ChinaSuperLeague/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../ChinaSuperLeague/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../ChinaSuperLeague/data/s60_2187.js'),
    },
  },
  aLeague: {
    fileId: 's273_462',
    type: 'league',
    cupSerial: '273',
    cupName: 'aLeague',
    chineseName: '澳超',
    crossYear: true,
    /** 子联赛 ID，与 titan007 arrSubLeague 中「联赛」阶段一致 */
    subLeagueId: '462',
    /** 球探 URL 赛季段（勿与本地 25-26 目录混用） */
    season: '2025-2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../aLeague'),
      squadFinal: path.resolve(__dirname, '../../aLeague/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../aLeague/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../aLeague/data/s273.js'),
    },
  },
  mls: {
    fileId: 's21_165',
    type: 'league',
    cupSerial: '21',
    cupName: 'mls',
    chineseName: '美职联',
    crossYear: false,
    /** 子联赛 ID，与 titan007 arrSubLeague 中「常规赛」阶段一致 */
    subLeagueId: '165',
    /** titan007 matchResult 赛季目录，与 s21_165 一致 */
    season: '2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../mls'),
      squadFinal: path.resolve(__dirname, '../../mls/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../mls/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../mls/data/s21_165.js'),
    },
  },
  serieA: {
    fileId: 's34_2948',
    type: 'league',
    cupSerial: '34',
    cupName: 'serieA',
    chineseName: '意甲',
    crossYear: true,
    /** 子联赛 ID，与 titan007 arrSubLeague 中联赛阶段一致 */
    subLeagueId: '2948',
    /** 球探 URL 赛季段（与 s34_2948 一致；勿与本地 25-26 目录混用） */
    season: '2025-2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../serieA'),
      squadFinal: path.resolve(__dirname, '../../serieA/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../serieA/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../serieA/data/s34.js'),
    },
  },
  ligaMx: {
    fileId: 's140_44',
    type: 'league',
    cupSerial: '140',
    cupName: 'ligaMx',
    chineseName: '墨西联',
    crossYear: true,
    subLeagueId: '44',
    /** 赛程爬虫 Referer 使用 /cn/SubLeague/...（与球探该联赛展示页一致） */
    useSubLeagueReferer: true,
    season: '2025-2026',
    paths: {
      cupAnalyzer: path.resolve(__dirname, '../../ligaMx'),
      squadFinal: path.resolve(__dirname, '../../ligaMx/squad-final'),
      playerCenter: path.resolve(__dirname, '../output/player_center'),
      basicData: path.resolve(__dirname, '../../ligaMx/basicData'),
      cupScheduleData: path.resolve(__dirname, '../../ligaMx/data/s140_44.js'),
    },
  },
};

/** 球探联赛/杯赛序号 → 对应 cup-analyzer 赛程 JS 绝对路径（含子联赛文件名，如 s273_462.js） */
const schedulePathBySerial = {};
for (const cup of Object.values(cups)) {
  schedulePathBySerial[cup.cupSerial] = cup.paths.cupScheduleData;
}

const matchCenterDir = path.resolve(__dirname, '../match_center');

/**
 * 解析 clubMatchAnalyzer / squadTarget 使用的赛程文件路径
 * @param {string} leagueSerial 纯数字序号（无 s/c 前缀），与 squadTarget.leagueSerial 一致
 * @param {boolean} [isNation] 国家队赛事用 c 前缀
 * @returns {string} 优先使用 cups 中已配置的 cupScheduleData，否则回退 match_center/s{n}.js 或 c{n}.js
 */
function resolveScheduleData(leagueSerial, isNation) {
  if (schedulePathBySerial[leagueSerial]) {
    return schedulePathBySerial[leagueSerial];
  }
  const prefix = isNation ? 'c' : 's';
  return path.join(matchCenterDir, `${prefix}${leagueSerial}.js`);
}

const activeKey = process.env.CUP_ANALYZER_CUP || 'theWorldCup';
const active = cups[activeKey] || cups.theWorldCup;

const config = {
  port: 5001,
  activeCupKey: activeKey,
  cups,

  fileId: active.fileId,
  type: active.type,
  /** 国家队身份与杯赛格式分开；俱乐部杯赛仍使用俱乐部名单规则。 */
  isNation: active.isNation === true,
  flatSquad: active.flatSquad === true,
  crossYear: active.crossYear,
  chineseName: active.chineseName,

  cupSerial: active.cupSerial,
  cupName: active.cupName,
  season: active.season,
  /** 阵容球员匹配方式：true=姓名，false=球衣号 */
  lineupMatchByName: Boolean(active.lineupMatchByName),
  /** 联赛赛程爬虫用 SubLeague 页作 Referer（如墨西联） */
  useSubLeagueReferer: Boolean(active.useSubLeagueReferer),

  /** 序号 → 各模块 data/ 下赛程 JS，供 resolveScheduleData */
  schedulePathBySerial,
  resolveScheduleData,

  paths: {
    ...active.paths,
    /** @deprecated 请优先使用 cupScheduleData；保留为世界杯 c75 固定路径 */
    c75Data: cups.theWorldCup.paths.cupScheduleData,
    /** 国内联赛赛程 JS 兜底目录（未在 cups 中配置的序号）；scheduleCrawler 会同步写入；见 match_center/README.md */
    matchCenterDir,
  },

  crawlDelayMs: 3000,
};

module.exports = config;
