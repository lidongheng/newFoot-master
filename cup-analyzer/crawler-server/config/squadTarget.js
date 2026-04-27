/**
 * 俱乐部大名单 / 联赛或杯赛出场分析目标（原 backend-server/config/wudaconfig.js）
 *
 * 用法：
 *   node crawlers/playerListCrawler.js
 *   node analyzers/clubMatchAnalyzer.js
 *
 * - leagueSerial：球探「联赛」或「杯赛」序号 → resolveScheduleData 解析到各模块 data/ 下赛程 JS
 * - teamSerial：球探「俱乐部」序号 → 输出 player_center/{teamSerial}.json
 * - roundSerial：联赛渠道时填当前国内联赛轮次（仅分析该轮之前已完赛场次）；杯赛渠道可不填
 */
const squadTarget = {
  leagueSerial: '36',
  leagueSlug: 'epl',
  season: '25-26',
  teamSerial: '28',
  roundSerial: '34',
  /**
   * 赛程格式开关：
   *   false（默认）= 联赛格式，读 s 开头文件，R_* 轮次迭代
   *   true         = 杯赛格式，读 c 开头文件，G* 分组/阶段迭代
   *
   * 四个俱乐部杯赛（欧冠/欧罗巴/欧会杯/亚冠联2）使用本赛事数据时设 true，
   * 同时须设 matchByName: false；世界杯赛中同样设 true，matchByName 不设即可。
   */
  isNation: false,
  /**
   * 球员匹配方式（可选，不设则跟随 isNation）：
   *   false = 按球衣号码匹配（俱乐部 / 俱乐部杯赛）
   *   true  = 按全名匹配（国家队杯赛，如世界杯）
   *
   * 使用规则：
   *   isNation: false → 不用设（自动 false）
   *   isNation: true + 俱乐部杯赛 → 必须显式设 matchByName: false
   *   isNation: true + 国家队杯赛 → 不用设（自动 true）
   */
  matchByName: false,
  teamChineseName: '纽卡斯尔联',
  /** 单场分析 / 周期报告等场景可选 */
  matchSerial: '2789467',
  /**
   * 周期报告「同赛事」筛选：与球探战绩表「联赛」列文案一致（如 英超、欧冠杯）。
   * 不填则回退为当前 CUP_ANALYZER_CUP 对应 chineseName。
   */
  matchLeagueName: '英超',
};

module.exports = squadTarget;
